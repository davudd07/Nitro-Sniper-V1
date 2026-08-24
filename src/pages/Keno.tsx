import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hash } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { sound } from "../lib/sound";
import { formatCredits, formatCash, formatPercent } from "../lib/format";
import { LockAmountInput } from "../components/ui/LockAmountInput";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import {
  KENO_BALLS,
  KENO_BET_PRESETS,
  KENO_DEFAULT_BET,
  KENO_DRAWN,
  KENO_MAX_SPOTS,
  KENO_TOP_ODDS,
  drawKeno,
  kenoCatches,
  kenoPayout,
  paytableRows,
  quickPick,
} from "../lib/keno";
import { requireAccount } from "../lib/stake";

const RTP = 0.94;
const BALLS = Array.from({ length: KENO_BALLS }, (_, i) => i + 1);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function Keno() {
  const [picks, setPicks] = useState<number[]>([]);
  const [bet, setBet] = useState(KENO_DEFAULT_BET);
  const [customBet, setCustomBet] = useState(75);
  const [usingCustom, setUsingCustom] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [lastCatches, setLastCatches] = useState<number | null>(null);
  const [session, setSession] = useState(0);

  const balance = useEconomyStore((s) => s.balance);
  const spend = useEconomyStore((s) => s.spend);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const stake = usingCustom ? Math.max(1, Math.round(customBet) || 1) : bet;
  const spots = picks.length;
  const rows = useMemo(() => paytableRows(spots), [spots]);
  const liveCatches = kenoCatches(picks, revealed);
  const highlightCatches = drawing || revealed.length === KENO_DRAWN ? liveCatches : null;
  const drawnSet = new Set(revealed);
  const pickSet = new Set(picks);

  function toggle(n: number) {
    if (drawing) return;
    setRevealed([]);
    setLastCatches(null);
    setPicks((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= KENO_MAX_SPOTS) {
        push(`Pick up to ${KENO_MAX_SPOTS} spots.`, "warning");
        return prev;
      }
      sound.click();
      return [...prev, n].sort((a, b) => a - b);
    });
  }

  function clearPicks() {
    if (drawing) return;
    sound.click();
    setPicks([]);
    setRevealed([]);
    setLastCatches(null);
  }

  function doQuickPick() {
    if (drawing) return;
    sound.click();
    setPicks(quickPick(KENO_MAX_SPOTS));
    setRevealed([]);
    setLastCatches(null);
  }

  async function playRound() {
    if (drawing) return;
    if (spots < 1) {
      push("Select at least 1 spot.", "warning");
      return;
    }
    if (!requireAccount()) return;
    if (!spend(stake)) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }
    setDrawing(true);
    setRevealed([]);
    setLastCatches(null);
    setSession((s) => s - stake);
    sound.chip();

    const rolls = await play(KENO_BALLS);
    const nextDrawn = drawKeno(rolls);

    const shown: number[] = [];
    for (const n of nextDrawn) {
      shown.push(n);
      setRevealed([...shown]);
      sound.tick(shown.length / KENO_DRAWN);
      await sleep(180);
    }

    const catches = kenoCatches(picks, nextDrawn);
    const payout = kenoPayout(stake, spots, catches);
    setLastCatches(catches);
    recordRound(stake, payout, "keno");
    if (payout > 0) {
      setLastWin(payout);
      credit(payout);
      setSession((s) => s + payout);
      sound.win(payout >= stake * 10 ? "big" : "small");
      push(`Caught ${catches}/${spots} — won ${formatCash(payout)}.`, "success");
    } else {
      sound.lose();
      push(`Caught ${catches}/${spots} — no payout.`, "danger");
    }
    setDrawing(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <div className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Keno</h2>
            <InfoButton title="Keno — RTP & House Edge">
              <StatRow label="Target RTP" value={formatPercent(RTP)} />
              <StatRow label="House edge" value={formatPercent(1 - RTP)} />
              <StatRow label="Field" value={`${KENO_BALLS} numbers`} />
              <StatRow label="Draw" value={`${KENO_DRAWN} unique balls`} />
              <p>
                Pick 1–{KENO_MAX_SPOTS} spots. Ten numbers are drawn from 1–{KENO_BALLS}. Payouts use the posted
                catch table for your spot count — unlisted catch counts pay 0. Hitting every spot on a 10-spot card
                is {KENO_TOP_ODDS[10]}.
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                {Object.entries(KENO_TOP_ODDS).map(([n, odds]) => (
                  <div key={n} className="flex justify-between">
                    <span>{n} spot{n === "1" ? "" : "s"} (all catch)</span>
                    <span className="font-mono text-slate-300">{odds}</span>
                  </div>
                ))}
              </div>
            </InfoButton>
          </div>

          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Bet</label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {KENO_BET_PRESETS.map((n) => (
              <button
                key={n}
                disabled={drawing}
                onClick={() => {
                  sound.click();
                  setUsingCustom(false);
                  setBet(n);
                }}
                className={clsx(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 transition-colors disabled:opacity-40",
                  !usingCustom && bet === n
                    ? "bg-white/10 text-white ring-white/20"
                    : "text-slate-400 ring-white/10 hover:bg-white/5",
                )}
              >
                {formatCredits(n)}
              </button>
            ))}
            <button
              disabled={drawing}
              onClick={() => {
                sound.click();
                setUsingCustom(true);
              }}
              className={clsx(
                "rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 transition-colors disabled:opacity-40",
                usingCustom ? "bg-violet-500/20 text-violet-100 ring-violet-400/40" : "text-slate-400 ring-white/10 hover:bg-white/5",
              )}
            >
              Custom
            </button>
          </div>
          {usingCustom && (
            <LockAmountInput
              valueWl={customBet}
              onChangeWl={setCustomBet}
              disabled={drawing}
              minWl={1}
              className="mb-4"
              inputClassName="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
            />
          )}

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              disabled={drawing}
              onClick={doQuickPick}
              className="rounded-xl bg-bg-900 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-40"
            >
              Quick Pick
            </button>
            <button
              disabled={drawing || picks.length === 0}
              onClick={clearPicks}
              className="rounded-xl bg-bg-900 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <button onClick={() => void playRound()} disabled={drawing || spots < 1} className="btn-primary w-full py-3 disabled:opacity-50">
            {drawing ? "Drawing…" : `Play · ${formatCash(stake)}`}
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
              <p className="text-slate-500">Balance</p>
              <p className="font-mono text-base font-bold text-white">{formatCredits(balance)}</p>
            </div>
            <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
              <p className="text-slate-500">Spots</p>
              <p className="font-mono text-base font-bold text-cyan-300">
                {spots}/{KENO_MAX_SPOTS}
              </p>
            </div>
            <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
              <p className="text-slate-500">Last win</p>
              <p className="font-mono text-base font-bold text-emerald-300">{formatCash(lastWin)}</p>
            </div>
            <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
              <p className="text-slate-500">Session</p>
              <p className={clsx("font-mono text-base font-bold", session >= 0 ? "text-emerald-300" : "text-rose-300")}>
                {session >= 0 ? "+" : ""}
                {formatCredits(session)}
              </p>
            </div>
          </div>
        </div>

        <div className="surface p-5">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Paytable · {spots || "—"} spot{spots === 1 ? "" : "s"}
          </p>
          {spots < 1 ? (
            <p className="text-sm text-slate-500">Select spots to see the catch table.</p>
          ) : (
            <div className="space-y-1">
              {rows.map((row) => (
                <div
                  key={row.catches}
                  className={clsx(
                    "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ring-1",
                    highlightCatches === row.catches
                      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40"
                      : "bg-bg-900 text-slate-300 ring-white/8",
                  )}
                >
                  <span>
                    {row.catches} catch{row.catches === 1 ? "" : "es"}
                  </span>
                  <span className="font-mono font-semibold">{row.multiplier}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <ProvablyFairPanel />
      </div>

      <div className="surface p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-cyan-300" />
            {drawing
              ? `Drawing ${revealed.length}/${KENO_DRAWN}`
              : lastCatches != null
                ? `Caught ${lastCatches} of ${spots}`
                : "Pick 1–10 numbers, then play"}
          </span>
          <span className="font-mono text-slate-300">Bet {formatCash(stake)}</span>
        </div>

        <div className="mb-5 flex min-h-[44px] flex-wrap gap-1.5">
          <AnimatePresence>
            {revealed.map((n, i) => (
              <motion.span
                key={`${n}-${i}`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={clsx(
                  "grid h-9 w-9 place-items-center rounded-full text-xs font-bold ring-1",
                  pickSet.has(n)
                    ? "bg-emerald-500/25 text-emerald-100 ring-emerald-400/50"
                    : "bg-cyan-500/15 text-cyan-100 ring-cyan-400/30",
                )}
              >
                {n}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {BALLS.map((n) => {
            const selected = pickSet.has(n);
            const isDrawn = drawnSet.has(n);
            const drawDone = !drawing && revealed.length === KENO_DRAWN;
            const matched = selected && isDrawn;
            const missed = selected && drawDone && !isDrawn;
            const extra = !selected && isDrawn;
            return (
              <button
                key={n}
                disabled={drawing}
                onClick={() => toggle(n)}
                className={clsx(
                  "aspect-square rounded-xl text-sm font-bold tabular-nums transition-all duration-150 ring-1 disabled:cursor-default",
                  matched && "bg-emerald-500/25 text-emerald-100 ring-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.25)]",
                  missed && "bg-rose-500/15 text-rose-200 ring-rose-400/30",
                  extra && !matched && "bg-cyan-500/10 text-cyan-100 ring-cyan-400/35",
                  selected && !matched && !missed && "bg-fuchsia-500/20 text-fuchsia-100 ring-fuchsia-400/45",
                  !selected && !isDrawn && "bg-bg-700 text-slate-200 ring-white/10 hover:-translate-y-0.5 hover:bg-bg-600 hover:ring-cyan-300/30",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
