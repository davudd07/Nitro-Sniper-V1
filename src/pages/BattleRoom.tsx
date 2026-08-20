import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, User, Crown, Sparkles, Shuffle, Coins, UserPlus, Swords, Flag } from "lucide-react";
import { clsx } from "clsx";
import { useBattleStore } from "../store/battleStore";
import { BATTLE_MODES, PLAYER_COLORS, TEAM_COLORS } from "../data/battleModes";
import { getCase, rollCaseItem, type CaseOddsEntry } from "../data/cases";
import { CASES } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { CaseReel } from "../components/cases/CaseReel";
import { ItemCard } from "../components/ui/ItemCard";
import { JackpotWheel, type JackpotTicket } from "../components/battles/JackpotWheel";
import { useFairnessStore } from "../store/fairnessStore";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { randomBotName } from "../data/botNames";
import { formatCredits } from "../lib/format";
import { sound } from "../lib/sound";
import { computeJackpotWeights } from "../lib/jackpotOdds";

type SlotKind = "you" | "empty" | "joining" | "bot" | "player";

interface BattlePlayer {
  slotIndex: number;
  teamIndex: number;
  kind: SlotKind;
  name: string;
  color: string;
}

interface PlayerRoundState {
  total: number;
  history: { item: CaseOddsEntry["item"]; id: string }[];
}

type Phase = "filling" | "countdown" | "running" | "jackpot" | "finished";

