import { Handshake } from "lucide-react";
import { clsx } from "clsx";
import { pctLabel } from "../../lib/battleFinance";
import { CashAmount } from "../ui/CurrencyIcon";

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
          <span className="text-slate-500 line-through decoration-slate-500/80 decoration-2" title="Full case cost before borrow">
            <CashAmount wl={costPerPlayer} className="text-sm" iconClassName="h-3 w-3" />
          </span>
        )}
        <CashAmount
          wl={paid}
          className={clsx("font-semibold text-amber-300", compact ? "text-sm" : "text-base")}
          iconClassName={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
        />
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

/** Finished-lobby cell: entry/pot cost and payout, labeled separately. */
export function FinishedBattleCostPaid({
  costPerPlayer,
  seats,
  payout,
}: {
  costPerPlayer: number;
  seats: number;
  payout: number;
}) {
  const n = Math.max(1, seats);
  const entryPot = costPerPlayer * n;
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cost</p>
        <CashAmount wl={entryPot} className="text-sm font-semibold text-amber-200" iconClassName="h-3.5 w-3.5" />
        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
          <CashAmount wl={costPerPlayer} iconClassName="h-3 w-3" />
          <span>/ seat · {n} {n === 1 ? "seat" : "seats"}</span>
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Paid</p>
        <CashAmount wl={payout} className="text-sm font-semibold text-emerald-300" iconClassName="h-3.5 w-3.5" />
        <p className="text-[10px] text-slate-500">payout</p>
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
