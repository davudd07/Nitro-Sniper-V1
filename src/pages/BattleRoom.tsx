import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowLeft, Bot, User, Crown, Sparkles, Shuffle, Coins, UserPlus, Swords } from "lucide-react";
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
    setLiveOdds(evenOdds);
  }, [initialPlayers]);

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
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          sound.battleStart();
          setPhase("running");
          setCaseIndex(0);
          return 0;
        }
        return c - 1;
      });
    }, 700);
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
        setTimeout(() => {
          const entries = players.map((p) => ({ key: String(p.slotIndex), value: roundStatesRef.current[p.slotIndex]?.total ?? 0 }));
          const weights = computeJackpotWeights(entries, battle.crazy);
          const next: Record<number, number> = {};
          players.forEach((p, i) => (next[p.slotIndex] = weights[i] * 100));
          setLiveOdds(next);
        }, 350);
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
    const totals = players.map((p) => ({ p, value: finalStates[p.slotIndex]?.total ?? 0 }));
    const pot = totals.reduce((s, t) => s + t.value, 0);

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

  return (
    <div className="space-y-6">
      <Link to="/battles" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to battles
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-bg-800/60 p-4">
        <div className="flex items-center gap-2">
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
          {battle.goldSpin && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-300">
              <Sparkles className="h-3 w-3" /> Gold Spin
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>
            Pot: <span className="font-mono font-semibold text-amber-300">{formatCredits(pot)} SH</span>
          </span>
          {phase === "running" && currentCase && (
            <span>
              Case {caseIndex + 1}/{caseSequence.length}: <span className="text-white">{currentCase.name}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-bg-800/40 p-2 scrollbar-thin">
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

      {phase === "countdown" && (
        <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 py-6 text-center">
          <p className="text-sm text-fuchsia-200">Battle starting…</p>
          <p className="text-5xl font-black text-white">{countdown}</p>
        </div>
      )}

      <div className="flex items-stretch justify-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {teams.map((teamPlayers, teamIdx) => {
          const isTeam = teamPlayers.length > 1;
          const teamColor = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
          return (
            <Fragment key={teamIdx}>
              {teamIdx > 0 && <TeamDivider />}
              <div
                className={clsx("flex flex-col gap-2", isTeam && "rounded-2xl border-2 border-dashed p-2.5")}
                style={isTeam ? { borderColor: `${teamColor}55`, background: `${teamColor}0d` } : undefined}
              >
                {isTeam && (
                  <p className="text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: teamColor }}>
                    Team {teamIdx + 1}
                  </p>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {teamPlayers.map((p) => (
                    <div key={p.slotIndex} className="w-full sm:w-64">
                      <PlayerColumn
                        player={p}
                        result={pendingResults[p.slotIndex] ?? null}
                        spinToken={spinToken}
                        goldSpinEnabled={battle.goldSpin}
                        state={roundStates[p.slotIndex] ?? { total: 0, history: [] }}
                        battleActive={phase === "running"}
                        activeCase={currentCase ?? CASES[0]}
                        costPerPlayer={battle.costPerPlayer}
                        jackpotOdds={battle.jackpot ? liveOdds[p.slotIndex] : undefined}
                        onLanded={(item) => handleLanded(p.slotIndex, item)}
                        onCallBot={() => callBot(p.slotIndex)}
                        onSimulateJoin={() => simulateJoin(p.slotIndex)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>

      {phase === "jackpot" && jackpotTickets && (
        <div className="rounded-2xl border border-amber-400/30 bg-bg-800/60 p-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Coins className="h-4 w-4" /> {tieBreak ? "Tie-Breaker Jackpot" : "Jackpot Spin"}
          </p>
          {tieBreak && (
            <p className="mb-3 text-xs text-slate-400">
              It's a tie! An equal-odds spin between the tied {jackpotTickets.length > 2 ? "parties" : "two"} decides
              the winner.
            </p>
          )}
          <JackpotWheel
            tickets={jackpotTickets}
            spinToken={jackpotSpinToken}
            winnerId={jackpotWinnerId}
            onFinished={handleJackpotFinished}
          />
        </div>
      )}

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
            className="mt-4 inline-block rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 px-6 py-2.5 font-bold text-bg-950 transition-transform duration-150 hover:scale-105 active:scale-95"
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
    <div className="flex flex-col items-center justify-center gap-1 self-center px-1 text-slate-600">
      <Swords className="h-6 w-6 md:h-7 md:w-7" />
      <span className="text-[10px] font-bold uppercase tracking-widest">vs</span>
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
  onLanded: (item: CaseOddsEntry["item"]) => void;
  onCallBot: () => void;
  onSimulateJoin: () => void;
}) {
  const pool = activeCase.odds.map((o) => o.item);
  const goldPool = activeCase.odds.filter((o) => o.goldTier).map((o) => o.item);

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-bg-800/50 p-3" style={{ borderTopColor: player.color, borderTopWidth: 3 }}>
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
        <span className="ml-auto shrink-0 font-mono text-sm font-bold text-emerald-300">{formatCredits(state.total)}</span>
      </div>

      {player.kind === "empty" || player.kind === "joining" ? (
        <div className="flex h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-bg-950/40 p-3 text-center">
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
          size="lg"
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
