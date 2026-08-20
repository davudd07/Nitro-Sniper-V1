import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Crown, Users, X } from "lucide-react";
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
  onClose,
}: {
  result: BattlePayout;
  onClose: () => void;
}) {
  const title = result.shared
    ? "Shared split"
    : result.youWon
      ? "You won the battle"
      : `Team ${(result.winningTeam ?? 0) + 1} wins`;

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-bg-900 px-6 py-8 text-center shadow-[0_0_80px_rgba(217,70,239,0.18)]"
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
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-fuchsia-400 text-bg-950 shadow-[0_0_32px_rgba(250,204,21,0.35)]">
          {result.shared ? <Users className="h-8 w-8" /> : <Crown className="h-8 w-8" />}
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-fuchsia-200">{title}</p>
        {!result.shared && result.winningTeam !== null && (
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">
            Team {result.winningTeam + 1} won {formatCredits(result.pot)} SH
          </p>
        )}
        {result.shared && (
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">
            Pot {formatCredits(result.pot)} SH split equally
          </p>
        )}
        <p className="mt-2 text-sm text-slate-300">
          {result.winners.map((w) => w.name).join(" · ")}
        </p>
        <div className="mx-auto mt-5 inline-flex flex-col items-center rounded-2xl border border-white/10 bg-black/30 px-6 py-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {result.shared ? "Your share" : result.youWon ? "You received" : "Each winner received"}
          </span>
          <span className="mt-1 font-mono text-4xl font-black tabular-nums text-amber-300">
            +{formatCredits(result.youWon || result.shared ? result.youPaid : result.share)}
          </span>
          <span className="text-xs font-semibold text-amber-300/70">SH</span>
          {result.youWon && result.borrowPct > 0 && (
            <span className="mt-2 text-[11px] text-sky-300">
              After {pctLabel(result.borrowPct)} borrow · full share was {formatCredits(result.share)} SH
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            sound.click();
            onClose();
          }}
          className="btn-primary mt-6 px-8 py-2.5"
        >
          Continue
        </button>
        <Link
          to="/battles/create"
          onClick={() => sound.click()}
          className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-white"
        >
          Start another battle
        </Link>
      </motion.div>
    </div>,
    document.body,
  );
}
