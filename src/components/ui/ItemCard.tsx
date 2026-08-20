import { clsx } from "clsx";
import type { CaseItem } from "../../data/items";
import { RARITIES } from "../../data/rarities";
import { ItemIcon } from "./ItemIcon";
import { formatCredits } from "../../lib/format";

export function ItemCard({
  item,
  probability,
  size = "md",
  showChance = true,
  className,
  highlightGold,
}: {
  item: CaseItem;
  probability?: number;
  size?: "sm" | "md" | "lg";
  showChance?: boolean;
  className?: string;
  highlightGold?: boolean;
}) {
  const r = RARITIES[item.rarity];
  const pad = { sm: "p-2 gap-1.5", md: "p-3 gap-2", lg: "p-4 gap-3" }[size];
  const iconSize = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";

  return (
    <div
      className={clsx(
        "flex flex-col items-center rounded-xl border bg-white/[0.03] text-center transition-transform hover:-translate-y-0.5",
        pad,
        highlightGold && "bg-amber-400/10 ring-2 ring-amber-300",
        className,
      )}
      style={{ borderColor: highlightGold ? "rgba(252, 211, 77, 0.7)" : `${r.ring}3a` }}
    >
      <ItemIcon icon={item.icon} rarity={item.rarity} size={iconSize} />
      <div className="w-full">
        <p className="truncate text-xs font-medium text-slate-200" title={item.name}>
          {item.name}
        </p>
        <p className="text-[13px] font-semibold" style={{ color: r.text }}>
          {formatCredits(item.value)} <span className="text-slate-500 font-normal">SH</span>
        </p>
        {showChance && probability !== undefined && (
          <p className="text-[10px] text-slate-500">{(probability * 100).toFixed(probability < 0.001 ? 4 : 2)}%</p>
        )}
        {highlightGold && (
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">Gold spin</p>
        )}
      </div>
    </div>
  );
}
