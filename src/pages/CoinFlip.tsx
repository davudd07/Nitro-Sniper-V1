import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { sound } from "../lib/sound";
import { formatCredits, formatPercent } from "../lib/format";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { HOUSE_EDGE } from "../lib/rakeback";
import { takeStake } from "../lib/stake";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import {
  COIN_BASE_MULT,
  COIN_MAX_MULT,
  COIN_MAX_WINS,
  currentMultiplier,
  isMaxWin,
  nextMultiplier,
  payoutFor,
  rollCoin,
  type CoinSide,
} from "../lib/coinflip";

const RTP = 0.96;

type Phase = "idle" | "flipping" | "won" | "lost" | "maxed";
type FlipOutcome = "won" | "lost" | "maxed" | "blocked";
type Mode = "manual" | "auto";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function CoinFace({ side }: { side: CoinSide }) {
  const gold = side === "heads";
  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-full"
      style={{
        background: gold
          ? "radial-gradient(circle at 32% 28%, #fff7cc, #fbbf24 38%, #d97706 72%, #78350f)"
          : "radial-gradient(circle at 32% 28%, #f8fafc, #cbd5e1 38%, #64748b 72%, #334155)",
        boxShadow: gold
          ? "inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -10px 18px rgba(120,53,15,0.45), 0 14px 32px rgba(0,0,0,0.5)"
          : "inset 0 3px 0 rgba(255,255,255,0.5), inset 0 -10px 18px rgba(15,23,42,0.45), 0 14px 32px rgba(0,0,0,0.5)",
        border: gold ? "7px solid rgba(253, 230, 138, 0.55)" : "7px solid rgba(226, 232, 240, 0.45)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: gold ? undefined : "rotateY(180deg)",
      }}
    >
      <div
        className="grid h-[70%] w-[70%] place-items-center rounded-full"
        style={{
          border: gold ? "2px solid rgba(255,237,160,0.55)" : "2px solid rgba(255,255,255,0.4)",
          background: gold ? "rgba(120,53,15,0.18)" : "rgba(15,23,42,0.2)",
        }}
      >
        <Star
          className={gold ? "text-amber-100" : "text-slate-100"}
          fill="currentColor"
          style={{
            width: "42%",
            height: "42%",
            filter: gold
              ? "drop-shadow(0 2px 8px rgba(120,53,15,0.65))"
              : "drop-shadow(0 2px 8px rgba(15,23,42,0.65))",
          }}
        />
      </div>
      <span
        className={clsx(
          "absolute bottom-6 text-[10px] font-extrabold uppercase tracking-[0.28em]",
          gold ? "text-amber-50" : "text-slate-100",
        )}
      >
        {gold ? "Gold" : "Silver"}
      </span>
    </div>
  );
}

function SideButton({
  side,
  active,
  disabled,
  onPick,
}: {
  side: CoinSide;
  active: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const gold = side === "heads";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={clsx(
        "flex items-center gap-2 rounded-xl px-3 py-3 text-left ring-2 transition-colors disabled:opacity-50",
        active
          ? gold
            ? "bg-amber-500/20 ring-amber-300/70"
            : "bg-slate-400/20 ring-slate-200/60"
          : "bg-bg-900 ring-white/10 hover:bg-bg-700",
      )}
    >
      <span
        className="grid h-10 w-10 place-items-center rounded-full"
        style={{
          background: gold
            ? "radial-gradient(circle at 30% 30%, #fde68a, #d97706)"
            : "radial-gradient(circle at 30% 30%, #f1f5f9, #64748b)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 8px rgba(0,0,0,0.35)",
        }}
      >
        <Star className="h-4 w-4 text-white" fill="currentColor" />
      </span>
      <span>
        <span className="block text-sm font-extrabold uppercase tracking-wide text-white">
          {gold ? "Heads" : "Tails"}
        </span>
        <span className={clsx("text-[11px] font-semibold", gold ? "text-amber-200" : "text-slate-300")}>
          {gold ? "Gold coin" : "Silver coin"}
        </span>
      </span>
    </button>
  );
}

