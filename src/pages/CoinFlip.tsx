import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Circle, Minus, Plus } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { sound } from "../lib/sound";
import { formatCredits, formatPercent } from "../lib/format";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { DemoBetBadge } from "../components/ui/DemoBetBadge";
import { HOUSE_EDGE } from "../lib/rakeback";
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
const BET_PRESETS = [25, 50, 100, 250, 500];

type Phase = "idle" | "flipping" | "won" | "lost" | "maxed";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function CoinFace({ side }: { side: CoinSide }) {
  const heads = side === "heads";
  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-full"
      style={{
        background: heads
          ? "radial-gradient(circle at 32% 28%, #f5d0fe, #d946ef 42%, #86198f 78%, #4a044e)"
          : "radial-gradient(circle at 32% 28%, #a5f3fc, #22d3ee 42%, #0e7490 78%, #164e63)",
        boxShadow:
          "inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -8px 16px rgba(0,0,0,0.35), 0 12px 28px rgba(0,0,0,0.45)",
        border: "6px solid rgba(255,255,255,0.18)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: heads ? undefined : "rotateY(180deg)",
      }}
    >
      <div className="grid h-[72%] w-[72%] place-items-center rounded-full border border-white/25 bg-black/15">
        {heads ? (
          <span className="font-extrabold tracking-tight text-white" style={{ fontSize: "2.6rem", textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>
            P
          </span>
        ) : (
          <span
            className="font-extrabold tracking-tight text-white"
            style={{ fontSize: "2.4rem", textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}
          >
            SH
          </span>
        )}
      </div>
      <span className="absolute bottom-5 text-[10px] font-bold uppercase tracking-[0.28em] text-white/80">
        {heads ? "Heads" : "Tails"}
      </span>
    </div>
  );
}

export function CoinFlip() {
  const [bet, setBet] = useState(100);
  const [pick, setPick] = useState<CoinSide | null>(null);
  const [wins, setWins] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CoinSide>("heads");
  const [rotateY, setRotateY] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [session, setSession] = useState(0);

  const balance = useEconomyStore((s) => s.balance);
  const awardRakeback = useEconomyStore((s) => s.awardRakeback);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const inRun = phase === "flipping" || phase === "won";
  const current = currentMultiplier(wins);
  const upcoming = nextMultiplier(wins);
  const potential = payoutFor(bet, Math.max(wins, 1));
  const nextPayout = Math.round(bet * upcoming);

  const status = useMemo(() => {
    if (phase === "flipping") return "Flipping…";
    if (phase === "won") return `Correct — ${current.toFixed(2)}x`;
    if (phase === "lost") return "Wrong side — run over";
    if (phase === "maxed") return `Max win · ${COIN_MAX_MULT.toFixed(2)}x`;
    return "Pick a side, then flip";
  }, [phase, current]);

  function choose(side: CoinSide) {
    if (phase === "flipping") return;
    sound.click();
    setPick(side);
  }

  async function flip() {
    if (phase === "flipping" || !pick) return;
    if (phase === "idle" || phase === "lost" || phase === "maxed") {
      if (bet <= 0) return;
      awardRakeback(bet, HOUSE_EDGE.coinflip);
      setWins(0);
      setSession((s) => s - bet);
      sound.chip();
    }

    setPhase("flipping");
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

    if (landed !== pick) {
      setWins(0);
      setPhase("lost");
      recordRound(bet, 0);
      sound.lose();
      push(`${landed === "heads" ? "Heads" : "Tails"} — lost ${formatCredits(bet)} SH.`, "danger");
      return;
    }

    const streak = phase === "won" ? wins + 1 : 1;
    setWins(streak);

    if (isMaxWin(streak)) {
      const payout = payoutFor(bet, streak);
      credit(payout);
      recordRound(bet, payout);
      setLastWin(payout);
      setSession((s) => s + payout);
      setPhase("maxed");
      sound.win("big");
      push(`Ten in a row — auto cash out ${formatCredits(payout)} SH at ${COIN_MAX_MULT.toFixed(2)}x.`, "success");
      return;
    }

    setPhase("won");
    sound.win(streak >= 3 ? "big" : "small");
  }

  function cashOut() {
    if (phase !== "won" || wins <= 0) return;
    const payout = payoutFor(bet, wins);
    credit(payout);
    recordRound(bet, payout);
    setLastWin(payout);
    setSession((s) => s + payout);
    setPhase("idle");
    setWins(0);
    sound.win(payout > bet * 4 ? "big" : "small");
    push(`Cashed out ${formatCredits(payout)} SH.`, "success");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <div className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Coin Flip</h2>
            <div className="flex items-center gap-2">
              <DemoBetBadge />
              <InfoButton title="Coin Flip — RTP & House Edge">
              <StatRow label="Base RTP" value={formatPercent(RTP)} />
              <StatRow label="House edge" value={formatPercent(1 - RTP)} />
              <StatRow label="First-win multiplier" value={`${COIN_BASE_MULT.toFixed(2)}x`} />
              <StatRow label="Max win" value={`${COIN_MAX_MULT.toFixed(2)}x`} />
              <p>
                Call heads or tails. A correct flip pays {COIN_BASE_MULT.toFixed(2)}x and doubles on every extra
                correct guess ({COIN_MAX_WINS} in a row auto-cashes at {COIN_MAX_MULT.toFixed(2)}x). A miss ends the
                run. Continuing after a win keeps the original stake — you are not charged again. About 4% house edge
                on a fair coin.
              </p>
            </InfoButton>
            </div>
          </div>

          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Bet</label>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={bet}
              disabled={inRun}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 0))}
              className="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
            />
            <button
              disabled={inRun}
              onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
              className="rounded-lg bg-bg-900 p-2.5 text-slate-300 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              disabled={inRun}
              onClick={() => setBet((b) => b * 2)}
              className="rounded-lg bg-bg-900 p-2.5 text-slate-300 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {BET_PRESETS.map((n) => (
              <button
                key={n}
                disabled={inRun}
                onClick={() => {
                  sound.click();
                  setBet(n);
                }}
                className={clsx(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 transition-colors disabled:opacity-40",
                  bet === n ? "bg-white/10 text-white ring-white/20" : "text-slate-400 ring-white/10 hover:bg-white/5",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Call</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["heads", "tails"] as const).map((side) => (
              <button
                key={side}
                disabled={phase === "flipping"}
                onClick={() => choose(side)}
                className={clsx(
                  "rounded-xl py-3 text-sm font-bold uppercase tracking-wide ring-1 transition-colors disabled:opacity-50",
                  pick === side
                    ? side === "heads"
                      ? "bg-fuchsia-500/20 text-fuchsia-100 ring-fuchsia-400/50"
                      : "bg-cyan-500/20 text-cyan-100 ring-cyan-400/50"
                    : "bg-bg-900 text-slate-300 ring-white/10 hover:bg-bg-700",
                )}
              >
                {side}
              </button>
            ))}
          </div>

          <button
            onClick={() => void flip()}
            disabled={phase === "flipping" || !pick}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {phase === "flipping" ? "Flipping…" : phase === "won" ? "Flip again" : "Flip"}
          </button>
          <button
            onClick={cashOut}
            disabled={phase !== "won"}
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
        <ProvablyFairPanel />
      </div>

      <div className="surface p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Circle className="h-3.5 w-3.5 text-fuchsia-300" />
            {status}
          </span>
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

        <div className="mx-auto grid max-w-sm place-items-center py-6">
          <div className="relative h-52 w-52" style={{ perspective: 900 }}>
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
              key={`${phase}-${result}-${wins}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 text-center text-sm font-semibold"
            >
              {phase === "flipping" && <span className="text-cyan-200">In the air…</span>}
              {phase === "won" && (
                <span className="text-emerald-300">
                  {result === "heads" ? "Heads" : "Tails"} — streak {wins}/{COIN_MAX_WINS}
                </span>
              )}
              {phase === "lost" && <span className="text-rose-300">{result === "heads" ? "Heads" : "Tails"} — streak broken</span>}
              {phase === "maxed" && <span className="text-amber-300">Max multiplier reached — paid out automatically</span>}
              {phase === "idle" && <span className="text-slate-500">Call it. Double or cash out after every win.</span>}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