export function BattleRoom() {
  const { battleId } = useParams();
  const battle = useBattleStore((s) => (battleId ? s.getBattle(battleId) : undefined));
  const play = useFairnessStore((s) => s.play);
  const credit = useEconomyStore((s) => s.credit);
  const push = useToastStore((s) => s.push);

  const mode = useMemo(() => (battle ? BATTLE_MODES.find((m) => m.id === battle.modeId) : undefined), [battle]);

  const initialPlayers = useMemo<BattlePlayer[]>(() => {
    if (!mode) return [];
    const players: BattlePlayer[] = [];
    let slot = 0;
    mode.teamSizes.forEach((size, teamIndex) => {
      for (let i = 0; i < size; i++) {
        players.push({
          slotIndex: slot,
          teamIndex,
          kind: slot === 0 ? "you" : "empty",
          name: slot === 0 ? "You" : "",
          color: PLAYER_COLORS[slot % PLAYER_COLORS.length],
        });
        slot++;
      }
    });
    return players;
  }, [mode]);

  const [players, setPlayers] = useState<BattlePlayer[]>(initialPlayers);
  const teams = useMemo(() => {
    const groups: BattlePlayer[][] = [];
    players.forEach((p) => {
      groups[p.teamIndex] = groups[p.teamIndex] ? [...groups[p.teamIndex], p] : [p];
    });
    return groups;
  }, [players]);
  const [phase, setPhase] = useState<Phase>("filling");
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

  const landedCountRef = useRef(0);
  const startedRef = useRef(false);
  const roundStatesRef = useRef<Record<number, PlayerRoundState>>({});

  useEffect(() => {
    setPlayers(initialPlayers);
    const init: Record<number, PlayerRoundState> = {};
    const evenOdds: Record<number, number> = {};
    initialPlayers.forEach((p) => {
      init[p.slotIndex] = { total: 0, history: [] };
      evenOdds[p.slotIndex] = initialPlayers.length > 0 ? 100 / initialPlayers.length : 0;
    });
    setRoundStates(init);
    roundStatesRef.current = init;
    // Terminal + jackpot: odds don't exist until the LAST case lands.
    setLiveOdds(battle?.jackpot && !battle.terminal ? evenOdds : {});
  }, [initialPlayers, battle?.jackpot, battle?.terminal]);

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
    if (allFilled && phase === "filling" && !startedRef.current) {
      startedRef.current = true;
      setPhase("countdown");
    }
  }, [allFilled, phase]);

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
          setPhase("running");
          setCaseIndex(0);
          return 0;
        }
        sound.countdownBeep();
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const runRound = useCallback(
    async (idx: number) => {
      const caseId = caseSequence[idx];
      const c = getCase(caseId);
      if (!c) return;
      const rolls = await play(players.length);
      const results: Record<number, CaseOddsEntry | null> = {};
      players.forEach((p, i) => {
        results[p.slotIndex] = rollCaseItem(c, rolls[i]);
      });
      landedCountRef.current = 0;
      setPendingResults(results);
      setSpinToken((t) => t + 1);
    },
    [caseSequence, play, players],
  );

  useEffect(() => {
    if (phase === "running" && caseIndex >= 0 && caseIndex < caseSequence.length) {
      void runRound(caseIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, caseIndex, caseSequence.length]);

  function handleLanded(slotIndex: number, item: CaseOddsEntry["item"]) {
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
        if (caseIndex + 1 < caseSequence.length) {
          setCaseIndex((i) => i + 1);
        } else {
          finishBattle();
        }
      }, 650);
    }
  }

  const resolvedRef = useRef(false);

  function finishBattle() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    resolveOutcome(roundStatesRef.current);
  }

  function resolveOutcome(finalStates: Record<number, PlayerRoundState>) {
    if (!battle || !mode) return;
    // The pot paid out is always the full cumulative total pulled — Terminal
    // Mode only changes which value decides the WINNER, not how much is won.
    const potTotals = players.map((p) => ({ p, value: finalStates[p.slotIndex]?.total ?? 0 }));
    const pot = potTotals.reduce((s, t) => s + t.value, 0);

    const decisionValue = (slotIndex: number) => {
      const state = finalStates[slotIndex];
      if (!state) return 0;
      return battle.terminal ? (state.history[0]?.item.value ?? 0) : state.total;
    };
    const totals = players.map((p) => ({ p, value: decisionValue(p.slotIndex) }));

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
        setJackpotTickets(tickets);
        setJackpotWinnerId(tickets[winnerIdx].playerId);
        setWinningTeam(totals[winnerIdx].p.teamIndex);
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
          setTieBreak(true);
          setJackpotTickets(tickets);
          setJackpotWinnerId(tickets[winnerIdx].playerId);
          setWinningTeam(tiedTeams[winnerIdx]);
          setPhase("jackpot");
          setJackpotSpinToken((t) => t + 1);
        });
      } else {
        const winnerTeam = tiedTeams[0];
        setWinningTeam(winnerTeam);
        settlePayout(winnerTeam, pot);
        setPhase("finished");
      }
    }
  }

  function settlePayout(winnerTeam: number, pot: number) {
    const teamMembers = players.filter((p) => p.teamIndex === winnerTeam);
    const share = pot / Math.max(1, teamMembers.length);
    const youWon = teamMembers.some((p) => p.kind === "you");
    if (youWon && share > 0) {
      credit(share);
      push(`Your team won the battle! +${formatCredits(share)} SH`, "success");
      sound.win("big");
    } else {
      push("Your team didn't win this battle.", "info");
      sound.lose();
    }
  }

  function handleJackpotFinished() {
    if (winningTeam === null || !jackpotTickets) return;
    const pot = jackpotTickets.length ? Object.values(roundStates).reduce((s, r) => s + r.total, 0) : 0;
    settlePayout(winningTeam, pot);
    setPhase("finished");
  }

  function callBot(slotIndex: number) {
    setPlayers((prev) => {
      const usedNames = new Set(prev.filter((p) => p.name).map((p) => p.name));
      return prev.map((p) => (p.slotIndex === slotIndex ? { ...p, kind: "bot", name: randomBotName(usedNames) } : p));
    });
  }

  function simulateJoin(slotIndex: number) {
    setPlayers((prev) => prev.map((p) => (p.slotIndex === slotIndex ? { ...p, kind: "joining" } : p)));
    const delay = 1400 + Math.random() * 2200;
    setTimeout(() => {
      setPlayers((prev) => {
        const usedNames = new Set(prev.filter((p) => p.name).map((p) => p.name));
        return prev.map((p) =>
          p.slotIndex === slotIndex ? { ...p, kind: "player", name: `Guest_${randomBotName(usedNames).slice(0, 5)}${Math.floor(Math.random() * 90 + 10)}` } : p,
        );
      });
    }, delay);
  }

  if (!battleId || !battle || !mode) return <Navigate to="/battles" replace />;

  const currentCaseId = caseIndex >= 0 ? caseSequence[caseIndex] : undefined;
  const currentCase = currentCaseId ? getCase(currentCaseId) : undefined;
  const pot = Object.values(roundStates).reduce((s, r) => s + r.total, 0);
  const battleValue = battle.costPerPlayer * players.length;
  const showJackpotCenter = Boolean(battle.jackpot || phase === "jackpot");
  const jackpotAfterTeam = Math.max(0, Math.floor((teams.length - 1) / 2));

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
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span>
              Battle:{" "}
              <span className="font-mono font-semibold text-amber-300">{formatCredits(battleValue)} SH</span>
            </span>
            {battle.terminal && (
              <span className="text-pink-300">
                {battle.crazy ? "Lowest last-case pull wins" : "Highest last-case pull wins"}
                {battle.jackpot ? (battle.terminal ? " · jackpot odds after last case" : "") : ""}
              </span>
            )}
            {phase === "running" && currentCase && (
              <span>
                Case {caseIndex + 1}/{caseSequence.length}: <span className="text-white">{currentCase.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-black/20 px-3 py-2 scrollbar-thin">
          {caseSequence.map((id, i) => {
            const c = getCase(id)!;
            const activeIdx = i === caseIndex && phase === "running";
            const doneIdx = i < caseIndex || phase === "finished" || phase === "jackpot";
            return (
              <div
                key={i}
                className={clsx(
                  "flex shrink-0 flex-col items-center gap-1 rounded-lg border p-1.5 transition-opacity",
                  activeIdx ? "border-fuchsia-400/60" : "border-white/5",
                  doneIdx && !activeIdx && "opacity-40",
                )}
              >
                <CaseThumb c={c} className="h-10 w-10 rounded" />
              </div>
            );
          })}
          {caseSequence.length === 0 && <span className="p-2 text-xs text-slate-500">No cases configured.</span>}
        </div>

        <div className="relative min-w-0 w-full">
          {phase === "countdown" && <BattleCountdown countdown={countdown} />}
          <div className="flex w-full min-w-0 items-stretch">
            {teams.map((teamPlayers, teamIdx) => {
              const isTeam = teamPlayers.length > 1;
              const teamColor = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
              const reelSize = players.length <= 4 ? "lg" : "md";
              const insertJackpotHere = showJackpotCenter && teamIdx === jackpotAfterTeam;
              return (
                <Fragment key={teamIdx}>
                  {teamIdx > 0 && !(showJackpotCenter && teamIdx - 1 === jackpotAfterTeam) && <TeamDivider />}
                  <div
                    className="flex min-w-0 flex-col overflow-hidden"
                    style={{
                      flex: "1 1 0%",
                      width: 0,
                      ...(isTeam
                        ? {
                            border: `1px solid ${teamColor}40`,
                            background: `linear-gradient(180deg, ${teamColor}18, transparent 42%)`,
                          }
                        : undefined),
                    }}
                  >
                    {isTeam && (
                      <p className="py-1.5 text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: teamColor }}>
                        Team {teamIdx + 1}
                      </p>
                    )}
                    <div className="flex min-w-0 w-full flex-1">
                      {teamPlayers.map((p, i) => (
                        <div
                          key={p.slotIndex}
                          className={clsx("min-w-0", isTeam && i > 0 && "border-l border-solid border-white/15")}
                          style={{ flex: "1 1 0%", width: 0 }}
                        >
                          <PlayerColumn
                            player={p}
                            result={pendingResults[p.slotIndex] ?? null}
                            spinToken={spinToken}
                            goldSpinEnabled={battle.goldSpin}
                            state={roundStates[p.slotIndex] ?? { total: 0, history: [] }}
                            battleActive={phase === "running"}
                            activeCase={currentCase ?? CASES[0]}
                            costPerPlayer={battle.costPerPlayer}
                            jackpotOdds={
                              battle.jackpot && (!battle.terminal || liveOdds[p.slotIndex] !== undefined)
                                ? liveOdds[p.slotIndex]
                                : undefined
                            }
                            terminal={battle.terminal}
                            grouped={isTeam}
                            reelSize={reelSize}
                            onLanded={(item) => handleLanded(p.slotIndex, item)}
                            onCallBot={() => callBot(p.slotIndex)}
                            onSimulateJoin={() => simulateJoin(p.slotIndex)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {insertJackpotHere && (
                    <JackpotCenter
                      pot={pot}
                      phase={phase}
                      tieBreak={tieBreak}
                      tickets={jackpotTickets}
                      spinToken={jackpotSpinToken}
                      winnerId={jackpotWinnerId}
                      onFinished={handleJackpotFinished}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {phase === "finished" && winningTeam !== null && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-center">
          <Crown className="mx-auto mb-2 h-8 w-8 text-amber-300" />
          <p className="text-lg font-bold text-white">
            Team {winningTeam + 1} wins the battle!{" "}
            {players
              .filter((p) => p.teamIndex === winningTeam)
              .map((p) => (p.kind === "you" ? "You" : p.name))
              .join(" & ")}
          </p>
          <p className="mt-1 text-sm text-slate-300">Total pot: {formatCredits(pot)} SH</p>
          <Link
            to="/battles/create"
            onClick={() => sound.click()}
            className="btn-primary mt-4 inline-block px-6 py-2.5"
          >
            Start another battle
          </Link>
        </div>
      )}
    </div>
  );
}

function TeamDivider() {
  return (
    <div className="flex w-9 shrink-0 items-center justify-center self-stretch sm:w-11">
      <div className="flex flex-col items-center gap-0.5 rounded-full bg-bg-900 px-2 py-2 shadow-[0_0_16px_rgba(0,0,0,0.45)] ring-1 ring-white/15">
        <Swords className="h-4 w-4 text-slate-300" />
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">vs</span>
      </div>
    </div>
  );
}

function JackpotCenter({
  pot,
  phase,
  tieBreak,
  tickets,
  spinToken,
  winnerId,
  onFinished,
}: {
  pot: number;
  phase: Phase;
  tieBreak: boolean;
  tickets: JackpotTicket[] | null;
  spinToken: number;
  winnerId: string | null;
  onFinished: () => void;
}) {
  const spinning = phase === "jackpot" && tickets !== null;

  return (
    <div className="flex w-[22%] min-w-[12.5rem] max-w-[24rem] shrink-0 flex-col items-stretch justify-center gap-3 self-stretch border-x border-amber-400/30 bg-gradient-to-b from-amber-400/12 via-black/25 to-transparent px-3 py-4">
      <div className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
          <Coins className="h-3.5 w-3.5" />
          {tieBreak && spinning ? "Tie-breaker" : "Jackpot pot"}
        </p>
        <p className="mt-1 font-mono text-3xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(251,191,36,0.35)] sm:text-4xl">
          {formatCredits(pot)}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">SH</p>
      </div>

      {spinning ? (
        <div className="min-w-0">
          {tieBreak && (
            <p className="mb-2 text-center text-[11px] text-slate-400">
              Equal-odds spin between the tied {tickets.length > 2 ? "parties" : "two"} decides the winner.
            </p>
          )}
          <JackpotWheel
            tickets={tickets}
            spinToken={spinToken}
            winnerId={winnerId}
            compact
            onFinished={onFinished}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-col items-center gap-0.5 rounded-full bg-bg-900 px-2.5 py-2 shadow-[0_0_16px_rgba(0,0,0,0.45)] ring-1 ring-amber-300/25">
            <Swords className="h-4 w-4 text-amber-200" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-amber-200/80">vs</span>
          </div>
          <p className="max-w-[16rem] text-center text-[11px] leading-relaxed text-slate-400">
            Unboxed value feeds this pot. The wheel spins here when the last case lands.
          </p>
        </div>
      )}
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

function PlayerColumn({
  player,
  result,
  spinToken,
  goldSpinEnabled,
  state,
  battleActive,
  activeCase,
  costPerPlayer,
  jackpotOdds,
  terminal = false,
  grouped = false,
  reelSize = "lg",
  onLanded,
  onCallBot,
  onSimulateJoin,
}: {
  player: BattlePlayer;
  result: CaseOddsEntry | null;
  spinToken: number;
  goldSpinEnabled: boolean;
  state: PlayerRoundState;
  battleActive: boolean;
  activeCase: (typeof CASES)[number];
  costPerPlayer: number;
  jackpotOdds?: number;
  terminal?: boolean;
  grouped?: boolean;
  reelSize?: "md" | "lg";
  onLanded: (item: CaseOddsEntry["item"]) => void;
  onCallBot: () => void;
  onSimulateJoin: () => void;
}) {
  const pool = activeCase.odds.map((o) => o.item);
  const goldPool = activeCase.odds.filter((o) => o.goldTier).map((o) => o.item);

  return (
    <div
      className={clsx("flex h-full w-full flex-col p-3", !grouped && "rounded-xl border border-white/10 bg-black/20")}
      style={grouped ? { boxShadow: `inset 0 3px 0 ${player.color}` } : { borderTopColor: player.color, borderTopWidth: 3 }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-bg-950"
          style={{ background: player.color }}
        >
          {player.kind === "you" ? <User className="h-4 w-4" /> : player.kind === "bot" ? <Bot className="h-4 w-4" /> : (player.name || "?").slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
            {player.kind === "you" ? "You" : player.name || `Player ${player.slotIndex + 1}`}
            {jackpotOdds !== undefined && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                <Coins className="h-2.5 w-2.5" /> {jackpotOdds.toFixed(1)}%
              </span>
            )}
          </p>
          <p className="text-[11px] text-slate-500">
            Player {player.slotIndex + 1} · Team {player.teamIndex + 1}
          </p>
        </div>
        <span className="ml-auto shrink-0 text-right">
          <span
            className={clsx(
              "inline-block rounded-md px-1.5 py-0.5 font-mono text-sm font-bold",
              terminal ? "bg-pink-500/15 text-pink-300" : "text-emerald-300",
            )}
          >
            {formatCredits(terminal ? (state.history[0]?.item.value ?? 0) : state.total)}
          </span>
          {terminal && (
            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-wide text-pink-400/80">
              last case · pot {formatCredits(state.total)}
            </span>
          )}
        </span>
      </div>

      {player.kind === "empty" || player.kind === "joining" ? (
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg bg-black/25 p-3 text-center">
          {player.kind === "joining" ? (
            <p className="text-xs text-slate-400">Waiting for player to join…</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">Empty seat · {formatCredits(costPerPlayer)} SH to join</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    sound.click();
                    onCallBot();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/5 active:scale-95"
                >
                  <Bot className="h-3.5 w-3.5" /> Call Bot
                </button>
                <button
                  onClick={() => {
                    sound.click();
                    onSimulateJoin();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/5 active:scale-95"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Simulate Join
                </button>
              </div>
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
          size={reelSize}
          orientation="vertical"
          laneSeed={player.slotIndex}
          onLanded={onLanded}
        />
      )}

      <div className="mt-2 max-h-64 min-h-[92px] overflow-y-auto rounded-lg bg-black/20 p-1.5 scrollbar-thin">
        {state.history.length === 0 ? (
          <p className="grid h-full min-h-[80px] place-items-center text-[11px] text-slate-600">No pulls yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {state.history.map((h) => (
              <ItemCard key={h.id} item={h.item} size="sm" showChance={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
