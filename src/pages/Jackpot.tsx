import { useEffect, useMemo, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { clsx } from "clsx";
import { JackpotCircleWheel } from "../components/jackpot/JackpotCircleWheel";
import type { JackpotTicket } from "../components/battles/JackpotWheel";
import { AnimatedPot } from "../components/ui/AnimatedPot";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import {
  JACKPOT_HOUSE_EDGE,
  JACKPOT_MAX_BOTS,
  JACKPOT_POTS,
  clampJackpotBet,
  potIsUnbounded,
  potRangeLabel,
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
import { formatPercent, formatPlayCash } from "../lib/format";
import { LockAmountInput } from "../components/ui/LockAmountInput";
import { sound } from "../lib/sound";
import { HOUSE_EDGE } from "../lib/rakeback";
import { requireAccount, takeStakeFor, stakeNeedMessage } from "../lib/stake";
import { usePlayCurrency } from "../lib/playWallet";
import { useIdentityStore } from "../store/identityStore";
import { PlayerTag } from "../components/identity/PlayerTag";

const UNLIMITED_SLIDER_MAX = 10_000_000;

function jackpotPresets(id: JackpotPotId): number[] {
  if (id === "small") return [5, 50, 100, 250, 500, 1000];
  if (id === "medium") return [1000, 2500, 5000, 7500, 10_000];
  if (id === "large") return [10_000, 20_000, 35_000, 50_000];
  return [50_000, 100_000, 250_000, 1_000_000, 5_000_000, 10_000_000];
}

export function JackpotPage() {
  const ledger = usePlayCurrency();
  const [potId, setPotId] = useState<JackpotPotId>("small");
  const def = JACKPOT_POTS.find((p) => p.id === potId)!;
  const unbounded = potIsUnbounded(potId);
  const [amount, setAmount] = useState<number>(def.min);
  const tables = useJackpotStore((s) => s.tables[ledger]);
  const pot = tables[potId];
  const join = useJackpotStore((s) => s.join);
  const callBot = useJackpotStore((s) => s.callBot);
  const beginSpin = useJackpotStore((s) => s.beginSpin);
  const finishSpin = useJackpotStore((s) => s.finishSpin);
  const resetPot = useJackpotStore((s) => s.resetPot);
  const creditLedger = useEconomyStore((s) => s.creditLedger);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const wallet = useEconomyStore((s) => (ledger === "shards" ? s.funCoins : s.balance));
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);
  const [now, setNow] = useState(() => Date.now());
  const [pointerId, setPointerId] = useState<string | null>(null);
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
        kind: e.kind === "you" ? "you" : e.kind === "bot" ? "bot" : "player",
      })),
    [pot.entries, total, avatars, avatarFor],
  );
  const ranked = useMemo(
    () => [...pot.entries].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)),
    [pot.entries],
  );

  const sliderMax = unbounded ? UNLIMITED_SLIDER_MAX : def.max;
  const sliderValue = Math.min(sliderMax, Math.max(def.min, amount));
  const unit = ledger === "shards" ? "Shards" : "WL";

  function setBet(next: number) {
    setAmount(clampJackpotBet(next, potId));
  }

  function switchPot(id: JackpotPotId) {
    sound.click();
    setPotId(id);
    setAmount((v) => clampJackpotBet(v, id));
  }

  function handleJoin() {
    const bet = clampJackpotBet(amount, potId);
    if (bet < def.min || (Number.isFinite(def.max) && bet > def.max)) {
      push(
        unbounded
          ? `Bet at least ${formatPlayCash(def.min, ledger)} in this pot.`
          : `Bet must be ${formatPlayCash(def.min, ledger)}–${formatPlayCash(def.max, ledger)} in this pot.`,
        "warning",
      );
      return;
    }
    if (!requireAccount()) return;
    if (!takeStakeFor(bet, HOUSE_EDGE.jackpot, ledger)) {
      push(stakeNeedMessage(bet, ledger), "danger");
      return;
    }
    if (!join(potId, bet)) {
      creditLedger(bet, ledger);
      push("You already have a seat in this pot.", "info");
      return;
    }
    sound.chip();
    push(`Joined ${def.label} jackpot with ${formatPlayCash(bet, ledger)}.`, "success");
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
    push(`Bot joined with ${formatPlayCash(you!.amount, ledger)}.`, "info");
  }

  async function handleSpin() {
    if (spinLock.current) return;
    const live = useJackpotStore.getState().tables[ledger][potId];
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
    setPointerId(null);
  }, [pot.phase, potId]);

  function handleFinished() {
    const current = useJackpotStore.getState().tables[ledger][potId];
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
      creditLedger(livePayout, ledger);
      recordRound(me.amount, livePayout, "jackpot", ledger);
      push(`You won the jackpot! +${formatPlayCash(livePayout, ledger)} after 9% house edge.`, "success");
    } else {
      recordRound(me.amount, 0, "jackpot", ledger);
      push(`${winner.name} took the pot. House kept ${formatPlayCash(liveTotal - livePayout, ledger)}.`, "info");
    }
  }

  const winner = pot.winnerId ? pot.entries.find((e) => e.id === pot.winnerId) : undefined;
  const locked = pot.phase === "spinning";

  return (
    <div className="space-y-5">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(260px,28%)_minmax(0,1fr)]">
        <div className="surface flex min-h-0 flex-col p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-white">Jackpot</h1>
            <InfoButton title="Jackpot — RTP & House Edge">
              <StatRow label="House edge" value={formatPercent(JACKPOT_HOUSE_EDGE)} />
              <StatRow label="Winner payout" value="91% of the pot" />
              <StatRow label="RTP" value={formatPercent(1 - JACKPOT_HOUSE_EDGE)} />
              <p>Four pots. Unlimited starts at 50,000 with no ceiling. Bots match your bet. The wheel is weighted by each player’s share.</p>
            </InfoButton>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {JACKPOT_POTS.map((p) => {
              const live = potTotal(tables[p.id].entries);
              const on = potId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (locked) return;
                    switchPot(p.id);
                  }}
                  disabled={locked && p.id !== potId}
                  className={clsx(
                    "rounded-lg px-2.5 py-2 text-left ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    on ? "bg-cyan-400/15 ring-cyan-300/55" : "bg-bg-900 ring-white/10 hover:bg-bg-700",
                  )}
                >
                  <p className="text-xs font-extrabold uppercase tracking-wide text-white">{p.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{potRangeLabel(p.id, unit)}</p>
                  {live > 0 ? (
                    <p className="mt-1 font-mono text-[10px] text-cyan-200">
                      <CashAmount wl={live} currency={ledger} iconClassName="h-2.5 w-2.5" />
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {pot.phase === "open" && !you && (
            <>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Your bet{unbounded ? " · no max" : ""}
              </label>
              <div className="mb-3 flex items-center gap-2">
                <LockAmountInput
                  valueWl={amount}
                  onChangeWl={setBet}
                  minWl={def.min}
                  maxWl={def.max}
                  className="min-w-0 flex-1"
                  inputClassName="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    setBet(Math.floor(amount / 2));
                  }}
                  className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700"
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    setBet(amount * 2);
                  }}
                  className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700"
                >
                  2×
                </button>
              </div>
              <input
                type="range"
                min={def.min}
                max={sliderMax}
                value={sliderValue}
                onChange={(e) => setBet(Number(e.target.value))}
                className="jackpot-bet-slider mb-3 w-full"
              />
              {unbounded && amount > UNLIMITED_SLIDER_MAX ? (
                <p className="mb-2 text-[10px] text-slate-500">Slider caps at 10M — type any amount above that.</p>
              ) : null}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {jackpotPresets(potId).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      sound.click();
                      setBet(v);
                    }}
                    className={clsx(
                      "rounded-md px-2 py-1 text-[11px] font-semibold ring-1 hover:bg-white/5",
                      amount === v ? "bg-cyan-400/15 text-cyan-100 ring-cyan-300/40" : "text-slate-300 ring-white/10",
                    )}
                  >
                    <CashAmount wl={v} currency={ledger} iconClassName="h-3 w-3" />
                  </button>
                ))}
                {unbounded && wallet >= def.min ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      setBet(wallet);
                    }}
                    className="rounded-md px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-100 ring-1 ring-amber-300/35 hover:bg-amber-400/10"
                  >
                    Max
                  </button>
                ) : null}
              </div>
              <button type="button" onClick={handleJoin} className="btn-cyan w-full py-3 text-sm font-extrabold uppercase tracking-wide">
                Join · <CashAmount wl={clampJackpotBet(amount, potId)} currency={ledger} iconClassName="h-4 w-4" />
              </button>
            </>
          )}

          {pot.phase === "open" && you && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                You’re in for{" "}
                <CashAmount
                  wl={you.amount}
                  currency={ledger}
                  className="font-semibold text-white"
                  iconClassName="h-3.5 w-3.5"
                />
                .
              </p>
              <button
                type="button"
                onClick={handleCallBot}
                disabled={pot.entries.length >= 10 || botCount >= JACKPOT_MAX_BOTS}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/5 disabled:opacity-40"
              >
                <Bot className="h-4 w-4" /> Call Bot
                <span className="text-xs font-medium text-slate-400">
                  ({botCount}/{JACKPOT_MAX_BOTS})
                </span>
              </button>
              <p className="text-center text-[11px] text-slate-500">
                {countdownLeft != null
                  ? `More players can still join. Spins in ${countdownLeft}s.`
                  : "Call a bot (or wait). Countdown starts at 2+ players."}
              </p>
            </div>
          )}

          {pot.phase === "spinning" && (
            <p className="py-4 text-center text-sm text-slate-300">
              {pointerId ? (
                <>
                  Pointer on{" "}
                  <span className="font-semibold text-white">
                    {pot.entries.find((e) => e.id === pointerId)?.name ?? "…"}
                  </span>
                </>
              ) : (
                "Wheel is spinning…"
              )}
            </p>
          )}

          {pot.phase === "finished" && (
            <div className="space-y-3">
              {winner ? (
                <p className="text-center text-sm text-slate-300">
                  <span className="font-semibold text-amber-200">{winner.name}</span> took{" "}
                  <CashAmount wl={payout} currency={ledger} className="font-semibold text-white" iconClassName="h-3.5 w-3.5" />
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  resetPot(potId);
                }}
                className="btn-cyan w-full py-3 text-sm font-extrabold uppercase tracking-wide"
              >
                New round
              </button>
            </div>
          )}
        </div>

        <div className="surface relative flex min-h-0 flex-col overflow-hidden p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <AnimatedPot value={total} label={`${def.label} pot`} size="lg" currency={ledger} />
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Pays</p>
              <p className="font-mono text-sm text-cyan-200">
                <CashAmount wl={payout} currency={ledger} iconClassName="h-3.5 w-3.5" />
              </p>
            </div>
          </div>

          <JackpotCircleWheel
            tickets={tickets}
            spinToken={pot.spinToken}
            winnerId={pot.winnerId}
            shouldSpin={pot.phase === "spinning"}
            countdown={pot.phase === "open" ? countdownLeft : null}
            countdownEndsAt={pot.phase === "open" ? pot.countdownEndsAt : null}
            onFinished={handleFinished}
            onPointerChange={setPointerId}
          />

          <ul className="mt-5 space-y-1.5">
            {ranked.length === 0 ? (
              <li className="py-4 text-center text-xs text-slate-500">No players yet. Join to open this pot.</li>
            ) : (
              ranked.map((e) => {
                const pct = total > 0 ? (e.amount / total) * 100 : 0;
                const hot = pointerId === e.id || (pot.phase === "finished" && pot.winnerId === e.id);
                const won = pot.phase === "finished" && pot.winnerId === e.id;
                return (
                  <li
                    key={e.id}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 ring-1 transition-colors",
                      won
                        ? "bg-amber-400/10 ring-amber-300/35"
                        : hot
                          ? "bg-white/[0.06] ring-white/20"
                          : e.kind === "you"
                            ? "bg-cyan-400/8 ring-cyan-400/20"
                            : "bg-black/20 ring-white/5",
                    )}
                  >
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: e.color }} />
                    <PlayerTag
                      name={e.name}
                      you={e.kind === "you"}
                      color={e.color}
                      size={24}
                      kind={e.kind === "you" ? "you" : e.kind === "bot" ? "bot" : "player"}
                      className="min-w-0 flex-1"
                      nameClassName="text-sm font-medium text-white"
                    />
                    {e.kind === "bot" ? <span className="shrink-0 text-[10px] uppercase text-slate-500">bot</span> : null}
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm text-slate-200">
                        <CashAmount wl={e.amount} currency={ledger} iconClassName="h-3.5 w-3.5" />
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">{pct.toFixed(1)}%</p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">SeedBET Originals</p>
            <WinLeaderStageMark game="jackpot" inline />
          </div>
        </div>
      </div>

      <ProvablyFairPanel />
    </div>
  );
}
