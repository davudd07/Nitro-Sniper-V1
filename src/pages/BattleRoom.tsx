import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Navigate, Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, Sparkles, Shuffle, Coins, Swords, Flag, Link2, Handshake, Banknote, Eye, Circle, Dices } from "lucide-react";
import { clsx } from "clsx";
import { useBattleStore, type BattleReplay, type BattleRosterSeat } from "../store/battleStore";
import { BATTLE_MODES, TEAM_COLORS, totalPlayers } from "../data/battleModes";
import { getCase, rollCaseItem, type CaseOddsEntry } from "../data/cases";
import { CASES } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { CasePreviewModal } from "../components/cases/CasePreviewModal";
import { JoinBattleModal } from "../components/battles/JoinBattleModal";
import { BATTLE_REEL_HEIGHT, battleReelSize, CaseReel, type BattleReelSize } from "../components/cases/CaseReel";
import { PlayerAvatar } from "../components/identity/PlayerAvatar";
import { RoleBadge } from "../components/identity/RoleBadge";
import { useIdentityStore } from "../store/identityStore";
import { ItemCard } from "../components/ui/ItemCard";
import { AnimatedPot } from "../components/ui/AnimatedPot";
import { BATTLE_JACKPOT_SPIN_MS, JackpotWheel, type JackpotTicket } from "../components/battles/JackpotWheel";
import { useFairnessStore } from "../store/fairnessStore";
import { useEconomyStore } from "../store/economyStore";
import { considerBattleLeaders } from "../store/winLeaderStore";
import { useToastStore } from "../store/toastStore";
import { randomBotName } from "../data/botNames";
import { buildBattleRoster, communityPaidOpenCredits } from "../lib/battleSeats";
import { BattleCost } from "../components/battles/BattleCost";
import { BattleResultOverlay, type BattlePayout } from "../components/battles/BattleResultOverlay";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { creatorCreateCost, fundedSeatCost, humanSeatPaidFraction, joinCost, pctLabel, winPayout } from "../lib/battleFinance";
import { HOUSE_EDGE } from "../lib/rakeback";
import { requireAccount, takeStakeFor, stakeNeedMessage } from "../lib/stake";
import { battlePlayCurrency, playCurrency, playCurrencyLabel, type PlayCurrency } from "../lib/playWallet";
import { sound } from "../lib/sound";
import { computeJackpotWeights } from "../lib/jackpotOdds";
import { coinflipTicketsFor, pickWeightedTicketIndex } from "../lib/battleCoinflip";
import { saveBattleDraft } from "../lib/battleDraft";
import { useCommunityCaseStore } from "../store/communityCaseStore";
import { noteOfficialCaseOpens } from "../store/caseStatsStore";
import { isMaxxxWin } from "../data/items";
import { shouldCelebrateMaxxxWin, useMaxxxWinStore, waitUntilMaxxxIdle } from "../store/maxxxWinStore";
import { WildcardReel } from "../components/battles/WildcardReel";
import { applyWildcard, formatWildcard, pickWildcard, wildcardMapFromUnknown, wildcardTone, type WildcardMulti } from "../lib/wildcard";
import { useGoldSpinStore } from "../store/goldSpinStore";

type BattlePlayer = BattleRosterSeat;

interface PlayerRoundState {
  total: number;
  history: { item: CaseOddsEntry["item"]; id: string }[];
}

function rebuildRoundStates(
  roster: BattlePlayer[],
  openings: Record<number, CaseOddsEntry | null>[],
): Record<number, PlayerRoundState> {
  const init: Record<number, PlayerRoundState> = {};
  roster.forEach((p) => {
    init[p.slotIndex] = { total: 0, history: [] };
  });
  openings.forEach((round, ri) => {
    roster.forEach((p) => {
      const entry = round[p.slotIndex];
      if (!entry) return;
      const cur = init[p.slotIndex]!;
      cur.total += entry.item.value;
      cur.history = [{ item: entry.item, id: `${p.slotIndex}-${ri}` }, ...cur.history];
    });
  });
  return init;
}

type Phase = "filling" | "countdown" | "running" | "wildcard" | "jackpot" | "finished";

