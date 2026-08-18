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
const RTP = 0.97;

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

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-bg-800/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Mines</h2>
            <InfoButton title="Mines — RTP & House Edge">
              <StatRow label="Base RTP" value={formatPercent(RTP)} />
              <StatRow label="House edge" value={formatPercent(1 - RTP)} />
              <p>
                Multipliers use the standard fair-mines formula (based on hypergeometric odds of avoiding every mine
                you've revealed so far), then scaled by the {formatPercent(RTP)} RTP factor above. Mine positions are
                derived from the provably-fair seed for this round.
              </p>
            </InfoButton>
          </div>

          <label className="mb-1 block text-xs text-slate-400">Bet amount</label>
          <div className="mb-4 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={bet}
              disabled={phase === "playing"}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 0))}
              className="w-full rounded-lg bg-black/30 px-3 py-2 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-emerald-400/50 disabled:opacity-50"
            />
            <button
              disabled={phase === "playing"}
              onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
              className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              disabled={phase === "playing"}
              onClick={() => setBet((b) => b * 2)}
              className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-1 block text-xs text-slate-400">Mines: {mines}</label>
          <input
            type="range"
            min={1}
            max={24}
            value={mines}
            disabled={phase === "playing"}
            onChange={(e) => setMines(Number(e.target.value))}
            className="mb-4 w-full accent-fuchsia-500 disabled:opacity-50"
          />

          {phase !== "playing" ? (
            <button
              onClick={startGame}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 py-3 font-bold text-bg-950 shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {busy ? "Starting…" : "Start Game"}
            </button>
          ) : (
            <button
              onClick={cashOut}
              disabled={reveals === 0}
              className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 py-3 font-bold text-bg-950 shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-40"
            >
              Cash Out {reveals > 0 ? `· ${formatCredits(potentialWin)} SH` : ""}
            </button>
          )}

          {phase === "playing" && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-slate-500">Current</p>
                <p className="font-mono font-bold text-emerald-300">{currentMultiplier.toFixed(2)}x</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-slate-500">Next tile</p>
                <p className="font-mono font-bold text-cyan-300">{nextMultiplier.toFixed(2)}x</p>
              </div>
            </div>
          )}
        </div>

        <ProvablyFairPanel />
      </div>

      <div className="rounded-2xl border border-white/10 bg-bg-800/40 p-4 sm:p-6">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-2 sm:gap-3">
          {tiles.map((t, i) => {
            const isMine = minePositions.has(i);
            const revealed = t !== "hidden" || (revealAllMines && isMine);
            return (
              <button
                key={i}
                onClick={() => revealTile(i)}
                disabled={phase !== "playing" || t !== "hidden"}
                className={clsx(
                  "flex aspect-square items-center justify-center rounded-xl border text-lg font-bold transition-all",
                  !revealed && "border-white/10 bg-bg-700 hover:bg-bg-600 active:scale-95",
                  revealed && t === "safe" && "border-emerald-400/40 bg-emerald-500/20",
                  revealed && isMine && "border-rose-400/40 bg-rose-500/20",
                )}
              >
                {revealed && (isMine ? <Bomb className="h-6 w-6 text-rose-400" /> : <Gem className="h-6 w-6 text-emerald-300" />)}
              </button>
            );
          })}
        </div>
        {phase === "busted" && (
          <p className="mt-4 text-center font-semibold text-rose-300">Busted — better luck next round.</p>
        )}
        {phase === "cashed" && (
          <p className="mt-4 text-center font-semibold text-emerald-300">Cashed out successfully!</p>
        )}
      </div>
    </div>
  );
}
