import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Crown, Gem, RotateCcw, Users, X } from "lucide-react";
import { formatCredits } from "../../lib/format";
import { pctLabel } from "../../lib/battleFinance";
import { sound } from "../../lib/sound";

export interface BattlePayout {
  shared: boolean;
  youWon: boolean;
  pot: number;
  share: number;
  youPaid: number;
  borrowPct: number;
  winningTeam: number | null;
  winners: { name: string; color: string }[];
}

export function BattleResultOverlay({
  result,
  recreateCost,
  onClose,
  onRecreate,
  onReplay,
}: {
  result: BattlePayout;
  recreateCost: number;
  onClose: () => void;
  onRecreate: () => void;
  onReplay: () => void;
}) {
  const winnerLine = result.winners.map((w) => w.name).join(" & ");
  const headline = result.shared ? `${winnerLine} split the pot` : `${winnerLine} won`;
  const shown = result.youWon || result.shared ? result.youPaid : result.share;

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#05080a]/88 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#0b1218] px-6 py-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.18)]"
      >
        <button
          type="button"
          onClick={() => {
            sound.click();
            onClose();
          }}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">Battle finished</p>

        <div className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-sky-600 text-bg-950 shadow-[0_0_28px_rgba(34,211,238,0.35)]">
          {result.shared ? <Users className="h-7 w-7" /> : <Crown className="h-7 w-7" />}
        </div>

        <p className="mt-4 text-xl font-extrabold uppercase leading-snug tracking-wide text-white sm:text-2xl">
          {headline}
        </p>
        {!result.shared && result.winningTeam !== null && (
          <p className="mt-1 text-sm text-slate-400">Team {result.winningTeam + 1}</p>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <Gem className="h-7 w-7 text-cyan-300" />
          <span className="font-mono text-4xl font-black tabular-nums text-white sm:text-5xl">
            {formatCredits(result.pot)}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {result.shared ? "Pot split equally" : result.youWon ? `You received ${formatCredits(shown)} SH` : `Winners received ${formatCredits(shown)} SH each`}
        </p>
        {result.youWon && result.borrowPct > 0 && (
          <p className="mt-2 text-[11px] text-sky-300">
            After {pctLabel(result.borrowPct)} borrow · full share was {formatCredits(result.share)} SH
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            sound.click();
            onRecreate();
          }}
          className="btn-primary mt-7 w-full py-3 text-sm"
        >
          Recreate {formatCredits(recreateCost)} SH
        </button>
        <button
          type="button"
          onClick={() => {
            sound.click();
            onReplay();
          }}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-white/10 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-200 hover:bg-white/5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Replay
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}
