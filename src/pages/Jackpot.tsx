import { useEffect, useMemo, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { clsx } from "clsx";
import { JackpotCircleWheel } from "../components/jackpot/JackpotCircleWheel";
import type { JackpotTicket } from "../components/battles/JackpotWheel";
import { AnimatedPot } from "../components/ui/AnimatedPot";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import {
  JACKPOT_HOUSE_EDGE,
  JACKPOT_MAX_BOTS,
  JACKPOT_POTS,
  potTotal,
  useJackpotStore,
  youEntry,
  type JackpotPotId,
} from "../store/jackpotStore";
import { useEconomyStore } from "../store/economyStore";
import { considerWinLeader } from "../store/winLeaderStore";
import { WinLeaderStageMark } from "../components/layout/WinLeaderBadge";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { formatCredits, formatCash, formatPercent } from "../lib/format";
import { LockAmountInput } from "../components/ui/LockAmountInput";
import { sound } from "../lib/sound";
import { HOUSE_EDGE } from "../lib/rakeback";
import { requireAccount } from "../lib/stake";
import { awardAffiliateOnWager } from "../store/affiliateStore";
import { useIdentityStore } from "../store/identityStore";
import { PlayerTag } from "../components/identity/PlayerTag";

function jackpotPresets(id: JackpotPotId): number[] {
  if (id === "small") return [5, 50, 100];
  if (id === "large") return [100, 500, 1000, 5000, 10_000];
  return [10_000, 25_000, 50_000, 100_000];
}

export function JackpotPage() {
  const [potId, setPotId] = useState<JackpotPotId>("small");
  const def = JACKPOT_POTS.find((p) => p.id === potId)!;
  const [amount, setAmount] = useState<number>(def.min);
  const pot = useJackpotStore((s) => s.pots[potId]);
  const join = useJackpotStore((s) => s.join);
  const callBot = useJackpotStore((s) => s.callBot);
  const beginSpin = useJackpotStore((s) => s.beginSpin);
  const finishSpin = useJackpotStore((s) => s.finishSpin);
  const resetPot = useJackpotStore((s) => s.resetPot);
  const spend = useEconomyStore((s) => s.spend);
  const awardRakeback = useEconomyStore((s) => s.awardRakeback);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);
  const [now, setNow] = useState(() => Date.now());
  const spinLock = useRef(false);
  const lastBeep = useRef<number | null>(null);
  const avatars = useIdentityStore((s) => s.avatars);
  const avatarFor = useIdentityStore((s) => s.avatarFor);

  const total = potTotal(pot.entries);
  const you = youEntry(pot.entries);
  const payout = Math.round(total * (1 - JACKPOT_HOUSE_EDGE));
  const countdownLeft =
    pot.phase === "open" && pot.countdownEndsAt
      ? Math.max(0, Math.ceil((pot.countdownEndsAt - now) / 1000))
      : null;
  const tickets: JackpotTicket[] = useMemo(
    () =>
      pot.entries.map((e) => ({
        playerId: e.id,
        name: e.name,
        color: e.color,
        weight: total > 0 ? e.amount / total : 0,
        avatar: avatarFor(e.kind === "you" ? "You" : e.name),
      })),
    [pot.entries, total, avatars, avatarFor],
  );

  function switchPot(id: JackpotPotId) {
    sound.click();
    setPotId(id);
    const next = JACKPOT_POTS.find((p) => p.id === id)!;
    setAmount((v) => Math.min(next.max, Math.max(next.min, v)));
  }

  function handleJoin() {
    const bet = Math.round(amount);
    if (bet < def.min || bet > def.max) {
      push(`Bet must be ${formatCredits(def.min)}–${formatCash(def.max)} in this pot.`, "warning");
      return;
    }
    if (!requireAccount()) return;
    if (!spend(bet)) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }
    if (!join(potId, bet)) {
      credit(bet);
      push("You already have a seat in this pot.", "info");
      return;
    }
    awardRakeback(bet, HOUSE_EDGE.jackpot);
    awardAffiliateOnWager(bet, HOUSE_EDGE.jackpot);
    sound.chip();
    push(`Joined ${def.label} jackpot with ${formatCash(bet)}.`, "success");
  }

  const botCount = pot.entries.filter((e) => e.kind === "bot").length;

  function handleCallBot() {
    sound.click();
    if (!callBot(potId)) {
      const reason = !you
        ? "Join first, then call a bot at your bet size."
        : botCount >= JACKPOT_MAX_BOTS
          ? `You can call at most ${JACKPOT_MAX_BOTS} bots.`
          : "This pot is full.";
      push(reason, "warning");
      return;
    }
    push(`Bot joined with ${formatCash(you!.amount)}.`, "info");
  }

  async function handleSpin() {
    if (spinLock.current) return;
    const live = useJackpotStore.getState().pots[potId];
    if (live.phase !== "open" || live.entries.length < 2) return;
    spinLock.current = true;
    sound.click();
    const liveTotal = potTotal(live.entries);
    const [roll] = await play(1);
    let acc = 0;
    let winner = live.entries[live.entries.length - 1];
    for (const e of live.entries) {
      acc += e.amount / liveTotal;
      if (roll < acc) {
        winner = e;
        break;
      }
    }
    if (!beginSpin(potId, winner.id)) spinLock.current = false;
  }

  useEffect(() => {
    if (pot.phase !== "open" || !pot.countdownEndsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [pot.phase, pot.countdownEndsAt]);

  useEffect(() => {
    if (countdownLeft == null) {
      lastBeep.current = null;
      return;
    }
    if (countdownLeft <= 5 && countdownLeft > 0 && lastBeep.current !== countdownLeft) {
      lastBeep.current = countdownLeft;
      sound.countdownBeep(countdownLeft === 1);
    }
    if (countdownLeft === 0) void handleSpin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownLeft]);

  useEffect(() => {
    spinLock.current = false;
  }, [pot.phase, potId]);

  function handleFinished() {
    const current = useJackpotStore.getState().pots[potId];
    if (current.phase !== "spinning") return;
    const winner = current.entries.find((e) => e.id === current.winnerId);
    const me = youEntry(current.entries);
    const liveTotal = potTotal(current.entries);
    const livePayout = Math.round(liveTotal * (1 - JACKPOT_HOUSE_EDGE));
    finishSpin(potId);
    if (winner && winner.amount > 0 && livePayout > 0) {
      considerWinLeader("jackpot", {
        name: winner.name,
        isYou: winner.kind === "you",
        multiplier: livePayout / winner.amount,
      });
    }
    if (!winner || !me) return;
    if (winner.kind === "you") {
      credit(livePayout);
      recordRound(me.amount, livePayout, "jackpot");
      push(`You won the jackpot! +${formatCash(livePayout)} after 9% house edge.`, "success");
    } else {
      recordRound(me.amount, 0, "jackpot");
      push(`${winner.name} took the pot. House kept ${formatCash(liveTotal - livePayout)}.`, "info");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Jackpot</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Deposit into a pot. Tickets are proportional to bet size. Winner takes 91% of the pot — 9% house edge.
          </p>
        </div>
        <InfoButton title="Jackpot — RTP & House Edge">
          <StatRow label="House edge" value={formatPercent(JACKPOT_HOUSE_EDGE)} />
          <StatRow label="Winner payout" value="91% of the pot" />
          <StatRow label="RTP" value={formatPercent(1 - JACKPOT_HOUSE_EDGE)} />
          <p>Three independent pots. Bots match your exact bet. The circular wheel is weighted by each player’s share of the pot.</p>
        </InfoButton>
      </div>

      <div className="flex flex-wrap gap-2">
        {JACKPOT_POTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (pot.phase === "spinning") return;
              switchPot(p.id);
            }}
            disabled={pot.phase === "spinning" && p.id !== potId}
            className={clsx(
              "rounded-xl border px-4 py-2.5 text-left transition-colors",
              potId === p.id ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-white/[0.03] hover:bg-white/5",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <p className="text-sm font-semibold text-white">{p.label}</p>
            <p className="text-[11px] text-slate-400">{p.blurb}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative surface space-y-6 p-5 pb-11">
          <WinLeaderStageMark game="jackpot" />
          <div className="relative">
            <AnimatedPot value={total} label={`${def.label} pot`} size="lg" />
            <p className="mt-1 text-center text-xs text-slate-500">Pays {formatCash(payout)} after house edge</p>
            {countdownLeft != null && pot.phase === "open" && (
              <div className="absolute right-0 top-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">Starts in</p>
                <p className="font-mono text-5xl font-black text-white tabular-nums">{countdownLeft}</p>
              </div>
            )}
          </div>

          <JackpotCircleWheel
            tickets={tickets}
            spinToken={pot.spinToken}
            winnerId={pot.winnerId}
            shouldSpin={pot.phase === "spinning"}
            countdown={pot.phase === "open" ? countdownLeft : null}
            onFinished={handleFinished}
          />

          <div className="space-y-2 pr-24">
            {pot.entries.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No players yet. Join to open this pot.</p>
            ) : (
              pot.entries.map((e) => {
                const pct = total > 0 ? (e.amount / total) * 100 : 0;
                return (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2">
                    <PlayerTag
                      name={e.name}
                      you={e.kind === "you"}
                      color={e.color}
                      size={28}
                      kind={e.kind === "you" ? "you" : e.kind === "bot" ? "bot" : "player"}
                      className="min-w-0 flex-1"
                      nameClassName="text-sm font-medium text-white"
                    />
                    {e.kind === "bot" ? <span className="shrink-0 text-[10px] uppercase text-slate-500">bot</span> : null}
                    <p className="font-mono text-sm text-slate-300">{formatCredits(e.amount)}</p>
                    <p className="w-14 text-right font-mono text-xs text-amber-200">{pct.toFixed(1)}%</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface space-y-4 p-4">
            {pot.phase === "open" && !you && (
              <>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your bet</span>
                  <LockAmountInput
                    valueWl={amount}
                    onChangeWl={(wl) => setAmount(Math.min(def.max, Math.max(def.min, wl)))}
                    minWl={def.min}
                    className="mt-1.5"
                    inputClassName="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-white outline-none focus:border-amber-400/50"
                  />
                </label>
                <input
                  type="range"
                  min={def.min}
                  max={def.max}
                  value={Math.min(def.max, Math.max(def.min, amount))}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
                <div className="flex flex-wrap gap-2">
                  {jackpotPresets(potId).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        sound.click();
                        setAmount(v);
                      }}
                      className="flex-1 rounded-lg border border-white/10 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
                    >
                      {formatCredits(v)}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={handleJoin} className="btn-primary w-full py-2.5">
                  Join · {formatCash(Math.round(amount))}
                </button>
              </>
            )}

            {pot.phase === "open" && you && (
              <>
                <p className="text-sm text-slate-300">
                  You’re in for <span className="font-mono font-semibold text-white">{formatCash(you.amount)}</span>.
                  Call up to {JACKPOT_MAX_BOTS} bots — they’ll match that exact bet.
                </p>
                <button
                  type="button"
                  onClick={handleCallBot}
                  disabled={pot.entries.length >= 10 || botCount >= JACKPOT_MAX_BOTS}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-40"
                >
                  <Bot className="h-4 w-4" /> Call Bot · {formatCash(you.amount)}
                  <span className="text-xs font-medium text-slate-400">
                    ({botCount}/{JACKPOT_MAX_BOTS})
                  </span>
                </button>
                {countdownLeft != null ? (
                  <p className="text-center text-sm text-slate-300">
                    Wheel spins in{" "}
                    <span className="font-mono font-bold text-white">{countdownLeft}s</span>
                    . More players can still join.
                  </p>
                ) : (
                  <p className="text-center text-[11px] text-slate-500">
                    Call a bot (or wait for a second player). A 45s countdown starts at 2+ players.
                  </p>
                )}
              </>
            )}

            {pot.phase === "spinning" && (
              <p className="py-6 text-center text-sm font-medium text-amber-200">Wheel is spinning…</p>
            )}

            {pot.phase === "finished" && (
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  resetPot(potId);
                }}
                className="btn-primary w-full py-2.5"
              >
                New round
              </button>
            )}
          </div>
          <ProvablyFairPanel />
        </div>
      </div>
    </div>
  );
}