export function BattleRoom() {
  const { battleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const battle = useBattleStore((s) => (battleId ? s.getBattle(battleId) : undefined));
  const ledger = battlePlayCurrency(battle);
  const joinIntent = useBattleStore((s) => (battleId ? s.joinIntents[battleId] : undefined));
  const setJoinIntent = useBattleStore((s) => s.setJoinIntent);
  const setBattleStatus = useBattleStore((s) => s.setBattleStatus);
  const patchBattle = useBattleStore((s) => s.patchBattle);
  const wantReplay = searchParams.get("replay") === "1";
  const spectating = Boolean(
    battle &&
      battle.source !== "you" &&
      !joinIntent &&
      (searchParams.get("spectate") === "1" || wantReplay || battle.status === "finished"),
  );
  const play = useFairnessStore((s) => s.play);
  const applyTipWager = useEconomyStore((s) => s.applyTipWager);
  const creditLedger = useEconomyStore((s) => s.creditLedger);
  const goldRev = useGoldSpinStore((s) => s.revision);
  void goldRev;
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);

  const mode = useMemo(() => (battle ? BATTLE_MODES.find((m) => m.id === battle.modeId) : undefined), [battle]);

  const rosterEpoch = `${battle?.id ?? ""}:${spectating ? 1 : 0}:${joinIntent?.seat ?? ""}:${wantReplay ? 1 : 0}`;

  const [players, setPlayers] = useState<BattlePlayer[]>(() =>
    battle && mode
      ? buildBattleRoster(battle, mode, { spectating, joinSeat: joinIntent?.seat, replaying: wantReplay })
      : [],
  );
  const teams = useMemo(() => {
    const groups: BattlePlayer[][] = [];
    players.forEach((p) => {
      groups[p.teamIndex] = groups[p.teamIndex] ? [...groups[p.teamIndex], p] : [p];
    });
    return groups;
  }, [players]);
  const layoutTeams = battle?.shared ? [players] : teams;
  const [phase, setPhase] = useState<Phase>(() =>
    battle?.status === "finished" && !wantReplay ? "finished" : "filling",
  );
  const [countdown, setCountdown] = useState(3);
  const [caseSequence, setCaseSequence] = useState<string[]>([]);
  const [caseIndex, setCaseIndex] = useState(-1);
  const [spinToken, setSpinToken] = useState(0);
  const [pendingResults, setPendingResults] = useState<Record<number, CaseOddsEntry | null>>({});
  const [roundStates, setRoundStates] = useState<Record<number, PlayerRoundState>>({});
  const [jackpotTickets, setJackpotTickets] = useState<JackpotTicket[] | null>(null);
  const [jackpotWinnerId, setJackpotWinnerId] = useState<string | null>(null);
  const [jackpotSpinToken, setJackpotSpinToken] = useState(0);
  const [winningTeam, setWinningTeam] = useState<number | null>(null);
  const [liveOdds, setLiveOdds] = useState<Record<number, number>>({});
  const [tieBreak, setTieBreak] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [payout, setPayout] = useState<BattlePayout | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [wildcardBySlot, setWildcardBySlot] = useState<Record<number, WildcardMulti>>({});
  const [wildcardTargets, setWildcardTargets] = useState<Record<number, WildcardMulti>>({});
  const [wildcardSpinToken, setWildcardSpinToken] = useState(0);
  const [borrowSeat, setBorrowSeat] = useState<number | null>(null);
  const borrowPct =
    battle?.source === "you"
      ? Math.max(joinIntent?.borrowPct ?? 0, battle.creatorBorrowPct)
      : (joinIntent?.borrowPct ?? 0);
  const needsJoinGate = Boolean(
    battle &&
      battle.source !== "you" &&
      !joinIntent &&
      !spectating &&
      battle.status !== "finished" &&
      !wantReplay,
  );

  function payAndJoin(seat: number, pct: number) {
    if (!battle) return false;
    if (!requireAccount()) return false;
    const ledger = battlePlayCurrency(battle);
    if (ledger !== playCurrency()) {
      push(`Switch to ${playCurrencyLabel(ledger)} to join. Shards and World Locks don’t mix.`, "warning");
      return false;
    }
    const cost = joinCost(battle.costPerPlayer, battle.fundedPct, battle.fundedPct > 0 ? 0 : pct);
    if (!takeStakeFor(cost, HOUSE_EDGE.battles, ledger)) {
      push(stakeNeedMessage(cost, ledger), "danger");
      return false;
    }
    if (cost > 0 && ledger === "wl") applyTipWager(cost);
    setJoinIntent(battle.id, { borrowPct: battle.fundedPct > 0 ? 0 : pct, seat });
    navigate(`/battles/${battle.id}`, { replace: true });
    return true;
  }

  function youStakeAmount() {
    if (!battle || !mode) return 0;
    if (battle.source === "you") {
      return creatorCreateCost(battle.costPerPlayer, totalPlayers(mode), battle.fundedPct, borrowPct);
    }
    return joinCost(battle.costPerPlayer, battle.fundedPct, borrowPct);
  }

  const landedCountRef = useRef(0);
  const startedRef = useRef(false);
  const resolvedRef = useRef(false);
  const roundStatesRef = useRef<Record<number, PlayerRoundState>>({});
  const replayLogRef = useRef<Record<number, CaseOddsEntry | null>[]>([]);
  const replayJackpotRef = useRef<{ tickets: JackpotTicket[]; winnerId: string; tieBreak: boolean } | null>(null);
  const replayWildcardRef = useRef<Record<number, WildcardMulti>>({});
  const wildcardRef = useRef<Record<number, WildcardMulti>>({});
  const wildcardDoneRef = useRef(false);
  const wildcardLandedRef = useRef<Set<number>>(new Set());
  const isReplayRef = useRef(Boolean(wantReplay || battle?.replay));
  const rosterEpochRef = useRef<string>("");
  const lastPayoutRef = useRef<BattlePayout | null>(null);
  const paidOutRef = useRef(false);
  const hydratedFinishedRef = useRef("");

  function teamFromJackpotWinner(winnerId: string | null | undefined): number | null {
    if (!winnerId) return null;
    if (winnerId.startsWith("team-")) {
      const n = Number(winnerId.slice(5));
      return Number.isFinite(n) ? n : null;
    }
    return players.find((p) => String(p.slotIndex) === winnerId)?.teamIndex ?? null;
  }

  function showResult(next: BattlePayout) {
    const you = players.find((p) => p.kind === "you");
    const wildcardMulti =
      next.wildcardMulti !== undefined
        ? next.wildcardMulti
        : battle?.wildcard && you
          ? (wildcardRef.current[you.slotIndex] ?? null)
          : null;
    const payload = { ...next, wildcardMulti };
    lastPayoutRef.current = payload;
    setPayout(payload);
    setResultOpen(true);
  }

  function freezeRoster(list: BattlePlayer[]) {
    if (!battleId) return;
    const bots = list.filter((p) => p.kind === "bot").map((p) => p.slotIndex);
    patchBattle(battleId, {
      botSeats: bots,
      prefillBots: bots.length,
      roster: list.map(({ slotIndex, teamIndex, kind, name, color }) => ({
        slotIndex,
        teamIndex,
        kind,
        name,
        color,
      })),
    });
  }

  function persistReplay(jackpot = replayJackpotRef.current) {
    if (!battleId) return;
    const snapshot: BattleReplay = {
      seats: players
        .filter((p) => p.kind !== "empty" && p.kind !== "joining")
        .map(({ slotIndex, teamIndex, kind, name, color }) => ({ slotIndex, teamIndex, kind, name, color })),
      openings: replayLogRef.current,
      jackpot,
      wildcard: Object.keys(replayWildcardRef.current).length ? replayWildcardRef.current : null,
    };
    patchBattle(battleId, { replay: snapshot, roster: snapshot.seats });
  }

  useEffect(() => {
    if (!mode || !battle) return;
    if (rosterEpochRef.current === rosterEpoch) return;
    rosterEpochRef.current = rosterEpoch;
    lastPayoutRef.current = null;
    const roster = buildBattleRoster(battle, mode, {
      spectating,
      joinSeat: joinIntent?.seat,
      replaying: wantReplay,
    });
    setPlayers(roster);
    const init: Record<number, PlayerRoundState> = {};
    const evenOdds: Record<number, number> = {};
    roster.forEach((p) => {
      init[p.slotIndex] = { total: 0, history: [] };
      evenOdds[p.slotIndex] = roster.length > 0 ? 100 / roster.length : 0;
    });
    setRoundStates(init);
    roundStatesRef.current = init;
    const teamIds = new Set(roster.map((p) => p.teamIndex));
    const teamPct = teamIds.size > 0 ? 100 / teamIds.size : 0;
    const teamOdds: Record<number, number> = {};
    roster.forEach((p) => {
      teamOdds[p.slotIndex] = teamPct;
    });
    setLiveOdds(
      battle.coinflip ? teamOdds : battle.jackpot && !battle.terminal ? evenOdds : {},
    );
    setPhase(battle.status === "finished" && !wantReplay ? "finished" : "filling");
    startedRef.current = false;
    resolvedRef.current = false;
    paidOutRef.current = false;
    isReplayRef.current = Boolean(wantReplay || (battle.status === "finished" && battle.replay));
    replayLogRef.current = battle.replay?.openings ?? [];
    replayJackpotRef.current = battle.replay?.jackpot ?? null;
    replayWildcardRef.current = wildcardMapFromUnknown(battle.replay?.wildcard);
    wildcardRef.current = replayWildcardRef.current;
    setWildcardBySlot(replayWildcardRef.current);
    setWildcardTargets({});
    setWildcardSpinToken(0);
    wildcardDoneRef.current = false;
    wildcardLandedRef.current = new Set();
    setResultOpen(false);
    setPayout(null);
    hydratedFinishedRef.current = "";
    setPendingResults({});
    setCaseIndex(-1);
    setJackpotTickets(null);
    setJackpotWinnerId(null);
    setWinningTeam(null);
    setTieBreak(false);
    // Terminal + jackpot: odds don't exist until the LAST case lands.
  }, [rosterEpoch, battle, mode, spectating, joinIntent?.seat, wantReplay]);

  useEffect(() => {
    if (!battle) return;
    const seq: string[] = [];
    battle.cases.forEach((e) => {
      for (let i = 0; i < e.count; i++) seq.push(e.caseId);
    });
    setCaseSequence(seq);
  }, [battle]);

  const allFilled = players.length > 0 && players.every((p) => p.kind !== "empty" && p.kind !== "joining");

  useEffect(() => {
    if (!allFilled || phase !== "filling" || startedRef.current || needsJoinGate) return;
    if (battle?.status === "finished" && !wantReplay) {
      setPhase("finished");
      return;
    }
    startedRef.current = true;
    if (wantReplay || battle?.status === "finished") {
      isReplayRef.current = true;
    } else {
      freezeRoster(players);
    }
    setPhase("countdown");
  }, [allFilled, phase, needsJoinGate, battle?.status, wantReplay, players]);

  useEffect(() => {
    if (!battle || !mode) return;
    if (battle.status !== "finished" || wantReplay) return;
    if (players.length === 0) return;
    if (hydratedFinishedRef.current === battle.id) return;
    hydratedFinishedRef.current = battle.id;

    const openings = battle.replay?.openings ?? replayLogRef.current;
    const states = rebuildRoundStates(players, openings);
    setRoundStates(states);
    roundStatesRef.current = states;
    const nCases = openings.length || battle.cases.reduce((s, e) => s + e.count, 0);
    setCaseIndex(Math.max(0, nCases - 1));
    setPhase("finished");

    const pot = players.reduce((s, p) => s + (states[p.slotIndex]?.total ?? 0), 0);
    const jp = battle.replay?.jackpot ?? replayJackpotRef.current;
    if (jp) {
      setJackpotTickets(jp.tickets);
      setJackpotWinnerId(jp.winnerId);
      setTieBreak(jp.tieBreak);
      const team = teamFromJackpotWinner(jp.winnerId);
      if (team !== null) {
        setWinningTeam(team);
        settlePayout(team, pot, false);
        return;
      }
    }
    if (battle.shared) {
      const n = Math.max(1, players.length);
      const share = pot / n;
      const youPlayed = players.some((p) => p.kind === "you");
      const paid = youPlayed ? winPayout(share, borrowPct) : 0;
      showResult({
        shared: true,
        youWon: youPlayed,
        pot,
        share,
        youPaid: paid,
        borrowPct,
        winningTeam: null,
        winners: players.map((p) => ({
          name: p.kind === "you" ? "You" : p.name || `Player ${p.slotIndex + 1}`,
          color: p.color,
        })),
      });
      return;
    }
    const decisionValue = (slotIndex: number) => {
      const state = states[slotIndex];
      if (!state) return 0;
      const raw = battle.terminal ? (state.history[0]?.item.value ?? 0) : state.total;
      return applyWildcard(raw, wildcardRef.current[slotIndex]);
    };
    const teamTotals = mode.teamSizes.map((_, teamIdx) =>
      players.filter((p) => p.teamIndex === teamIdx).reduce((s, p) => s + decisionValue(p.slotIndex), 0),
    );
    if (teamTotals.length === 0) return;
    const best = battle.crazy ? Math.min(...teamTotals) : Math.max(...teamTotals);
    const tied = teamTotals.reduce<number[]>((acc, v, i) => (v === best ? [...acc, i] : acc), []);
    const winnerTeam = tied[0] ?? 0;
    setWinningTeam(winnerTeam);
    settlePayout(winnerTeam, pot, false);
  }, [battle, mode, players, wantReplay, borrowPct]);

  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    sound.countdownBeep();
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          sound.countdownBeep(true);
          sound.battleStart();
          if (battleId && !isReplayRef.current) setBattleStatus(battleId, "active");
          setPhase("running");
          setCaseIndex(0);
          return 0;
        }
        sound.countdownBeep();
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, battleId, setBattleStatus]);

  const runRound = useCallback(
    async (idx: number) => {
      const caseId = caseSequence[idx];
      const c = getCase(caseId);
      if (!c) return;
      let results: Record<number, CaseOddsEntry | null> = {};
      const stored = isReplayRef.current ? replayLogRef.current[idx] : undefined;
      if (stored) {
        results = stored;
      } else {
        const rolls = await play(players.length);
        players.forEach((p, i) => {
          results[p.slotIndex] = rollCaseItem(c, rolls[i]);
        });
        if (!isReplayRef.current && !spectating && (battle?.costPerPlayer ?? 0) > 0) {
          const paidOpens = communityPaidOpenCredits(players, (seat) =>
            humanSeatPaidFraction(
              { kind: seat.kind, slotIndex: seat.slotIndex ?? 0 },
              {
                fundedPct: battle?.fundedPct ?? 0,
                creatorSeat: battle?.creatorSeat ?? 0,
                creatorBorrowPct: battle?.creatorBorrowPct ?? 0,
                joinerBorrowPct: borrowPct,
              },
            ),
          );
          if (paidOpens > 0) {
            if (c.community) useCommunityCaseStore.getState().accrue(caseId, paidOpens);
            else noteOfficialCaseOpens(caseId, paidOpens);
          }
        }
        const log = replayLogRef.current.slice();
        log[idx] = results;
        replayLogRef.current = log;
      }
      landedCountRef.current = 0;
      setPendingResults(results);
      setSpinToken((t) => t + 1);
    },
    [caseSequence, play, players, battle, borrowPct, spectating],
  );

  useEffect(() => {
    if (phase === "running" && caseIndex >= 0 && caseIndex < caseSequence.length) {
      void runRound(caseIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, caseIndex, caseSequence.length]);

  function handleLanded(slotIndex: number, item: CaseOddsEntry["item"]) {
    if (isMaxxxWin(item)) {
      const you = players.find((p) => p.kind === "you");
      const hitter = players.find((p) => p.slotIndex === slotIndex);
      if (
        shouldCelebrateMaxxxWin({
          yourTeamIndex: you?.teamIndex,
          hitterTeamIndex: hitter?.teamIndex,
        })
      ) {
        useMaxxxWinStore.getState().fire();
      }
    }
    setRoundStates((prev) => {
      const cur = prev[slotIndex] ?? { total: 0, history: [] };
      const next = {
        ...prev,
        [slotIndex]: {
          total: cur.total + item.value,
          history: [{ item, id: `${slotIndex}-${Date.now()}-${Math.random()}` }, ...cur.history].slice(0, 30),
        },
      };
      roundStatesRef.current = next;
      return next;
    });
    landedCountRef.current += 1;
    if (landedCountRef.current >= players.length) {
      // Recompute live jackpot odds once every player has landed this round,
      // so the % shown next to each name always reflects the latest pulls.
      if (battle?.jackpot) {
        const isLastCase = caseIndex + 1 >= caseSequence.length;
        // Terminal Mode: last-case value is the only thing that matters, so
        // don't flash misleading mid-battle jackpot % until that case lands.
        if (!battle.terminal || isLastCase) {
          setTimeout(() => {
            const entries = players.map((p) => {
              const state = roundStatesRef.current[p.slotIndex];
              const value = battle.terminal ? (state?.history[0]?.item.value ?? 0) : (state?.total ?? 0);
              return { key: String(p.slotIndex), value };
            });
            const weights = computeJackpotWeights(entries, battle.crazy);
            const next: Record<number, number> = {};
            players.forEach((p, i) => (next[p.slotIndex] = weights[i] * 100));
            setLiveOdds(next);
          }, 350);
        }
      }
      setTimeout(() => {
        void (async () => {
          await waitUntilMaxxxIdle();
          if (caseIndex + 1 < caseSequence.length) {
            setCaseIndex((i) => i + 1);
          } else {
            finishBattle();
          }
        })();
      }, battle?.fastSpin ? 280 : 650);
    }
  }

  function finishBattle() {
    if (battle?.wildcard && !wildcardDoneRef.current) {
      beginWildcard();
      return;
    }
    if (isReplayRef.current) {
      const jp = replayJackpotRef.current;
      if (jp) {
        const team = teamFromJackpotWinner(jp.winnerId);
        setTieBreak(jp.tieBreak);
        setJackpotTickets(jp.tickets);
        setJackpotWinnerId(jp.winnerId);
        if (team !== null) setWinningTeam(team);
        setPhase("jackpot");
        setJackpotSpinToken((t) => t + 1);
        return;
      }
      if (battle?.coinflip) {
        resolveCoinflip();
        return;
      }
      // Seeded / unfinished snapshot: resolve visually from the openings we just replayed, no payout.
      resolveOutcome(roundStatesRef.current, { payout: false });
      return;
    }
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (battle?.coinflip) {
      resolveCoinflip();
      return;
    }
    resolveOutcome(roundStatesRef.current, { payout: true });
  }

  function beginWildcard() {
    const seated = players.filter((p) => p.kind !== "empty" && p.kind !== "joining");
    const stored = wildcardMapFromUnknown(replayWildcardRef.current);
    wildcardLandedRef.current = new Set();
    const apply = (next: Record<number, WildcardMulti>) => {
      replayWildcardRef.current = next;
      wildcardRef.current = next;
      setWildcardTargets(next);
      setWildcardBySlot({});
      persistReplay();
      setPhase("wildcard");
      setWildcardSpinToken((t) => t + 1);
    };
    const storedComplete =
      seated.length > 0 && seated.every((p) => stored[p.slotIndex] !== undefined);
    if (storedComplete) {
      apply(stored);
      return;
    }
    void play(Math.max(1, seated.length)).then((rolls) => {
      const next: Record<number, WildcardMulti> = {};
      seated.forEach((p, i) => {
        next[p.slotIndex] = pickWildcard(rolls[i] ?? 0);
      });
      apply(next);
    });
  }

  function handleWildcardLanded(slotIndex: number) {
    const seat = players.find((p) => p.slotIndex === slotIndex);
    if (!seat || seat.kind === "empty" || seat.kind === "joining") return;
    const multi = wildcardRef.current[slotIndex];
    if (multi !== undefined) {
      setWildcardBySlot((prev) => (prev[slotIndex] === multi ? prev : { ...prev, [slotIndex]: multi }));
    }
    if (wildcardLandedRef.current.has(slotIndex)) return;
    wildcardLandedRef.current.add(slotIndex);
    const need = players.filter((p) => p.kind !== "empty" && p.kind !== "joining").length;
    if (wildcardLandedRef.current.size < need) return;
    window.setTimeout(() => continueAfterWildcard(), battle?.fastSpin ? 900 : 1400);
  }

  function continueAfterWildcard() {
    if (wildcardDoneRef.current) return;
    wildcardDoneRef.current = true;
    if (battle?.jackpot) {
      const entries = players.map((p) => {
        const state = roundStatesRef.current[p.slotIndex];
        const raw = battle.terminal ? (state?.history[0]?.item.value ?? 0) : (state?.total ?? 0);
        return { key: String(p.slotIndex), value: applyWildcard(raw, wildcardRef.current[p.slotIndex]) };
      });
      const weights = computeJackpotWeights(entries, battle.crazy);
      const next: Record<number, number> = {};
      players.forEach((p, i) => {
        next[p.slotIndex] = weights[i] * 100;
      });
      setLiveOdds(next);
    }
    finishBattle();
  }

  function battlePayoutPot() {
    if (!battle) return 0;
    return Object.values(roundStatesRef.current).reduce((s, r) => s + r.total, 0);
  }

  function resolveCoinflip() {
    if (!battle || !mode) return;
    const stored = replayJackpotRef.current;
    if (stored?.tickets.length && stored.winnerId) {
      const team =
        teamFromJackpotWinner(stored.winnerId) ??
        players.find((p) => String(p.slotIndex) === stored.winnerId)?.teamIndex ??
        0;
      setTieBreak(false);
      setJackpotTickets(stored.tickets);
      setJackpotWinnerId(stored.winnerId);
      setWinningTeam(team);
      persistReplay(stored);
      setPhase("jackpot");
      setJackpotSpinToken((t) => t + 1);
      return;
    }
    const tickets = coinflipTicketsFor(players);
    if (tickets.length === 0) {
      setPhase("finished");
      return;
    }
    void play(1).then(([roll]) => {
      const winnerIdx = pickWeightedTicketIndex(tickets, roll);
      const winnerId = tickets[winnerIdx].playerId;
      const team =
        teamFromJackpotWinner(winnerId) ??
        players.find((p) => String(p.slotIndex) === winnerId)?.teamIndex ??
        0;
      const jp = {
        tickets,
        winnerId,
        tieBreak: false,
      };
      setTieBreak(false);
      setJackpotTickets(tickets);
      setJackpotWinnerId(winnerId);
      setWinningTeam(team);
      replayJackpotRef.current = jp;
      persistReplay(jp);
      setPhase("jackpot");
      setJackpotSpinToken((t) => t + 1);
    });
  }

  function resolveOutcome(finalStates: Record<number, PlayerRoundState>, opts: { payout: boolean }) {
    if (!battle || !mode) return;
    const settle = opts.payout;
    // The pot paid out is always the full cumulative total pulled — Terminal
    // Mode only changes which value decides the WINNER, not how much is won.
    const potTotals = players.map((p) => ({ p, value: finalStates[p.slotIndex]?.total ?? 0 }));
    const pot = potTotals.reduce((s, t) => s + t.value, 0);

    const decisionValue = (slotIndex: number) => {
      const state = finalStates[slotIndex];
      if (!state) return 0;
      const raw = battle.terminal ? (state.history[0]?.item.value ?? 0) : state.total;
      return applyWildcard(raw, wildcardRef.current[slotIndex]);
    };
    const totals = players.map((p) => ({ p, value: decisionValue(p.slotIndex) }));

    if (battle.shared) {
      const n = Math.max(1, players.length);
      const share = pot / n;
      const youPlayed = players.some((p) => p.kind === "you");
      const paid = youPlayed ? winPayout(share, borrowPct) : 0;
      if (settle && youPlayed && share > 0) {
        creditLedger(paid, battlePlayCurrency(battle));
        sound.win("big");
      }
      if (settle && youPlayed) recordRound(youStakeAmount(), paid, "battles", battlePlayCurrency(battle));
      if (settle && battle.id) {
        considerBattleLeaders({
          battleId: battle.id,
          costPerPlayer: battle.costPerPlayer,
          winners: players.map((p) => ({
            name: p.kind === "you" ? "You" : p.name || `Player ${p.slotIndex + 1}`,
            kind: p.kind,
            share,
          })),
        });
      }
      showResult({
        shared: true,
        youWon: youPlayed,
        pot,
        share,
        youPaid: paid,
        borrowPct,
        winningTeam: null,
        winners: players.map((p) => ({
          name: p.kind === "you" ? "You" : p.name || `Player ${p.slotIndex + 1}`,
          color: p.color,
        })),
      });
      setPhase("finished");
      persistReplay(null);
      if (settle && battle.id) setBattleStatus(battle.id, "finished", pot);
      return;
    }

    if (battle.jackpot) {
      const weights = computeJackpotWeights(
        totals.map((t) => ({ key: String(t.p.slotIndex), value: t.value })),
        battle.crazy,
      );
      const tickets: JackpotTicket[] = totals.map((t, i) => ({
        playerId: String(t.p.slotIndex),
        name: t.p.kind === "you" ? "You" : t.p.name,
        color: t.p.color,
        weight: weights[i],
      }));

      void play(1).then(([roll]) => {
        let acc = 0;
        let winnerIdx = tickets.length - 1;
        for (let i = 0; i < tickets.length; i++) {
          acc += tickets[i].weight;
          if (roll < acc) {
            winnerIdx = i;
            break;
          }
        }
        const jp = {
          tickets,
          winnerId: tickets[winnerIdx].playerId,
          tieBreak: false,
        };
        setJackpotTickets(tickets);
        setJackpotWinnerId(tickets[winnerIdx].playerId);
        setWinningTeam(totals[winnerIdx].p.teamIndex);
        replayJackpotRef.current = jp;
        persistReplay(jp);
        setPhase("jackpot");
        setJackpotSpinToken((t) => t + 1);
      });
    } else {
      const teamTotals = mode.teamSizes.map((_, teamIdx) =>
        totals.filter((t) => t.p.teamIndex === teamIdx).reduce((s, t) => s + t.value, 0),
      );
      const best = battle.crazy ? Math.min(...teamTotals) : Math.max(...teamTotals);
      const tiedTeams = teamTotals.reduce<number[]>((acc, v, i) => (v === best ? [...acc, i] : acc), []);

      if (tiedTeams.length > 1) {
        // Tie between two or more teams/players — settle it with an
        // equal-odds tie-breaker jackpot spin among just the tied parties.
        const tickets: JackpotTicket[] = tiedTeams.map((teamIdx) => {
          const teamPlayers = players.filter((p) => p.teamIndex === teamIdx);
          const label = teamPlayers.length > 1 ? `Team ${teamIdx + 1}` : teamPlayers[0]?.kind === "you" ? "You" : teamPlayers[0]?.name || `Team ${teamIdx + 1}`;
          return {
            playerId: `team-${teamIdx}`,
            name: label,
            color: teamPlayers[0]?.color ?? TEAM_COLORS[teamIdx % TEAM_COLORS.length],
            weight: 1 / tiedTeams.length,
          };
        });

        void play(1).then(([roll]) => {
          let acc = 0;
          let winnerIdx = tickets.length - 1;
          for (let i = 0; i < tickets.length; i++) {
            acc += tickets[i].weight;
            if (roll < acc) {
              winnerIdx = i;
              break;
            }
          }
          const jp = {
            tickets,
            winnerId: tickets[winnerIdx].playerId,
            tieBreak: true,
          };
          setTieBreak(true);
          setJackpotTickets(tickets);
          setJackpotWinnerId(tickets[winnerIdx].playerId);
          setWinningTeam(tiedTeams[winnerIdx]);
          replayJackpotRef.current = jp;
          persistReplay(jp);
          setPhase("jackpot");
          setJackpotSpinToken((t) => t + 1);
        });
      } else {
        const winnerTeam = tiedTeams[0];
        setWinningTeam(winnerTeam);
        settlePayout(winnerTeam, pot, settle);
        persistReplay(null);
        setPhase("finished");
        if (settle) setBattleStatus(battle.id, "finished", pot);
      }
    }
  }

  function settlePayout(winnerTeam: number, pot: number, settle = true) {
    const teamMembers = players.filter((p) => p.teamIndex === winnerTeam);
    const share = pot / Math.max(1, teamMembers.length);
    const youWon = teamMembers.some((p) => p.kind === "you");
    const paid = youWon ? winPayout(share, borrowPct) : 0;
    if (settle && youWon && share > 0) {
      creditLedger(paid, battlePlayCurrency(battle));
      sound.win("big");
    } else if (settle) {
      sound.lose();
    }
    if (settle && players.some((p) => p.kind === "you")) recordRound(youStakeAmount(), paid, "battles", battlePlayCurrency(battle));
    if (settle && battle?.id) {
      considerBattleLeaders({
        battleId: battle.id,
        costPerPlayer: battle.costPerPlayer,
        winners: teamMembers.map((p) => ({
          name: p.kind === "you" ? "You" : p.name || `Player ${p.slotIndex + 1}`,
          kind: p.kind,
          share,
        })),
      });
    }
    showResult({
      shared: false,
      youWon,
      pot,
      share,
      youPaid: paid,
      borrowPct: youWon ? borrowPct : 0,
      winningTeam: winnerTeam,
      winners: teamMembers.map((p) => ({
        name: p.kind === "you" ? "You" : p.name || `Player ${p.slotIndex + 1}`,
        color: p.color,
      })),
    });
  }

  function handleJackpotFinished() {
    const settle = !isReplayRef.current && !paidOutRef.current;
    if (settle) paidOutRef.current = true;
    const pot = battlePayoutPot();
    const winnerId = replayJackpotRef.current?.winnerId ?? jackpotWinnerId;
    const team = winningTeam ?? teamFromJackpotWinner(winnerId);
    persistReplay(replayJackpotRef.current);
    if (team !== null) {
      settlePayout(team, pot, settle);
    } else if (lastPayoutRef.current) {
      showResult(lastPayoutRef.current);
    } else {
      showResult({
        shared: Boolean(battle?.shared),
        youWon: false,
        pot,
        share: pot,
        youPaid: 0,
        borrowPct: 0,
        winningTeam: null,
        winners: players
          .filter((p) => p.kind !== "empty" && p.kind !== "joining")
          .map((p) => ({
            name: p.kind === "you" ? "You" : p.name || `Player ${p.slotIndex + 1}`,
            color: p.color,
          })),
      });
    }
    setPhase("finished");
    if (settle && battle?.id) setBattleStatus(battle.id, "finished", pot);
  }

  function recreateBattle() {
    if (!battle) return;
    saveBattleDraft({
      modeId: battle.modeId,
      crazy: battle.crazy,
      jackpot: battle.jackpot,
      goldSpin: battle.goldSpin,
      terminal: battle.terminal,
      shared: battle.shared,
      coinflip: battle.coinflip,
      wildcard: battle.wildcard,
      fastSpin: battle.fastSpin,
      cases: battle.cases,
      fundedPct: battle.fundedPct,
      isPrivate: battle.isPrivate,
      creatorBorrowPct: battle.creatorBorrowPct,
      creatorSeat: battle.creatorSeat,
      botSeats: battle.botSeats,
      prefillBots: battle.prefillBots,
    });
    navigate("/battles/create");
  }

  function replayBattle() {
    const init: Record<number, PlayerRoundState> = {};
    const evenOdds: Record<number, number> = {};
    players.forEach((p) => {
      init[p.slotIndex] = { total: 0, history: [] };
      evenOdds[p.slotIndex] = players.length > 0 ? 100 / players.length : 0;
    });
    isReplayRef.current = true;
    startedRef.current = true;
    resolvedRef.current = false;
    setResultOpen(false);
    setPayout(null);
    setRoundStates(init);
    roundStatesRef.current = init;
    const teamIds = new Set(players.map((p) => p.teamIndex));
    const teamPct = teamIds.size > 0 ? 100 / teamIds.size : 0;
    const teamOdds: Record<number, number> = {};
    players.forEach((p) => {
      teamOdds[p.slotIndex] = teamPct;
    });
    setLiveOdds(
      battle?.coinflip ? teamOdds : battle?.jackpot && !battle.terminal ? evenOdds : {},
    );
    setPendingResults({});
    setCaseIndex(-1);
    setSpinToken(0);
    setJackpotTickets(null);
    setJackpotWinnerId(null);
    setWinningTeam(null);
    setTieBreak(false);
    setWildcardBySlot({});
    setWildcardTargets({});
    wildcardRef.current = {};
    wildcardDoneRef.current = false;
    wildcardLandedRef.current = new Set();
    setWildcardSpinToken(0);
    replayWildcardRef.current = wildcardMapFromUnknown(battle?.replay?.wildcard);
    setPhase("countdown");
  }

  function callBot(slotIndex: number) {
    if (!battle) return;
    if ((battle.fundedPct ?? 0) >= 1 || battle.eventKind === "funded") return;
    const usedNames = new Set(players.filter((p) => p.name).map((p) => p.name));
    const next = players.map((p) =>
      p.slotIndex === slotIndex ? { ...p, kind: "bot" as const, name: randomBotName(usedNames) } : p,
    );
    setPlayers(next);
    freezeRoster(next);
  }

  if (!battleId || !battle || !mode) return <Navigate to="/battles" replace />;

  const currentCaseId = caseIndex >= 0 ? caseSequence[caseIndex] : undefined;
  const currentCase = currentCaseId ? getCase(currentCaseId) : undefined;
  const headerCasePos =
    caseSequence.length === 0
      ? 0
      : phase === "jackpot" || phase === "finished" || phase === "wildcard"
        ? caseSequence.length
        : Math.min(caseSequence.length, Math.max(1, caseIndex + 1));
  const headerCase = caseSequence.length > 0 ? getCase(caseSequence[headerCasePos - 1]) : undefined;
  const pot = Object.values(roundStates).reduce((s, r) => s + r.total, 0);
  const showJackpotPot = Boolean(battle.jackpot || battle.coinflip || phase === "jackpot");
  const reelSize = battleReelSize(players.length);
  const crowded = players.length >= 6;
  const denseVs = teams.length >= 4;
  const laneMin = players.length >= 7 ? "5.5rem" : undefined;

  return (
    <div className="space-y-6">
      <Link to="/battles" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to battles
      </Link>

      <div className="surface w-full min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Swords className="h-5 w-5 text-amber-300" />
            <span className="text-lg font-bold text-white">{mode.label} Battle</span>
            {battle.coinflip && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-400/15 px-2 py-0.5 text-xs font-medium text-indigo-200">
                <Circle className="h-3 w-3" /> Coinflip
              </span>
            )}
            {battle.crazy && (
              <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-300">
                <Shuffle className="h-3 w-3" /> Crazy
              </span>
            )}
            {battle.jackpot && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                <Coins className="h-3 w-3" /> Jackpot
              </span>
            )}
            {battle.terminal && (
              <span className="flex items-center gap-1 rounded-full bg-pink-500/15 px-2 py-0.5 text-xs font-medium text-pink-300">
                <Flag className="h-3 w-3" /> Terminal
              </span>
            )}
            {battle.goldSpin && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-300">
                <Sparkles className="h-3 w-3" /> Gold Spin
              </span>
            )}
            {battle.wildcard && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                <Dices className="h-3 w-3" /> Wildcard
              </span>
            )}
            {battle.shared && (
              <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                Shared
              </span>
            )}
            {battle.fastSpin && (
              <span className="flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-300">
                Fast
              </span>
            )}
            {battle.fundedPct > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                <Banknote className="h-3 w-3" /> {pctLabel(battle.fundedPct)} funded
              </span>
            )}
            {borrowPct > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                <Handshake className="h-3 w-3" /> Borrowed {pctLabel(borrowPct)}
              </span>
            )}
            {battle.isPrivate && (
              <span className="flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-xs font-medium text-fuchsia-300">
                Private
              </span>
            )}
            {spectating && (
              <span className="flex items-center gap-1 rounded-full bg-slate-500/20 px-2 py-0.5 text-xs font-medium text-slate-200">
                <Eye className="h-3 w-3" /> Spectating
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4 text-sm text-slate-400">
            {battle.isPrivate && (
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  const url = `${window.location.origin}/battles/${battle.id}`;
                  void navigator.clipboard?.writeText(url);
                  push("Battle link copied.", "success");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/5"
              >
                <Link2 className="h-3.5 w-3.5" /> Copy link
              </button>
            )}
            <BattleCost costPerPlayer={battle.costPerPlayer} borrowPct={borrowPct} currency={ledger} />
            {phase === "finished" && (
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  replayBattle();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/5"
              >
                Replay battle
              </button>
            )}
            {battle.terminal && (
              <span className="text-pink-300">
                {battle.crazy ? "Lowest last-case pull wins" : "Highest last-case pull wins"}
                {battle.jackpot ? " · jackpot odds after last case" : ""}
              </span>
            )}
          </div>
        </div>

        {(showJackpotPot || caseSequence.length > 0) && (
          <div
            className={clsx(
              "border-b px-4 py-3",
              showJackpotPot ? "border-amber-400/20 bg-amber-400/[0.05]" : "border-white/10 bg-black/20",
            )}
          >
            {caseSequence.length > 0 && (
              <p className="text-center text-sm text-slate-300">
                Case {headerCasePos}/{caseSequence.length}
                {headerCase ? (
                  <>
                    : <span className="font-semibold text-white">{headerCase.name}</span>
                  </>
                ) : null}
              </p>
            )}
            {showJackpotPot && (
              <div className={clsx("flex justify-center", caseSequence.length > 0 && "mt-2")}>
                <AnimatedPot
                  value={pot}
                  currency={ledger}
                  label={
                    tieBreak && phase === "jackpot"
                      ? "Tie-breaker pot"
                      : battle.coinflip
                        ? "Coinflip pot"
                        : "Jackpot pot"
                  }
                />
              </div>
            )}
          </div>
        )}

        {phase === "jackpot" && jackpotTickets && (
          <div className="border-b border-amber-400/25 bg-amber-400/[0.05] px-4 py-3">
            {tieBreak && (
              <p className="mb-2 text-center text-xs text-slate-400">
                It's a tie! An equal-odds spin between the tied {jackpotTickets.length > 2 ? "parties" : "two"} decides
                the winner.
              </p>
            )}
            {battle.coinflip && (
              <p className="mb-2 text-center text-xs text-slate-400">
                {teams.every((t) => t.length <= 1)
                  ? "Equal-odds spin — winner keeps the pot."
                  : "Equal-odds spin — one player from each team. Landed team splits the pot."}
              </p>
            )}
            <JackpotWheel
              tickets={jackpotTickets}
              spinToken={jackpotSpinToken}
              winnerId={jackpotWinnerId}
              duration={BATTLE_JACKPOT_SPIN_MS}
              compact={jackpotTickets.length >= 6}
              variant={battle.coinflip ? "circles" : "bars"}
              finishVerb={battle.coinflip ? "wins the flip" : "takes the jackpot"}
              onFinished={handleJackpotFinished}
            />
          </div>
        )}

        <div className="flex w-full justify-center gap-2 overflow-x-auto border-b border-white/10 bg-black/20 px-3 py-2 scrollbar-thin">
          {caseSequence.map((id, i) => {
            const c = getCase(id)!;
            const activeIdx = i === caseIndex && phase === "running";
            const doneIdx = i < caseIndex || phase === "finished" || phase === "jackpot" || phase === "wildcard";
            return (
              <button
                key={i}
                type="button"
                title={`Inspect ${c.name}`}
                onClick={() => {
                  sound.click();
                  setPreviewId(id);
                }}
                className={clsx(
                  "group flex shrink-0 flex-col items-center gap-1 rounded-lg border p-1.5 transition-all hover:border-white/30 hover:bg-white/5",
                  activeIdx ? "border-fuchsia-400/60" : "border-white/5",
                  doneIdx && !activeIdx && "opacity-40 hover:opacity-80",
                )}
              >
                <CaseThumb c={c} size="list" className="h-12 w-12 rounded" />
              </button>
            );
          })}
          {caseSequence.length === 0 && <span className="p-2 text-xs text-slate-500">No cases configured.</span>}
        </div>

        <div className="relative min-w-0 w-full">
          {phase === "countdown" && <BattleCountdown countdown={countdown} />}
          {phase === "wildcard" && (
            <div className="mb-2 flex justify-center px-3">
              <p className="wildcard-banner rounded-full border border-emerald-300/50 bg-emerald-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.35)]">
                Wildcard · every player rolls their own multiplier
              </p>
            </div>
          )}
          <div className="min-w-0 w-full overflow-x-auto scrollbar-thin">
            <div className="min-w-full">
          <div className="flex w-full items-stretch">
            {layoutTeams.map((teamPlayers, teamIdx) => {
                const isTeam = !battle.shared && teamPlayers.length > 1;
                const teamColor = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
                return (
                  <Fragment key={`head-${teamIdx}`}>
                    {teamIdx > 0 && !battle.shared && <TeamDivider mark={false} dense={denseVs} />}
                  <div
                    className="flex min-w-0 flex-col overflow-hidden"
                    style={{
                      flex: "1 1 0%",
                      width: 0,
                      minWidth: laneMin ? `calc(${laneMin} * ${teamPlayers.length})` : undefined,
                      ...(isTeam
                        ? {
                            borderLeft: `1px solid ${teamColor}40`,
                            borderRight: `1px solid ${teamColor}40`,
                            borderTop: `1px solid ${teamColor}40`,
                            background: `linear-gradient(180deg, ${teamColor}18, transparent 88%)`,
                          }
                        : undefined),
                    }}
                  >
                    {isTeam && (
                      <p className={clsx("text-center font-bold uppercase tracking-widest", crowded ? "py-1 text-[10px]" : "py-1.5 text-[11px]")} style={{ color: teamColor }}>
                        Team {teamIdx + 1}
                      </p>
                    )}
                    <div className="flex min-w-0 w-full">
                      {teamPlayers.map((p, i) => (
                        <div
                          key={p.slotIndex}
                          className={clsx("min-w-0", isTeam && i > 0 && "border-l border-solid border-white/15")}
                          style={{ flex: "1 1 0%", width: 0, minWidth: laneMin }}
                        >
                          <PlayerHeader
                            player={p}
                            state={roundStates[p.slotIndex] ?? { total: 0, history: [] }}
                            currency={ledger}
                            jackpotOdds={
                              battle.coinflip
                                ? liveOdds[p.slotIndex]
                                : battle.jackpot && (!battle.terminal || liveOdds[p.slotIndex] !== undefined)
                                  ? liveOdds[p.slotIndex]
                                  : undefined
                            }
                            terminal={battle.terminal}
                            hidePullTotal={battle.coinflip}
                            grouped={isTeam}
                            borrowPct={p.kind === "you" ? borrowPct : 0}
                            compact={crowded}
                            wildcardMulti={wildcardBySlot[p.slotIndex]}
                            wildcardPending={
                              phase === "wildcard" &&
                              wildcardBySlot[p.slotIndex] == null &&
                              p.kind !== "empty" &&
                              p.kind !== "joining"
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>

          <div className="relative min-w-0 w-full">
            {resultOpen && payout && (
              <BattleResultOverlay
                result={payout}
                currency={ledger}
                onClose={() => setResultOpen(false)}
                onRecreate={recreateBattle}
                onReplay={replayBattle}
              />
            )}
            <div className="flex w-full items-stretch">
              {layoutTeams.map((teamPlayers, teamIdx) => {
                const isTeam = !battle.shared && teamPlayers.length > 1;
                const teamColor = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
                return (
                  <Fragment key={`stage-${teamIdx}`}>
                    {teamIdx > 0 && !battle.shared && <TeamDivider reelSize={reelSize} dense={denseVs} />}
                    <div
                      className="flex min-w-0 flex-col overflow-hidden"
                      style={{
                        flex: "1 1 0%",
                        width: 0,
                        minWidth: laneMin ? `calc(${laneMin} * ${teamPlayers.length})` : undefined,
                        ...(isTeam
                          ? {
                              borderLeft: `1px solid ${teamColor}40`,
                              borderRight: `1px solid ${teamColor}40`,
                              borderBottom: `1px solid ${teamColor}40`,
                            }
                          : undefined),
                      }}
                    >
                      <div className="flex min-w-0 w-full flex-1">
                        {teamPlayers.map((p, i) => (
                          <div
                            key={p.slotIndex}
                            className={clsx("min-w-0", isTeam && i > 0 && "border-l border-solid border-white/15")}
                            style={{ flex: "1 1 0%", width: 0, minWidth: laneMin }}
                          >
                            <PlayerStage
                              player={p}
                              result={pendingResults[p.slotIndex] ?? null}
                              spinToken={spinToken}
                              goldSpinEnabled={battle.goldSpin}
                              state={roundStates[p.slotIndex] ?? { total: 0, history: [] }}
                              battleActive={phase === "running"}
                              activeCase={currentCase ?? CASES[0]}
                              costPerPlayer={battle.costPerPlayer}
                              currency={ledger}
                              grouped={isTeam}
                              reelSize={reelSize}
                              compact={crowded}
                              fastSpin={battle.fastSpin}
                              fundedPct={battle.fundedPct}
                              wildcardActive={phase === "wildcard" || (phase === "jackpot" && wildcardTargets[p.slotIndex] != null)}
                              wildcardResult={wildcardTargets[p.slotIndex] ?? null}
                              wildcardSpinToken={wildcardSpinToken}
                              onWildcardLanded={() => handleWildcardLanded(p.slotIndex)}
                              canManageSeats={
                                !spectating &&
                                phase === "filling" &&
                                battle.status !== "finished" &&
                                (battle.fundedPct ?? 0) < 1 &&
                                battle.eventKind !== "funded"
                              }
                              canJoinSeat={spectating && phase === "filling" && battle.status !== "finished" && !wantReplay}
                              onLanded={(item) => handleLanded(p.slotIndex, item)}
                              onCallBot={() => callBot(p.slotIndex)}
                              onJoinBattle={() => {
                                sound.click();
                                payAndJoin(p.slotIndex, 0);
                              }}
                              onBorrowJoin={() => {
                                sound.click();
                                setBorrowSeat(p.slotIndex);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>

      <CasePreviewModal caseId={previewId} onClose={() => setPreviewId(null)} />
      {needsJoinGate && (
        <JoinBattleModal
          battle={battle}
          onClose={() => navigate("/battles")}
          onConfirm={(pct) => {
            payAndJoin(0, pct);
          }}
        />
      )}
      {borrowSeat !== null && spectating && (
        <JoinBattleModal
          battle={battle}
          heading="Borrow join"
          onClose={() => setBorrowSeat(null)}
          onConfirm={(pct) => {
            if (payAndJoin(borrowSeat, pct)) setBorrowSeat(null);
          }}
        />
      )}
    </div>
  );
}

function TeamDivider({
  mark = true,
  reelSize = "lg",
  dense = false,
}: {
  mark?: boolean;
  reelSize?: BattleReelSize;
  dense?: boolean;
}) {
  const reelH = BATTLE_REEL_HEIGHT[reelSize];
  return (
    <div className={clsx("relative shrink-0 self-stretch", dense ? "w-6 sm:w-7" : "w-9 sm:w-11")}>
      {mark ? (
        <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: reelH }}>
          <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-full bg-bg-900 px-1.5 py-1.5 shadow-[0_0_16px_rgba(0,0,0,0.45)] ring-1 ring-white/15 sm:px-2 sm:py-2">
            <Swords className={clsx(dense ? "h-3 w-3" : "h-4 w-4", "text-slate-300")} />
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">vs</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BattleCountdown({ countdown }: { countdown: number }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-hidden rounded-xl bg-bg-950/80 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 shimmer opacity-30" />
      <div className="relative text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-fuchsia-200">Battle starting in</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={countdown}
            initial={{ opacity: 0, scale: 1.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-8xl font-black text-white drop-shadow-[0_0_28px_rgba(232,121,249,0.75)] sm:text-9xl"
          >
            {countdown}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlayerHeader({
  player,
  state,
  currency,
  jackpotOdds,
  terminal = false,
  grouped = false,
  borrowPct = 0,
  compact = false,
  hidePullTotal = false,
  wildcardMulti,
  wildcardPending = false,
}: {
  player: BattlePlayer;
  state: PlayerRoundState;
  currency?: PlayCurrency;
  jackpotOdds?: number;
  terminal?: boolean;
  grouped?: boolean;
  borrowPct?: number;
  compact?: boolean;
  hidePullTotal?: boolean;
  wildcardMulti?: WildcardMulti;
  wildcardPending?: boolean;
}) {
  const label = player.kind === "you" ? "You" : player.name || `Player ${player.slotIndex + 1}`;
  const avatar = useIdentityStore((s) => s.avatarFor(player.kind === "you" ? "You" : label));
  const role = useIdentityStore((s) => s.roleFor(player.kind === "you" ? "You" : label));
  const raw = terminal ? (state.history[0]?.item.value ?? 0) : state.total;
  const shown = applyWildcard(raw, wildcardMulti);
  const up = wildcardMulti != null && wildcardTone(wildcardMulti) === "up";
  const down = wildcardMulti != null && wildcardTone(wildcardMulti) === "down";
  return (
    <div
      className={clsx("w-full", compact ? "px-1.5 pt-2 pb-1.5" : "px-3 pt-3 pb-2", !grouped && "rounded-t-xl border border-b-0 border-white/10 bg-black/20")}
      style={grouped ? { boxShadow: `inset 0 3px 0 ${player.color}` } : { borderTopColor: player.color, borderTopWidth: 3 }}
    >
      <div className="flex items-center gap-2">
        <PlayerAvatar
          src={avatar}
          name={label}
          color={player.color}
          size={compact ? 22 : 28}
          kind={player.kind === "you" ? "you" : player.kind === "bot" ? "bot" : "player"}
        />
        <div className="min-w-0">
          <p className={clsx("flex items-center gap-1.5 truncate font-semibold text-white", compact ? "text-xs" : "text-sm")}>
            {label}
            <RoleBadge role={role} />
            {jackpotOdds !== undefined && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                <Coins className="h-2.5 w-2.5" /> {jackpotOdds.toFixed(1)}%
              </span>
            )}
            {player.kind === "you" && borrowPct > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                <Handshake className="h-3 w-3" /> keep {pctLabel(1 - borrowPct)}
              </span>
            )}
          </p>
          <p className={clsx("text-slate-500", compact ? "text-[10px]" : "text-[11px]")}>
            Player {player.slotIndex + 1} · Team {player.teamIndex + 1}
          </p>
        </div>
        {!hidePullTotal ? (
          <span className="ml-auto flex shrink-0 flex-col items-end text-right">
            {wildcardMulti != null && (
              <span
                className={clsx(
                  "mb-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-black tracking-wide",
                  up ? "bg-emerald-400/20 text-emerald-200" : down ? "bg-rose-400/20 text-rose-200" : "text-slate-300",
                )}
              >
                {formatWildcard(wildcardMulti)}
              </span>
            )}
            {wildcardPending && wildcardMulti == null && (
              <span className="mb-0.5 inline-flex animate-pulse rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-white/70">
                rolling
              </span>
            )}
            <CashAmount
              wl={shown}
              currency={currency}
              className={clsx(
                "inline-flex rounded-md px-1.5 py-0.5 font-mono font-bold",
                compact ? "text-xs" : "text-sm",
                wildcardMulti != null
                  ? up
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                  : terminal
                    ? "bg-pink-500/15 text-pink-300"
                    : "text-emerald-300",
              )}
              iconClassName={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
            />
            {wildcardMulti != null && (
              <span className="mt-0.5 flex items-center justify-end gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                was <CashAmount wl={raw} currency={currency} iconClassName="h-3 w-3" />
              </span>
            )}
            {terminal && wildcardMulti == null && (
              <span className="mt-0.5 flex items-center justify-end gap-1 text-[9px] font-semibold uppercase tracking-wide text-pink-400/80">
                last case · pot <CashAmount wl={state.total} currency={currency} iconClassName="h-3 w-3" />
              </span>
            )}
          </span>
        ) : wildcardMulti != null ? (
          <span
            className={clsx(
              "ml-auto inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-black tracking-wide",
              up ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200",
            )}
          >
            {formatWildcard(wildcardMulti)}
          </span>
        ) : wildcardPending ? (
          <span className="ml-auto inline-flex animate-pulse rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-white/70">
            rolling
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PlayerStage({
  player,
  result,
  spinToken,
  goldSpinEnabled,
  state,
  battleActive,
  activeCase,
  costPerPlayer,
  currency,
  grouped = false,
  reelSize = "lg",
  compact = false,
  fastSpin = false,
  fundedPct = 0,
  canManageSeats = true,
  canJoinSeat = false,
  wildcardActive = false,
  wildcardResult = null,
  wildcardSpinToken = 0,
  onWildcardLanded,
  onLanded,
  onCallBot,
  onJoinBattle,
  onBorrowJoin,
}: {
  player: BattlePlayer;
  result: CaseOddsEntry | null;
  spinToken: number;
  goldSpinEnabled: boolean;
  state: PlayerRoundState;
  battleActive: boolean;
  activeCase: (typeof CASES)[number];
  costPerPlayer: number;
  currency?: PlayCurrency;
  grouped?: boolean;
  reelSize?: BattleReelSize;
  compact?: boolean;
  fastSpin?: boolean;
  fundedPct?: number;
  canManageSeats?: boolean;
  canJoinSeat?: boolean;
  wildcardActive?: boolean;
  wildcardResult?: WildcardMulti | null;
  wildcardSpinToken?: number;
  onWildcardLanded?: (multi: WildcardMulti) => void;
  onLanded: (item: CaseOddsEntry["item"]) => void;
  onCallBot: () => void;
  onJoinBattle?: () => void;
  onBorrowJoin?: () => void;
}) {
  const pool = activeCase.odds.map((o) => o.item);
  const goldPool = activeCase.odds.filter((o) => o.goldTier).map((o) => o.item);

  return (
    <div className={clsx("flex h-full w-full flex-col", compact ? "px-1.5 pb-2" : "px-3 pb-3", !grouped && "rounded-b-xl border border-t-0 border-white/10 bg-black/20")}>
      {wildcardActive && player.kind !== "empty" && player.kind !== "joining" ? (
        <WildcardReel
          result={wildcardResult}
          spinToken={wildcardSpinToken}
          size={reelSize}
          laneSeed={player.slotIndex}
          duration={fastSpin ? 2600 : 3800}
          onLanded={onWildcardLanded}
        />
      ) : player.kind === "empty" || player.kind === "joining" ? (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-black/25 p-3 text-center"
          style={{ minHeight: BATTLE_REEL_HEIGHT[reelSize] }}
        >
          {player.kind === "joining" ? (
            <p className="text-xs text-slate-400">Waiting for player to join…</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Empty seat · <CashAmount wl={fundedSeatCost(costPerPlayer, fundedPct)} currency={currency} iconClassName="h-3 w-3" /> to join
                {fundedPct > 0 ? ` (${pctLabel(fundedPct)} funded)` : ""}
              </p>
              {canJoinSeat && (
                <div className="flex w-full max-w-[11rem] flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={onJoinBattle}
                    className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-bg-950 transition-all duration-150 hover:brightness-110 active:scale-95"
                  >
                    Join battle
                  </button>
                  <button
                    type="button"
                    disabled={fundedPct > 0}
                    title={fundedPct > 0 ? "Borrow is disabled on funded battles" : "Join this seat with borrow"}
                    onClick={onBorrowJoin}
                    className="flex items-center justify-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1.5 text-xs font-semibold text-sky-100 transition-all duration-150 hover:bg-sky-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Handshake className="h-3.5 w-3.5" /> Borrow join
                  </button>
                </div>
              )}
              {canManageSeats && (
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onCallBot();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/5 active:scale-95"
                >
                  <Bot className="h-3.5 w-3.5" /> Call Bot
                </button>
              )}
              {fundedPct >= 1 && !canManageSeats && !canJoinSeat && (
                <p className="text-[10px] leading-snug text-slate-500">Waiting for players — bots can’t fill a house-funded seat.</p>
              )}
            </>
          )}
        </div>
      ) : (
        <CaseReel
          pool={pool}
          goldPool={goldPool}
          result={result}
          spinToken={battleActive ? spinToken : 0}
          goldSpinEnabled={goldSpinEnabled}
          duration={fastSpin ? 2400 : 6800}
          goldDuration={fastSpin ? 1400 : 3800}
          size={reelSize}
          orientation="vertical"
          laneSeed={player.slotIndex}
          onLanded={onLanded}
        />
      )}

      <div className={clsx("mt-2 overflow-y-auto rounded-lg bg-black/20 p-1.5 scrollbar-thin", compact ? "max-h-48 min-h-[72px]" : "max-h-64 min-h-[92px]")}>
        {state.history.length === 0 ? (
          <p className={clsx("grid h-full place-items-center text-[11px] text-slate-600", compact ? "min-h-[64px]" : "min-h-[80px]")}>No pulls yet</p>
        ) : (
          <div className={clsx("grid gap-1.5", compact ? "grid-cols-1" : "grid-cols-2")}>
            {state.history.map((h) => (
              <ItemCard key={h.id} item={h.item} size="sm" showChance={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
