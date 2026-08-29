import { motion } from "framer-motion";
import { Crown, RotateCcw, Users, X } from "lucide-react";
import { pctLabel } from "../../lib/battleFinance";
import { sound } from "../../lib/sound";
import { CashAmount } from "../ui/CurrencyIcon";
import type { PlayCurrency } from "../../lib/playWallet";
import { formatWildcard, wildcardTone } from "../../lib/wildcard";

export interface BattlePayout {
  shared: boolean;
  youWon: boolean;
  pot: number;
  share: number;
  youPaid: number;
  borrowPct: number;
  winningTeam: number | null;
  winners: { name: string; color: string }[];
  wildcardMulti?: number | null;
}

export function BattleResultOverlay({
  result,
  currency,
  onClose,
  onRecreate,
  onReplay,
}: {
  result: BattlePayout;
  currency?: PlayCurrency;
  onClose: () => void;
  onRecreate: () => void;
  onReplay: () => void;
}) {
  const winnerLine = result.winners.map((w) => w.name).join(" & ");
  const headline = result.shared ? `${winnerLine} split the pot` : `${winnerLine} won`;
  const shown = result.youWon || result.shared ? result.youPaid : result.share;

  return (
    <div className="absolute inset-0 z-20 grid place-items-center overflow-hidden bg-[#05080a]/82 p-3 backdrop-blur-[2px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-cyan-400/25 bg-[#0b1218] px-5 py-6 text-center shadow-[0_0_48px_rgba(34,211,238,0.16)] scrollbar-thin"
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

        <div className="mx-auto mt-3 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-sky-600 text-bg-950 shadow-[0_0_28px_rgba(34,211,238,0.35)]">
          {result.shared ? <Users className="h-6 w-6" /> : <Crown className="h-6 w-6" />}
        </div>

        <p className="mt-3 text-lg font-extrabold uppercase leading-snug tracking-wide text-white sm:text-xl">
          {headline}
        </p>
        {!result.shared && result.winningTeam !== null && (
          <p className="mt-1 text-sm text-slate-400">Team {result.winningTeam + 1}</p>
        )}

        <div className="mt-4 flex items-center justify-center">
          <CashAmount
            wl={result.pot}
            currency={currency}
            className="text-3xl font-black text-white sm:text-4xl"
            iconClassName="h-7 w-7 sm:h-8 sm:w-8"
          />
        </div>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {result.shared ? (
            "Pot split equally"
          ) : result.youWon ? (
            <>
              You received <CashAmount wl={shown} currency={currency} iconClassName="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Winners received <CashAmount wl={shown} currency={currency} iconClassName="h-3.5 w-3.5" /> each
            </>
          )}
        </p>
        {result.youWon && result.borrowPct > 0 && (
          <p className="mt-2 flex flex-wrap items-center justify-center gap-1 text-[11px] text-sky-300">
            After {pctLabel(result.borrowPct)} borrow · full share was{" "}
            <CashAmount wl={result.share} currency={currency} iconClassName="h-3.5 w-3.5" />
          </p>
        )}
        {result.wildcardMulti != null && (
          <p
            className={
              wildcardTone(result.wildcardMulti) === "up"
                ? "mt-2 text-sm font-black tracking-wide text-emerald-300"
                : "mt-2 text-sm font-black tracking-wide text-rose-300"
            }
          >
            Your wildcard {formatWildcard(result.wildcardMulti)}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            sound.click();
            onRecreate();
          }}
          className="btn-primary mt-5 w-full py-3 text-sm"
        >
          Recreate
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
    </div>
  );
}
