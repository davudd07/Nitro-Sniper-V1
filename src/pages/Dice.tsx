import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, Dices, Percent } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { sound } from "../lib/sound";
import { formatCash, formatPercent } from "../lib/format";
import { LockAmountInput } from "../components/ui/LockAmountInput";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { DemoBetBadge } from "../components/ui/DemoBetBadge";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { WinLeaderStageMark } from "../components/layout/WinLeaderBadge";
import { considerWinLeader, localWinName } from "../store/winLeaderStore";
import { HOUSE_EDGE } from "../lib/rakeback";
import { takeStake } from "../lib/stake";
import {
  DICE_HOUSE_EDGE,
  DICE_MAX_CHANCE,
  DICE_MAX_MULTI,
  DICE_MAX_ROLL,
  DICE_MIN_CHANCE,
  DICE_MIN_ROLL,
  DICE_RTP,
  chanceFromMultiplier,
  chanceFromTarget,
  clampChance,
  clampTarget,
  dicePayout,
  diceWon,
  formatDiceMulti,
  multiplierFromChance,
  rollDice,
  roundDice,
  targetFromChance,
  type DiceCondition,
} from "../lib/dice";

type Mode = "manual" | "auto";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function Dice() {
  const [bet, setBet] = useState(100);
  const [mode, setMode] = useState<Mode>("manual");
  const [condition, setCondition] = useState<DiceCondition>("under");
  const [chance, setChance] = useState(50);
  const [busy, setBusy] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoLimit, setAutoLimit] = useState(10);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [history, setHistory] = useState<{ roll: number; won: boolean }[]>([]);
  const [rollingDisplay, setRollingDisplay] = useState<number | null>(null);

  const autoStop = useRef(false);
  const rollingRef = useRef(false);
  const autoRunningRef = useRef(false);

  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const multi = multiplierFromChance(chance);
  const target = targetFromChance(chance, condition);
  const payout = dicePayout(bet, chance);
  const sliderPct = ((target - DICE_MIN_ROLL) / (DICE_MAX_ROLL - DICE_MIN_ROLL)) * 100;
  const winLeft = condition === "under";

  const status = useMemo(() => {
    if (autoRunning) return "Auto running…";
    if (busy) return "Rolling…";
    if (lastRoll == null) return `Roll ${condition} ${target.toFixed(2)}`;
    return lastWon
      ? `${lastRoll.toFixed(2)} · win ${formatDiceMulti(multi)}×`
      : `${lastRoll.toFixed(2)} · miss`;
  }, [autoRunning, busy, lastRoll, lastWon, condition, target, multi]);

  function applyChance(next: number) {
    setChance(clampChance(next));
  }

  function applyTarget(next: number) {
    applyChance(chanceFromTarget(next, condition));
  }

  function applyMulti(next: number) {
    applyChance(chanceFromMultiplier(next));
  }

  function swapCondition() {
    if (rollingRef.current || autoRunningRef.current) return;
    sound.click();
    setCondition((c) => (c === "under" ? "over" : "under"));
  }

  async function rollOnce(): Promise<"win" | "lose" | "blocked"> {
    if (rollingRef.current) return "blocked";
    if (bet < 0) return "blocked";
    if (!takeStake(bet, HOUSE_EDGE.dice)) {
      if (bet > 0) push(`You need ${formatCash(bet)} to roll.`, "danger");
      return "blocked";
    }
    rollingRef.current = true;
    const isAuto = autoRunningRef.current;
    setBusy(true);
    try {
      const [float] = await play(1);
      const roll = rollDice(float ?? 0);
      const threshold = targetFromChance(chance, condition);
      const won = diceWon(roll, threshold, condition);
      const paid = won ? dicePayout(bet, chance) : 0;

      setRollingDisplay(roundDice(10 + Math.random() * 90));
      sound.click();
      await sleep(isAuto ? 90 : 280);
      setRollingDisplay(null);
      setLastRoll(roll);
      setLastWon(won);
      setHistory((h) => [{ roll, won }, ...h].slice(0, 16));

      if (won) {
        if (paid > 0) credit(paid);
        recordRound(bet, paid, "dice");
        considerWinLeader("dice", { name: localWinName(), multiplier: multi, isYou: true });
        sound.win(multi >= 10 ? "big" : "small");
        if (!isAuto) {
          push(bet > 0 ? `Rolled ${roll.toFixed(2)} — +${formatCash(paid)}.` : `Demo · rolled ${roll.toFixed(2)} (no stake).`, "success");
        }
      } else {
        recordRound(bet, 0, "dice");
        sound.lose();
        if (!isAuto && bet <= 0) push(`Demo · rolled ${roll.toFixed(2)} — miss.`, "info");
      }
      return won ? "win" : "lose";
    } finally {
      rollingRef.current = false;
      setBusy(false);
    }
  }

  async function runAuto() {
    if (autoRunningRef.current) return;
    autoStop.current = false;
    autoRunningRef.current = true;
    setAutoRunning(true);
    const max = autoLimit <= 0 ? 200 : Math.min(200, Math.max(1, autoLimit));
    try {
      for (let i = 0; i < max; i++) {
        if (autoStop.current) break;
        const outcome = await rollOnce();
        if (outcome === "blocked") break;
        await sleep(70);
      }
    } finally {
      autoRunningRef.current = false;
      setAutoRunning(false);
    }
  }

  function onPrimary() {
    if (mode === "auto") {
      if (autoRunningRef.current) {
        autoStop.current = true;
        return;
      }
      void runAuto();
      return;
    }
    void rollOnce();
  }

  const locked = busy || autoRunning;
  const shownRoll = rollingDisplay ?? lastRoll;
  const primaryLabel = autoRunning
    ? "Stop auto"
    : mode === "auto"
      ? "Start auto"
      : busy
        ? "Rolling…"
        : bet > 0
          ? "Bet"
          : "Demo roll";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dice</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Provably fair roll from {DICE_MIN_ROLL.toFixed(1)} to {DICE_MAX_ROLL.toFixed(0)} (two decimals). 96% RTP, max{" "}
            {DICE_MAX_MULTI}×.
          </p>
        </div>
        <InfoButton title="Dice — RTP & House Edge">
          <StatRow label="RTP" value={formatPercent(DICE_RTP)} />
          <StatRow label="House edge" value={formatPercent(DICE_HOUSE_EDGE)} />
          <StatRow label="Max multiplier" value={`${DICE_MAX_MULTI}×`} />
          <StatRow label="Win chance range" value={`${DICE_MIN_CHANCE.toFixed(1)}% – ${DICE_MAX_CHANCE}%`} />
          <p>
            Multiplier = {formatPercent(DICE_RTP, 0)} ÷ win chance. Roll under / over a target; a win pays the theoretical
            edge, not player losses. Bet 0 is a demo roll.
          </p>
        </InfoButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="surface p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-black/35 p-1">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={autoRunning}
                onClick={() => {
                  sound.click();
                  setMode(m);
                }}
                className={clsx(
                  "rounded-md py-1.5 text-xs font-extrabold uppercase tracking-wide disabled:opacity-50",
                  mode === m ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-white",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Bet amount</label>
          <div className="mb-3 flex items-center gap-2">
            <LockAmountInput
              valueWl={bet}
              onChangeWl={(wl) => setBet(Math.max(0, wl))}
              disabled={locked}
              className="min-w-0 flex-1"
              inputClassName="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={locked}
              onClick={() => setBet((b) => Math.max(0, Math.floor(b / 2)))}
              className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              ½
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => setBet((b) => b * 2)}
              className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              2×
            </button>
          </div>

          {mode === "auto" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Number of bets
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={autoLimit}
                disabled={autoRunning}
                onChange={(e) => setAutoLimit(Math.min(200, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full rounded-lg bg-bg-900 px-3 py-2 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
              />
              <p className="mt-1 text-[11px] text-slate-500">Runs this many rolls, or until balance runs out.</p>
            </div>
          )}

          <button type="button" onClick={onPrimary} disabled={mode === "manual" && busy} className="btn-cyan w-full py-3 disabled:opacity-50">
            {primaryLabel}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            Pays {bet > 0 ? formatCash(payout) : "nothing (demo)"} at {formatDiceMulti(multi)}×
          </p>
          <DemoBetBadge active={bet <= 0} className="mt-2" />
        </div>

        <div className="relative surface space-y-8 overflow-hidden p-5 pb-12 sm:p-8">
          <WinLeaderStageMark game="dice" />
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-300">
            <Dices className="h-4 w-4 text-cyan-300" />
            {status}
          </div>

          <div className="relative mx-auto max-w-3xl px-2 pt-8">
            {history.slice(0, 10).map((h, i) => {
              const left = ((h.roll - DICE_MIN_ROLL) / (DICE_MAX_ROLL - DICE_MIN_ROLL)) * 100;
              return (
                <span
                  key={`${h.roll}-${i}`}
                  title={`${h.roll.toFixed(2)} · ${h.won ? "win" : "miss"}`}
                  className={clsx(
                    "pointer-events-none absolute -top-1 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] border",
                    h.won ? "border-emerald-200 bg-emerald-400" : "border-rose-200 bg-rose-500",
                    i === 0 && lastRoll != null && "h-3.5 w-3.5 ring-2 ring-white",
                  )}
                  style={{ left: `${left}%` }}
                />
              );
            })}

            <div className="relative h-4 overflow-hidden rounded-full shadow-[inset_0_1px_4px_rgba(0,0,0,0.65)]">
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${sliderPct}%`,
                  background: winLeft
                    ? "linear-gradient(90deg, #16a34a, #4ade80)"
                    : "linear-gradient(90deg, #e11d48, #fb7185)",
                }}
              />
              <div
                className="absolute inset-y-0 right-0"
                style={{
                  width: `${100 - sliderPct}%`,
                  background: winLeft
                    ? "linear-gradient(90deg, #fb7185, #e11d48)"
                    : "linear-gradient(90deg, #4ade80, #16a34a)",
                }}
              />
            </div>
            <input
              type="range"
              min={DICE_MIN_ROLL}
              max={99.9}
              step={0.01}
              disabled={locked}
              value={clampTarget(target, condition)}
              onChange={(e) => applyTarget(Number(e.target.value))}
              className="dice-slider absolute inset-x-0 -top-1 h-6 w-full cursor-pointer disabled:cursor-not-allowed"
              aria-label="Roll target"
            />

            {shownRoll != null && (
              <div
                className={clsx(
                  "pointer-events-none absolute -bottom-8 -translate-x-1/2 font-mono text-sm font-black tabular-nums",
                  lastWon ? "text-emerald-300" : lastWon === false ? "text-rose-300" : "text-white",
                )}
                style={{
                  left: `${((shownRoll - DICE_MIN_ROLL) / (DICE_MAX_ROLL - DICE_MIN_ROLL)) * 100}%`,
                }}
              >
                {shownRoll.toFixed(2)}
              </div>
            )}
          </div>

          <div className="mx-auto grid max-w-3xl gap-2 pt-6 sm:grid-cols-3">
            <StatField
              label="Multiplier"
              value={formatDiceMulti(multi)}
              icon={<span className="text-xs font-black text-slate-400">×</span>}
              disabled={locked}
              onChange={(raw) => applyMulti(Number(raw))}
            />
            <StatField
              label={condition === "under" ? "Roll under" : "Roll over"}
              value={target.toFixed(2)}
              icon={
                <button
                  type="button"
                  disabled={locked}
                  onClick={swapCondition}
                  className="grid h-7 w-7 place-items-center rounded-md text-cyan-200 hover:bg-white/10 disabled:opacity-40"
                  title="Swap under / over"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
              }
              disabled={locked}
              onChange={(raw) => applyTarget(Number(raw))}
            />
            <StatField
              label="Win chance"
              value={chance.toFixed(2)}
              icon={<Percent className="h-3.5 w-3.5 text-slate-400" />}
              disabled={locked}
              onChange={(raw) => applyChance(Number(raw))}
            />
          </div>
        </div>
      </div>

      <ProvablyFairPanel />
    </div>
  );
}

function StatField({
  label,
  value,
  icon,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  disabled: boolean;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="rounded-xl border-2 border-white/10 bg-black/30 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-mono text-lg font-bold text-white outline-none disabled:opacity-50"
        />
        {icon}
      </span>
    </label>
  );
}
