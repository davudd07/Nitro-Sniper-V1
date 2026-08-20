import { useMemo, useState } from "react";
import { Bomb, Gem, Minus, Plus } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { sound } from "../lib/sound";
import { formatCredits, formatPercent } from "../lib/format";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";

const GRID_SIZE = 25;
const RTP = 0.96;

function fairMultiplier(reveals: number, mines: number): number {
  let m = 1;
  for (let i = 0; i < reveals; i++) {
    m *= (GRID_SIZE - i) / (GRID_SIZE - mines - i);
  }
  return m * RTP;
}

type TileState = "hidden" | "safe" | "mine";
type Phase = "idle" | "playing" | "busted" | "cashed";

export function Mines() {
  const [mines, setMines] = useState(5);
  const [bet, setBet] = useState(100);
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [tiles, setTiles] = useState<TileState[]>(Array(GRID_SIZE).fill("hidden"));
  const [phase, setPhase] = useState<Phase>("idle");
  const [reveals, setReveals] = useState(0);
  const [busy, setBusy] = useState(false);

  const spend = useEconomyStore((s) => s.spend);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const currentMultiplier = useMemo(() => fairMultiplier(reveals, mines), [reveals, mines]);
  const nextMultiplier = useMemo(() => fairMultiplier(reveals + 1, mines), [reveals, mines]);
  const potentialWin = bet * currentMultiplier;

  async function startGame() {
    if (phase === "playing" || busy) return;
    if (bet <= 0) return;
    if (!spend(bet)) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }
    setBusy(true);
    const rolls = await play(GRID_SIZE);
    const order = rolls.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r);
    const minesSet = new Set(order.slice(0, mines).map((o) => o.i));
    setMinePositions(minesSet);
    setTiles(Array(GRID_SIZE).fill("hidden"));
    setReveals(0);
    setPhase("playing");
    setBusy(false);
    sound.chip();
  }

  function revealTile(idx: number) {
    if (phase !== "playing" || tiles[idx] !== "hidden" || busy) return;
    const isMine = minePositions.has(idx);
    const next = [...tiles];
    if (isMine) {
      next[idx] = "mine";
      setTiles(next.map((t, i) => (minePositions.has(i) ? "mine" : t === "hidden" ? "hidden" : t)));
      setPhase("busted");
      sound.lose();
      recordRound(bet, 0);
      push(`Boom! Hit a mine. Lost ${formatCredits(bet)} SH.`, "danger");
      return;
    }
    next[idx] = "safe";
    setTiles(next);
    const newReveals = reveals + 1;
    setReveals(newReveals);
    sound.tick(Math.min(1, newReveals / 10));

    if (newReveals === GRID_SIZE - mines) {
      const winnings = bet * fairMultiplier(newReveals, mines);
      credit(winnings);
      recordRound(bet, winnings);
      setPhase("cashed");
      sound.win("big");
      push(`Cleared the board! Won ${formatCredits(winnings)} SH.`, "success");
    }
  }

  function cashOut() {
    if (phase !== "playing" || reveals === 0) return;
    const winnings = bet * currentMultiplier;
    credit(winnings);
    recordRound(bet, winnings);
    setPhase("cashed");
    sound.win(winnings > bet * 2 ? "big" : "small");
    push(`Cashed out ${formatCredits(winnings)} SH.`, "success");
  }

  const revealAllMines = phase === "busted" || phase === "cashed";
  const gemsFound = tiles.filter((t) => t === "safe").length;
  const minePresets = [3, 5, 10, 15, 24];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <div className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Mines</h2>
            <InfoButton title="Mines — RTP & House Edge">
              <StatRow label="Base RTP" value={formatPercent(RTP)} />
              <StatRow label="House edge" value={formatPercent(1 - RTP)} />
              <p>
                Multipliers use the standard fair-mines formula (based on hypergeometric odds of avoiding every mine
                you&apos;ve revealed so far), then scaled by the {formatPercent(RTP)} RTP factor above. Mine
                positions are derived from the provably-fair seed for this round.
              </p>
            </InfoButton>
          </div>

          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Bet</label>
          <div className="mb-5 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={bet}
              disabled={phase === "playing"}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 0))}
              className="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-emerald-400/40 disabled:opacity-50"
            />
            <button
              disabled={phase === "playing"}
              onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
              className="rounded-lg bg-bg-900 p-2.5 text-slate-300 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              disabled={phase === "playing"}
              onClick={() => setBet((b) => b * 2)}
              className="rounded-lg bg-bg-900 p-2.5 text-slate-300 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Mines · {mines}
          </label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {minePresets.map((n) => (
              <button
                key={n}
                disabled={phase === "playing"}
                onClick={() => setMines(n)}
                className={clsx(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 transition-colors disabled:opacity-40",
                  mines === n ? "bg-white/10 text-white ring-white/20" : "text-slate-400 ring-white/10 hover:bg-white/5",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={24}
            value={mines}
            disabled={phase === "playing"}
            onChange={(e) => setMines(Number(e.target.value))}
            className="mb-5 w-full accent-cyan-400 disabled:opacity-50"
          />

          {phase !== "playing" ? (
            <button onClick={startGame} disabled={busy} className="btn-primary w-full py-3 disabled:opacity-50">
              {busy ? "Starting…" : "Start Game"}
            </button>
          ) : (
            <button
              onClick={cashOut}
              disabled={reveals === 0}
              className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-bg-950 transition-transform hover:brightness-110 disabled:opacity-40"
            >
              Cash Out {reveals > 0 ? `· ${formatCredits(potentialWin)} SH` : ""}
            </button>
          )}

          {phase === "playing" && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
                <p className="text-slate-500">Current</p>
                <p className="font-mono text-base font-bold text-emerald-300">{currentMultiplier.toFixed(2)}x</p>
              </div>
              <div className="rounded-lg bg-bg-900 p-2.5 ring-1 ring-white/8">
                <p className="text-slate-500">Next tile</p>
                <p className="font-mono text-base font-bold text-cyan-300">{nextMultiplier.toFixed(2)}x</p>
              </div>
            </div>
          )}
        </div>

        <ProvablyFairPanel />
      </div>

      <div className="surface p-5 sm:p-8">
        <div className="mb-5 flex items-center justify-between text-xs text-slate-400">
          <span>
            Gems {gemsFound} / {GRID_SIZE - mines}
          </span>
          <span className={clsx("font-medium", phase === "playing" ? "text-cyan-300" : "text-slate-500")}>
            {phase === "idle" && "Pick a bet, then start"}
            {phase === "playing" && "Click a tile"}
            {phase === "busted" && "Hit a mine"}
            {phase === "cashed" && "Cashed out"}
          </span>
        </div>
        <div className="mx-auto grid max-w-md grid-cols-5 gap-2.5">
          {tiles.map((t, i) => {
            const isMine = minePositions.has(i);
            const revealed = t !== "hidden" || (revealAllMines && isMine);
            return (
              <button
                key={i}
                onClick={() => revealTile(i)}
                disabled={phase !== "playing" || t !== "hidden"}
                className={clsx(
                  "flex aspect-square items-center justify-center rounded-xl text-lg font-bold transition-all duration-150",
                  !revealed &&
                    "bg-bg-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_0_#0a0a12] ring-1 ring-white/10 hover:-translate-y-0.5 hover:bg-bg-600 hover:ring-cyan-300/30 active:translate-y-0 disabled:hover:translate-y-0",
                  revealed && t === "safe" && "bg-emerald-500/15 ring-1 ring-emerald-400/30",
                  revealed && isMine && "bg-rose-500/20 ring-1 ring-rose-400/40",
                )}
              >
                {revealed &&
                  (isMine ? (
                    <Bomb className="h-6 w-6 text-rose-400" />
                  ) : (
                    <Gem className="h-6 w-6 text-emerald-300" />
                  ))}
              </button>
            );
          })}
        </div>
        {phase === "busted" && (
          <p className="mt-6 text-center text-sm font-semibold text-rose-300">Busted — better luck next round.</p>
        )}
        {phase === "cashed" && (
          <p className="mt-6 text-center text-sm font-semibold text-emerald-300">Cashed out successfully!</p>
        )}
      </div>
    </div>
  );
}