export function CoinFlip() {
  const [bet, setBet] = useState(100);
  const [pick, setPick] = useState<CoinSide>("heads");
  const [wins, setWins] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CoinSide>("heads");
  const [rotateY, setRotateY] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [session, setSession] = useState(0);
  const [mode, setMode] = useState<Mode>("manual");
  const [autoLimit, setAutoLimit] = useState(3);
  const [autoRunning, setAutoRunning] = useState(false);
  const [history, setHistory] = useState<CoinSide[]>([]);

  const winsRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const autoStop = useRef(false);
  winsRef.current = wins;
  phaseRef.current = phase;

  const balance = useEconomyStore((s) => s.balance);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const current = currentMultiplier(wins);
  const upcoming = nextMultiplier(wins);
  const potential = payoutFor(bet, Math.max(wins, 1));
  const nextPayout = Math.round(bet * upcoming);

  const status = useMemo(() => {
    if (autoRunning) return "Auto running…";
    if (phase === "flipping") return "Flipping…";
    if (phase === "won") return `Correct — ${current.toFixed(2)}x`;
    if (phase === "lost") return "Wrong side — run over";
    if (phase === "maxed") return `Max win · ${COIN_MAX_MULT.toFixed(2)}x`;
    return "Pick gold or silver, then flip";
  }, [phase, current, autoRunning]);

  function choose(side: CoinSide) {
    if (phase === "flipping" || autoRunning) return;
    sound.click();
    setPick(side);
  }

  function cashOutInternal(streak: number) {
    const payout = payoutFor(bet, streak);
    credit(payout);
    recordRound(bet, payout);
    setLastWin(payout);
    setSession((s) => s + payout);
    setPhase("idle");
    setWins(0);
    winsRef.current = 0;
    phaseRef.current = "idle";
    sound.win(payout > bet * 4 ? "big" : "small");
    push(`Cashed out ${formatCredits(payout)} SH.`, "success");
  }

  async function flipOnce(): Promise<FlipOutcome> {
    if (phaseRef.current === "flipping") return "blocked";
    const starting = phaseRef.current === "idle" || phaseRef.current === "lost" || phaseRef.current === "maxed";
    if (starting) {
      if (bet < 0) return "blocked";
      if (!takeStake(bet, HOUSE_EDGE.coinflip)) {
        push("Not enough Shards for that bet.", "danger");
        return "blocked";
      }
      setWins(0);
      winsRef.current = 0;
      setSession((s) => s - bet);
      sound.chip();
    }

    setPhase("flipping");
    phaseRef.current = "flipping";
    const [roll] = await play(1);
    const landed = rollCoin(roll);
    const extra = 5 * 360;
    const targetFace = landed === "tails" ? 180 : 0;
    setRotateY((prev) => {
      const currentMod = ((prev % 360) + 360) % 360;
      const delta = (targetFace - currentMod + 360) % 360;
      return prev + extra + delta;
    });
    sound.coinFlip();
    await sleep(1250);
    setResult(landed);
    setHistory((h) => [landed, ...h].slice(0, 16));

    if (landed !== pick) {
      setWins(0);
      winsRef.current = 0;
      setPhase("lost");
      phaseRef.current = "lost";
      recordRound(bet, 0);
      sound.lose();
      push(`${landed === "heads" ? "Gold" : "Silver"} — lost ${formatCredits(bet)} SH.`, "danger");
      return "lost";
    }

    const streak = starting ? 1 : winsRef.current + 1;
    setWins(streak);
    winsRef.current = streak;

    if (isMaxWin(streak)) {
      const payout = payoutFor(bet, streak);
      credit(payout);
      recordRound(bet, payout);
      setLastWin(payout);
      setSession((s) => s + payout);
      setPhase("maxed");
      phaseRef.current = "maxed";
      sound.win("big");
      push(`Ten in a row — auto cash out ${formatCredits(payout)} SH at ${COIN_MAX_MULT.toFixed(2)}x.`, "success");
      return "maxed";
    }

    setPhase("won");
    phaseRef.current = "won";
    sound.win(streak >= 3 ? "big" : "small");
    return "won";
  }

  async function runAuto() {
    if (autoRunning) return;
    autoStop.current = false;
    setAutoRunning(true);
    try {
      let outcome = await flipOnce();
      while (!autoStop.current && outcome === "won") {
        if (winsRef.current >= autoLimit) {
          cashOutInternal(winsRef.current);
          break;
        }
        outcome = await flipOnce();
      }
    } finally {
      setAutoRunning(false);
    }
  }

  function cashOut() {
    if (phase !== "won" || wins <= 0) return;
    cashOutInternal(wins);
  }

  function onPrimary() {
    if (mode === "auto") {
      if (autoRunning) {
        autoStop.current = true;
        return;
      }
      void runAuto();
      return;
    }
    void flipOnce();
  }

  const primaryLabel = autoRunning
    ? "Stop auto"
    : mode === "auto"
      ? "Start auto"
      : phase === "flipping"
        ? "Flipping…"
        : phase === "won"
          ? "Flip again"
          : "Flip";

  return (
    <div className="space-y-5">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="surface p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Coin Flip</h2>
            <InfoButton title="Coin Flip — RTP & House Edge">
              <StatRow label="Base RTP" value={formatPercent(RTP)} />
              <StatRow label="House edge" value={formatPercent(1 - RTP)} />
              <StatRow label="First-win multiplier" value={`${COIN_BASE_MULT.toFixed(2)}x`} />
              <StatRow label="Max win" value={`${COIN_MAX_MULT.toFixed(2)}x`} />
              <p>
                Call gold (heads) or silver (tails). A correct flip pays {COIN_BASE_MULT.toFixed(2)}x and doubles on
                every extra correct guess ({COIN_MAX_WINS} in a row auto-cashes at {COIN_MAX_MULT.toFixed(2)}x). A miss
                ends the run. Continuing after a win keeps the original stake — you are not charged again. About 4%
                house edge on a fair coin.
              </p>
            </InfoButton>
          </div>
          <p className="mb-4 text-[11px] font-medium text-slate-400">0 = demo bet</p>

          <div className="mb-4 grid grid-cols-2 rounded-lg bg-black/30 p-1 ring-1 ring-white/10">
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
            <input
              type="number"
              min={0}
              value={bet}
              disabled={phase === "flipping" || phase === "won" || autoRunning}
              onChange={(e) => setBet(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={phase === "flipping" || autoRunning || phase === "won"}
              onClick={() => setBet((b) => Math.max(0, Math.floor(b / 2)))}
              className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              ½
            </button>
            <button
              type="button"
              disabled={phase === "flipping" || autoRunning || phase === "won"}
              onClick={() => setBet((b) => b * 2)}
              className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              2×
            </button>
          </div>

          {mode === "auto" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Auto cash-out after wins
              </label>
              <input
                type="number"
                min={1}
                max={COIN_MAX_WINS}
                value={autoLimit}
                disabled={autoRunning}
                onChange={(e) => setAutoLimit(Math.min(COIN_MAX_WINS, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full rounded-lg bg-bg-900 px-3 py-2 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Keeps flipping the same side until a miss or this streak, then cashes out.
              </p>
            </div>
          )}

          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Coin side</p>
          <div className="mb-4 grid grid-cols-1 gap-2">
            <SideButton side="heads" active={pick === "heads"} disabled={phase === "flipping" || autoRunning} onPick={() => choose("heads")} />
            <SideButton side="tails" active={pick === "tails"} disabled={phase === "flipping" || autoRunning} onPick={() => choose("tails")} />
          </div>

          <button
            type="button"
            onClick={onPrimary}
            disabled={mode === "manual" && phase === "flipping"}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={cashOut}
            disabled={phase !== "won" || autoRunning}
            className="mt-2 w-full rounded-xl bg-emerald-500 py-3 font-bold text-bg-950 transition-transform hover:brightness-110 disabled:opacity-40"
          >
            Cash Out{phase === "won" ? ` · ${formatCredits(payoutFor(bet, wins))} SH` : ""}
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
              <p className="text-slate-500">Current</p>
              <p className="font-mono text-base font-bold text-emerald-300">{wins > 0 ? `${current.toFixed(2)}x` : "—"}</p>
            </div>
            <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
              <p className="text-slate-500">Next</p>
              <p className="font-mono text-base font-bold text-cyan-300">{upcoming.toFixed(2)}x</p>
            </div>
            <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
              <p className="text-slate-500">Potential</p>
              <p className="font-mono text-base font-bold text-white">{formatCredits(wins > 0 ? potential : nextPayout)} SH</p>
            </div>
            <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
              <p className="text-slate-500">Balance</p>
              <p className="font-mono text-base font-bold text-white">{formatCredits(balance)}</p>
            </div>
          </div>
        </div>

        <div className="surface p-5 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>{status}</span>
            <span>
              Last win <span className="font-mono text-slate-200">{formatCredits(lastWin)} SH</span>
              <span className="mx-2 text-white/20">·</span>
              Session{" "}
              <span className={clsx("font-mono", session >= 0 ? "text-emerald-300" : "text-rose-300")}>
                {session >= 0 ? "+" : ""}
                {formatCredits(session)} SH
              </span>
            </span>
          </div>

          <div className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {history.length === 0 ? (
              <p className="text-xs text-slate-500">Recent flips land here — gold vs silver.</p>
            ) : (
              history.map((side, i) => {
                const gold = side === "heads";
                return (
                  <span
                    key={`${side}-${i}`}
                    title={gold ? "Gold" : "Silver"}
                    className={clsx(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                      i === 0 ? "opacity-100 ring-2 ring-white/70" : "opacity-45",
                    )}
                    style={{
                      background: gold
                        ? "radial-gradient(circle at 30% 30%, #fde68a, #d97706)"
                        : "radial-gradient(circle at 30% 30%, #e2e8f0, #64748b)",
                    }}
                  >
                    <Star className="h-3.5 w-3.5 text-white" fill="currentColor" />
                  </span>
                );
              })
            )}
          </div>

          <div className="mx-auto grid max-w-sm place-items-center py-4">
            <div className="relative h-56 w-56 sm:h-64 sm:w-64" style={{ perspective: 900 }}>
              <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY }}
                transition={{ duration: 1.15, ease: [0.22, 0.8, 0.28, 1] }}
              >
                <CoinFace side="heads" />
                <CoinFace side="tails" />
              </motion.div>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={`${phase}-${result}-${wins}-${autoRunning}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 text-center text-sm font-semibold"
              >
                {phase === "flipping" && <span className="text-cyan-200">In the air…</span>}
                {phase === "won" && (
                  <span className="text-emerald-300">
                    {result === "heads" ? "Gold" : "Silver"} — streak {wins}/{COIN_MAX_WINS}
                  </span>
                )}
                {phase === "lost" && (
                  <span className="text-rose-300">{result === "heads" ? "Gold" : "Silver"} — streak broken</span>
                )}
                {phase === "maxed" && <span className="text-amber-300">Max multiplier reached — paid out automatically</span>}
                {phase === "idle" && <span className="text-slate-500">Gold or silver. Double or cash out after every win.</span>}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <ProvablyFairPanel />
    </div>
  );
}
