import { CashAmount } from "../ui/CurrencyIcon";
import type { PlayCurrency } from "../../lib/playWallet";

function Meter({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: PlayCurrency;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white sm:text-base">
        <CashAmount
          wl={amount}
          currency={currency}
          unit={currency === "wl" ? "wl" : undefined}
          iconClassName="h-4 w-4"
        />
      </p>
    </div>
  );
}

/** Covers the studio CREDIT / BET / WIN strip with SeedBET World Locks (or Shards). */
export function SlotLockMeters({
  credit,
  bet,
  win,
  currency,
}: {
  credit: number;
  bet: number;
  win: number;
  currency: PlayCurrency;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pr-[22%] sm:pr-[18%]">
      <div className="flex items-end gap-6 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent px-4 pb-3 pt-8">
        <Meter label="Credit" amount={credit} currency={currency} />
        <Meter label="Bet" amount={bet} currency={currency} />
        <Meter label="Win" amount={win} currency={currency} />
      </div>
    </div>
  );
}
