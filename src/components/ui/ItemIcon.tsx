import type { IconKey } from "../../data/items";
import { RARITIES, type RarityId } from "../../data/rarities";
import { clsx } from "clsx";

export function ItemIcon({
  icon,
  rarity,
  className,
  size = "md",
  glow = false,
}: {
  icon: IconKey;
  rarity: RarityId;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}) {
  const r = RARITIES[rarity];
  const dims = { sm: "h-8 w-8 p-1", md: "h-14 w-14 p-1.5", lg: "h-20 w-20 p-2", xl: "h-28 w-28 p-3" }[size];

  return (
    <div
      className={clsx("overflow-hidden rounded-xl shrink-0", dims, className)}
      style={{
        background: `linear-gradient(155deg, ${r.from}55, ${r.to}dd)`,
        boxShadow: glow ? `0 0 24px ${r.ring}88, inset 0 0 20px ${r.ring}33` : `inset 0 0 12px ${r.ring}22`,
        border: `1px solid ${r.ring}66`,
      }}
    >
      <img
        src={`/images/items/${icon}.webp`}
        alt=""
        loading="lazy"
        className="h-full w-full rounded-lg object-cover"
        draggable={false}
      />
    </div>
  );
}
