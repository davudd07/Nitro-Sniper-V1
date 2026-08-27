import { useMemo, useRef, useState } from "react";
import { Hash, ShieldCheck, Zap } from "lucide-react";
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
import {
  KENO_BALLS,
  KENO_DRAWN,
  KENO_MAX_SPOTS,
  KENO_RISKS,
  KENO_RISK_LABEL,
  KENO_TOP_ODDS,
  drawKeno,
  kenoCatches,
  kenoMultiplier,
  kenoPayout,
  paytableRows,
  quickPick,
  type KenoRisk,
} from "../lib/keno";
import { takeStake } from "../lib/stake";
import { HOUSE_EDGE } from "../lib/rakeback";

const RTP = 0.94;
const BALLS = Array.from({ length: KENO_BALLS }, (_, i) => i + 1);

type Mode = "manual" | "auto";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function Keno() {
  const [picks, setPicks] = useState<number[]>([]);
  const [bet, setBet] = useState(100);
  const [mode, setMode] = useState<Mode>("manual");
  const [fast, setFast] = useState(false);
  const [risk, setRisk] = useState<KenoRisk>("medium");
  const [drawing, setDrawing] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoLimit, setAutoLimit] = useState(10);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [lastCatches, setLastCatches] = useState<number | null>(null);

  const autoStop = useRef(false);
  const drawingRef = useRef(false);
  const autoRunningRef = useRef(false);
  const picksRef = useRef(picks);
  picksRef.current = picks;
  const betRef = useRef(bet);
  betRef.current = bet;
  const riskRef = useRef(risk);
  riskRef.current = risk;
  const fastRef = useRef(fast);
  fastRef.current = fast;

  const credit = useEconomyStore((s) => s.payout);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const spots = picks.length;
  const rows = useMemo(() => paytableRows(spots, risk), [spots, risk]);
  const liveCatches = kenoCatches(picks, revealed);
  const highlightCatches = drawing || revealed.length === KENO_DRAWN ? liveCatches : null;
  const drawnSet = new Set(revealed);
  const pickSet = new Set(picks);
  const locked = drawing || autoRunning;

  function toggle(n: number) {
    if (locked) return;
    setRevealed([]);
    setLastCatches(null);
    setPicks((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= KENO_MAX_SPOTS) {
        push(`Pick up to ${KENO_MAX_SPOTS} numbers.`, "warning");
        return prev;
      }
      sound.click();
      return [...prev, n].sort((a, b) => a - b);
    });
  }

  function clearPicks() {
    if (locked) return;
    sound.click();
    setPicks([]);
    setRevealed([]);
    setLastCatches(null);
  }

  function doQuickPick() {
    if (locked) return;
    sound.click();
    setPicks(quickPick(KENO_MAX_SPOTS));
    setRevealed([]);
    setLastCatches(null);
  }

  async function playRound(): Promise<"win" | "lose" | "blocked"> {
    if (drawingRef.current) return "blocked";
    const card = picksRef.current;
    const stake = Math.max(0, betRef.current);
    const riskNow = riskRef.current;
    if (card.length < 1) {
      push("Select 1–10 numbers to play.", "warning");
      return "blocked";
    }
    if (!takeStake(stake, HOUSE_EDGE.keno)) {
      if (stake > 0) push(`You need ${formatCash(stake)} to play.`, "danger");
      return "blocked";
    }

    drawingRef.current = true;
    const isAuto = autoRunningRef.current;
    setDrawing(true);
    setRevealed([]);
    setLastCatches(null);
    if (stake > 0) sound.chip();

    try {
      const rolls = await play(KENO_BALLS);
      const nextDrawn = drawKeno(rolls);
      const step = fastRef.current ? (isAuto ? 18 : 40) : isAuto ? 70 : 160;

      if (fastRef.current && !isAuto) {
        setRevealed(nextDrawn);
        sound.tick(1);
        await sleep(220);
      } else {
        const shown: number[] = [];
        for (const n of nextDrawn) {
          shown.push(n);
          setRevealed([...shown]);
          sound.tick(shown.length / KENO_DRAWN);
          await sleep(step);
        }
      }

      const catches = kenoCatches(card, nextDrawn);
      const payout = kenoPayout(stake, card.length, catches, riskNow);
      const multi = kenoMultiplier(card.length, catches, riskNow);
      setLastCatches(catches);
      recordRound(stake, payout, "keno");
      if (payout > 0) {
        setLastWin(payout);
        if (stake > 0) credit(payout);
        if (stake > 0 && multi >= 10) {
          considerWinLeader("keno", { name: localWinName(), multiplier: multi, isYou: true });
        }
        sound.win(multi >= 50 ? "big" : "small");
        if (!isAuto) {
          push(
            stake > 0
              ? `Caught ${catches}/${card.length} — +${formatCash(payout)}.`
              : `Demo · caught ${catches}/${card.length} (${multi}×).`,
            "success",
          );
        }
        return "win";
      }
      sound.lose();
      if (!isAuto && stake <= 0) push(`Demo · caught ${catches}/${card.length} — miss.`, "info");
      return "lose";
    } finally {
      drawingRef.current = false;
      setDrawing(false);
    }
  }

  async function runAuto() {
    if (autoRunningRef.current) return;
    if (picksRef.current.length < 1) {
      push("Select 1–10 numbers to play.", "warning");
      return;
    }
    autoStop.current = false;
    autoRunningRef.current = true;
    setAutoRunning(true);
    const max = autoLimit <= 0 ? 200 : Math.min(200, Math.max(1, autoLimit));
    try {
      for (let i = 0; i < max; i++) {
        if (autoStop.current) break;
        const outcome = await playRound();
        if (outcome === "blocked") break;
        await sleep(fastRef.current ? 30 : 80);
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
    void playRound();
  }

  const primaryLabel = autoRunning
    ? "Stop auto"
    : mode === "auto"
      ? "Start auto"
      : drawing
        ? "Drawing…"
        : bet > 0
          ? "Bet"
          : "Demo play";

  const status =
    autoRunning
      ? "Auto running…"
      : drawing
        ? `Drawing ${revealed.length}/${KENO_DRAWN}`
        : lastCatches != null
          ? `Caught ${lastCatches} of ${spots}`
          : "Select 1–10 numbers to play";

  const riskIndex = KENO_RISKS.indexOf(risk);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Keno</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Pick 1–{KENO_MAX_SPOTS} numbers on a {KENO_BALLS}-spot card. {KENO_DRAWN} are drawn. {formatPercent(RTP)} RTP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WinLeaderStageMark game="keno" inline />
          <InfoButton title="Keno — RTP & House Edge">
            <StatRow label="Target RTP" value={formatPercent(RTP)} />
            <StatRow label="House edge" value={formatPercent(1 - RTP)} />
            <StatRow label="Field" value={`${KENO_BALLS} numbers`} />
            <StatRow label="Draw" value={`${KENO_DRAWN} unique balls`} />
            <p>
              Risk changes the catch table. Low pays more often for less. High pays rarely for more. Unlisted catch
              counts pay 0. Hitting every spot on a 10-spot medium card is {KENO_TOP_ODDS[10]}.
            </p>
          </InfoButton>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="surface p-5">
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-black/35 p-1">
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

          <button
            type="button"
            disabled={autoRunning}
            onClick={() => {
              sound.click();
              setFast((v) => !v);
            }}
            className={clsx(
              "mb-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-extrabold uppercase tracking-wide ring-1 transition-colors disabled:opacity-50",
              fast
                ? "bg-cyan-400/20 text-cyan-100 ring-cyan-300/50"
                : "bg-black/30 text-slate-400 ring-white/10 hover:text-white",
            )}
          >
            <Zap className={clsx("h-3.5 w-3.5", fast && "fill-cyan-300 text-cyan-200")} />
            Fast mode {fast ? "on" : "off"}
          </button>

          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Bet amount</label>
          <div className="mb-4 flex items-center gap-2">
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

          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <span>Risk</span>
              <span className="font-bold text-cyan-200">{KENO_RISK_LABEL[risk]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              disabled={locked}
              value={riskIndex < 0 ? 1 : riskIndex}
              onChange={(e) => {
                const next = KENO_RISKS[Number(e.target.value)] ?? "medium";
                setRisk(next);
              }}
              className="keno-risk-slider w-full disabled:opacity-50"
            />
            <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
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
              <p className="mt-1 text-[11px] text-slate-500">Keeps your picks and redraws this many times.</p>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={doQuickPick}
              className="rounded-xl bg-bg-900 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-40"
            >
              Select random
            </button>
            <button
              type="button"
              disabled={locked || picks.length === 0}
              onClick={clearPicks}
              className="rounded-xl bg-bg-900 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-40"
            >
              Clear tiles
            </button>
          </div>

          <button type="button" onClick={onPrimary} disabled={mode === "manual" && drawing} className="btn-cyan w-full py-3 disabled:opacity-50">
            {primaryLabel}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            {spots < 1
              ? "Pick numbers to see the catch table."
              : lastWin > 0
                ? `Last win ${formatCash(lastWin)}`
                : `${spots} spot${spots === 1 ? "" : "s"} · ${KENO_RISK_LABEL[risk]} risk`}
          </p>
          <DemoBetBadge active={bet <= 0} className="mt-2" />
        </div>

        <div className="surface flex min-w-0 flex-col overflow-hidden p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-slate-300">
            <Hash className="h-4 w-4 text-cyan-300" />
            {status}
          </div>

          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {BALLS.map((n) => {
              const selected = pickSet.has(n);
              const isDrawn = drawnSet.has(n);
              const hit = selected && isDrawn;
              const drawnMiss = !selected && isDrawn;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={locked}
                  onClick={() => toggle(n)}
                  className={clsx(
                    "aspect-square rounded-lg text-sm font-bold tabular-nums transition-all duration-150 ring-1 disabled:cursor-default sm:rounded-xl sm:text-base",
                    hit && "bg-emerald-500 text-white ring-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.45)]",
                    drawnMiss && "bg-rose-500 text-white ring-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.35)]",
                    selected && !hit && "bg-cyan-400/25 text-white ring-cyan-300/70",
                    !selected && !isDrawn && "bg-[#152022] text-slate-100 ring-white/10 hover:-translate-y-0.5 hover:bg-[#1c2c2e] hover:ring-cyan-300/35",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <div className="mt-4 min-h-[52px] rounded-xl bg-black/35 px-3 py-3 text-center ring-1 ring-white/8">
            {spots < 1 ? (
              <p className="text-sm font-semibold text-slate-400">Select 1–10 numbers to play</p>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {rows.map((row) => (
                  <span
                    key={row.catches}
                    className={clsx(
                      "inline-flex min-w-[3.25rem] flex-col items-center rounded-lg px-2 py-1 ring-1",
                      highlightCatches === row.catches
                        ? "bg-emerald-500/20 text-emerald-100 ring-emerald-400/50"
                        : "bg-white/[0.04] text-slate-200 ring-white/10",
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{row.catches} hit</span>
                    <span className="font-mono text-sm font-bold">{row.multiplier}×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
              <ShieldCheck className="h-3.5 w-3.5" /> Provably fair
            </span>
            <span className="font-mono text-slate-400">
              {spots}/{KENO_MAX_SPOTS} selected
            </span>
          </div>
        </div>
      </div>

      <ProvablyFairPanel />
    </div>
  );
}
