import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check } from "lucide-react";
import { clsx } from "clsx";
import { JackpotCircleWheel } from "../components/jackpot/JackpotCircleWheel";
import { JackpotPlayerList } from "../components/jackpot/JackpotPlayerList";
import type { JackpotTicket } from "../components/battles/JackpotWheel";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import {
  JACKPOT_COUNTDOWN_MS,
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
  const table = useJackpotStore((s) => s.tables[ledger]);
  const pot = table[potId];
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
  const [pointer, setPointer] = useState<{ playerId: string; name: string } | null>(null);
  const spinLock = useRef(false);
  const lastBeep = useRef<number | null>(null);
  const avatars = useIdentityStore((s) => s.avatars);
  const avatarFor = useIdentityStore((s) => s.avatarFor);

  const total = potTotal(pot.entries);
  const you = youEntry(pot.entries);
  const payout = Math.round(total * (1 - JACKPOT_HOUSE_EDGE));
  const winner = pot.winnerId ? pot.entries.find((e) => e.id === pot.winnerId) : undefined;
  const countdownLeft =
    pot.phase === "open" && pot.countdownEndsAt
      ? Math.max(0, Math.ceil((pot.countdownEndsAt - now) / 1000))
      : null;
  const countdownProgress =
    pot.phase === "open" && pot.countdownEndsAt
      ? Math.min(1, Math.max(0, (pot.countdownEndsAt - now) / JACKPOT_COUNTDOWN_MS))
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
    let nextWinner = live.entries[live.entries.length - 1];
    for (const e of live.entries) {
      acc += e.amount / liveTotal;
      if (roll < acc) {
        nextWinner = e;
        break;
      }
    }
    if (!beginSpin(potId, nextWinner.id)) spinLock.current = false;
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
    if (pot.phase !== "spinning") setPointer(null);
  }, [pot.phase, potId]);

  function handleFinished() {
    const current = useJackpotStore.getState().tables[ledger][potId];
    if (current.phase !== "spinning") return;
    const roundWinner = current.entries.find((e) => e.id === current.winnerId);
    const me = youEntry(current.entries);
    const liveTotal = potTotal(current.entries);
    const livePayout = Math.round(liveTotal * (1 - JACKPOT_HOUSE_EDGE));
    finishSpin(potId);
    if (roundWinner && roundWinner.amount > 0 && livePayout > 0) {
      considerWinLeader("jackpot", {
        name: roundWinner.name,
        isYou: roundWinner.kind === "you",
        multiplier: livePayout / roundWinner.amount,
      });
    }
    if (!roundWinner || !me) return;
    if (roundWinner.kind === "you") {
      creditLedger(livePayout, ledger);
      recordRound(me.amount, livePayout, "jackpot", ledger);
      push(`You won the jackpot! +${formatPlayCash(livePayout, ledger)} after 9% house edge.`, "success");
    } else {
      recordRound(me.amount, 0, "jackpot", ledger);
      push(`${roundWinner.name} took the pot. House kept ${formatPlayCash(liveTotal - livePayout, ledger)}.`, "info");
    }
  }

  const sliderMax = unbounded ? UNLIMITED_SLIDER_MAX : def.max;
  const sliderValue = Math.min(sliderMax, Math.max(def.min, amount));
  const sliderPct = sliderMax === def.min ? 1 : (sliderValue - def.min) / (sliderMax - def.min);
  const unit = ledger === "shards" ? "Shards" : "WL";
  const youPct = you && total > 0 ? (you.amount / total) * 100 : 0;
  const listActiveId = pot.phase === "spinning" ? pointer?.playerId ?? null : null;
  const listWinnerId = pot.phase === "finished" ? pot.winnerId : null;

  return (
    <div className="space-y-5">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(260px,28%)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-3">
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

            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-black/35 p-1">
              {JACKPOT_POTS.map((p) => {
                const row = table[p.id];
                const live = potTotal(row.entries);
                const selected = potId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (pot.phase === "spinning") return;
                      switchPot(p.id);
                    }}
                    disabled={pot.phase === "spinning" && p.id !== potId}
                    className={clsx(
                      "rounded-md px-2 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      selected ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold uppercase tracking-wide">{p.label}</span>
                      {row.phase === "spinning" ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                      ) : live > 0 ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                      {potRangeLabel(p.id, unit)}
                    </span>
                    {live > 0 ? (
                      <span className="mt-0.5 inline-flex items-center text-[10px] font-semibold text-cyan-200/90">
                        <CashAmount wl={live} currency={ledger} iconClassName="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {pot.phase === "open" && !you && (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Your bet{unbounded ? " · no max" : ""}
                  </span>
                  <div className="flex items-center gap-2">
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
                </label>
                <div className="relative h-8">
                  <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-700 to-cyan-300"
                      style={{ width: `${Math.max(4, sliderPct * 100)}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={def.min}
                    max={sliderMax}
                    value={sliderValue}
                    onChange={(e) => setBet(Number(e.target.value))}
                    className="jackpot-bet-slider absolute inset-0 w-full"
                    aria-label="Bet amount"
                  />
                </div>
                {unbounded && amount > UNLIMITED_SLIDER_MAX ? (
                  <p className="text-[10px] text-slate-500">Slider caps at 10M — type any amount above that.</p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {jackpotPresets(potId).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        sound.click();
                        setBet(v);
                      }}
                      className={clsx(
                        "flex-1 rounded-md py-1.5 text-[11px] font-semibold ring-1 transition-colors",
                        amount === v
                          ? "bg-cyan-400/15 text-cyan-100 ring-cyan-400/40"
                          : "bg-bg-900 text-slate-300 ring-white/10 hover:bg-bg-700",
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
                      className="rounded-md px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-100 ring-1 ring-amber-300/35 hover:bg-amber-400/10"
                    >
                      Max
                    </button>
                  ) : null}
                </div>
                <button type="button" onClick={handleJoin} className="btn-cyan w-full py-3 text-sm">
                  Join · <CashAmount wl={clampJackpotBet(amount, potId)} currency={ledger} iconClassName="h-4 w-4" />
                </button>
              </div>
            )}

            {pot.phase === "open" && you && (
              <div className="space-y-3">
                <div className="rounded-lg bg-cyan-400/[0.08] px-3 py-3 ring-1 ring-cyan-400/25">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                    <Check className="h-3.5 w-3.5" /> You’re in
                  </p>
                  <p className="mt-1.5 text-sm text-white">
                    <CashAmount
                      wl={you.amount}
                      currency={ledger}
                      className="font-semibold"
                      iconClassName="h-4 w-4"
                    />
                    <span className="ml-1.5 font-mono text-xs text-slate-400">{youPct.toFixed(1)}%</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCallBot}
                  disabled={pot.entries.length >= 10 || botCount >= JACKPOT_MAX_BOTS}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-bg-900 py-2.5 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-40"
                >
                  <Bot className="h-4 w-4 text-cyan-300" /> Call Bot ·{" "}
                  <CashAmount wl={you.amount} currency={ledger} iconClassName="h-3.5 w-3.5" />
                  <span className="text-xs font-medium text-slate-400">
                    ({botCount}/{JACKPOT_MAX_BOTS})
                  </span>
                </button>
                {countdownLeft != null ? (
                  <p className="text-center text-xs text-slate-400">
                    Spins in <span className="font-mono font-bold text-white">{countdownLeft}s</span>
                  </p>
                ) : (
                  <p className="text-center text-[11px] text-slate-500">
                    Call a bot — countdown starts at 2+ players.
                  </p>
                )}
              </div>
            )}

            {pot.phase === "spinning" && (
              <div className="py-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Spinning</p>
                <p className="mt-1.5 text-sm font-semibold text-white">{pointer?.name ?? "…"}</p>
              </div>
            )}

            {pot.phase === "finished" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-amber-400/[0.08] px-3 py-3 text-center ring-1 ring-amber-400/25">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Winner</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{winner?.name ?? "—"}</p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Paid <CashAmount wl={payout} currency={ledger} iconClassName="h-3.5 w-3.5" /> after 9% edge
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    resetPot(potId);
                  }}
                  className="btn-cyan w-full py-3 text-sm"
                >
                  New round
                </button>
              </div>
            )}
          </div>

          <ProvablyFairPanel compact />
        </div>

        <div className="surface relative flex min-h-0 flex-col overflow-hidden p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide text-white">{def.label}</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                {pot.entries.length} {pot.entries.length === 1 ? "player" : "players"}
                {total > 0 ? " · 91% payout" : ""}
              </p>
            </div>
            <WinLeaderStageMark game="jackpot" inline />
          </div>

          <div className="flex flex-col items-stretch gap-5 xl:flex-row xl:items-start">
            <div className="mx-auto w-full max-w-lg shrink-0 pt-2">
              <JackpotCircleWheel
                tickets={tickets}
                spinToken={pot.spinToken}
                winnerId={pot.winnerId}
                shouldSpin={pot.phase === "spinning"}
                countdown={pot.phase === "open" ? countdownLeft : null}
                countdownProgress={countdownProgress}
                potValue={total}
                potLabel={`${def.label} pot`}
                currency={ledger}
                pointerName={pointer?.name ?? null}
                onPointerChange={setPointer}
                onFinished={handleFinished}
              />
            </div>
            <div className="min-w-0 flex-1 xl:pt-2">
              <JackpotPlayerList
                entries={pot.entries}
                total={total}
                currency={ledger}
                activeId={listActiveId}
                winnerId={listWinnerId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
