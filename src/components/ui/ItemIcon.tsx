import type { IconKey } from "../../data/items";
import { RARITIES, type RarityId } from "../../data/rarities";
import { clsx } from "clsx";

export function ItemIcon({
  icon,
  rarity,
  className,
  size = "md",
  glow = false,
  lite = false,
}: {
  icon: IconKey;
  rarity: RarityId;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  /** Skip inset shadows and lazy-load; used by spinning case reels. */
  lite?: boolean;
}) {
  const maxxx = icon === "maxxx";
  const r = RARITIES[rarity];
  const dims = maxxx
    ? { sm: "h-8 w-16 p-0.5", md: "h-12 w-24 p-1", lg: "h-16 w-32 p-1.5", xl: "h-20 w-40 p-2" }[size]
    : { sm: "h-8 w-8 p-1", md: "h-14 w-14 p-1.5", lg: "h-20 w-20 p-2", xl: "h-28 w-28 p-3" }[size];

  if (maxxx) {
    return (
      <div className={clsx("shrink-0", dims, className)}>
        <img
          src="/images/items/maxxx.png"
          alt=""
          loading={lite ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx("overflow-hidden rounded-xl shrink-0", dims, className)}
      style={{
        background: `linear-gradient(155deg, ${r.from}55, ${r.to}dd)`,
        boxShadow: lite ? undefined : glow ? `0 0 24px ${r.ring}88, inset 0 0 20px ${r.ring}33` : `inset 0 0 12px ${r.ring}22`,
        border: `1px solid ${r.ring}66`,
      }}
    >
      <img
        src={`/images/items/${icon}.webp`}
        alt=""
        loading={lite ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full rounded-lg object-cover"
        draggable={false}
      />
    </div>
  );
}
