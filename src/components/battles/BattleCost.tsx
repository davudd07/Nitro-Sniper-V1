import { Handshake } from "lucide-react";
import { clsx } from "clsx";
import { formatCredits } from "../../lib/format";
import { pctLabel } from "../../lib/battleFinance";

/** Seat / case-list cost, with the pre-borrow amount struck through when borrowed. */
export function BattleCost({
  costPerPlayer,
  borrowPct = 0,
  align = "right",
  compact = false,
}: {
  costPerPlayer: number;
  borrowPct?: number;
  align?: "left" | "right";
  compact?: boolean;
}) {
  const borrowed = borrowPct > 0;
  const paid = Math.round(costPerPlayer * (1 - borrowPct));

  return (
    <div className={clsx("flex flex-col gap-0.5", align === "right" ? "items-end text-right" : "items-start text-left")}>
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Battle cost</span>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {borrowed && (
          <span
            className="font-mono text-sm text-slate-500 line-through decoration-slate-500/80 decoration-2"
            title="Full case cost before borrow"
          >
            {formatCredits(costPerPlayer)}
          </span>
        )}
        <span
          className={clsx(
            "font-mono font-semibold tabular-nums text-amber-300",
            compact ? "text-sm" : "text-base",
          )}
        >
          {formatCredits(paid)}
          <span className={clsx("ml-0.5 font-medium text-amber-300/70", compact ? "text-[10px]" : "text-xs")}>SH</span>
        </span>
        {borrowed && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300"
            title={`${pctLabel(borrowPct)} borrowed`}
          >
            <Handshake className="h-3 w-3" />
            {pctLabel(borrowPct)}
          </span>
        )}
      </div>
    </div>
  );
}

export function BorrowBadge({ pct, compact = false }: { pct: number; compact?: boolean }) {
  if (pct <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300"
      title={`${pctLabel(pct)} borrowed`}
    >
      <Handshake className="h-2.5 w-2.5" />
      {compact ? "Borrowed" : `Borrow ${pctLabel(pct)}`}
    </span>
  );
}
