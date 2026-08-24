import type { CSSProperties } from "react";
import { clsx } from "clsx";
import type { CaseItem } from "../../data/items";
import { ITEMS } from "../../data/items";
import { ItemIcon } from "../ui/ItemIcon";
import { CHEST_ASPECT, compactPileStickers, type ChestSticker } from "../../lib/chest";

const DYE = "/images/chests/chest-dye.png";
const LOCK = "/images/chests/chest-lock.png";

export function ChestArt({
  color,
  stickers = [],
  className,
  compact = false,
  iconSize,
}: {
  color: string;
  stickers?: ChestSticker[];
  className?: string;
  compact?: boolean;
  iconSize?: "xs" | "sm" | "md";
}) {
  const laidOut = compact ? compactPileStickers(stickers) : stickers;
  const size = iconSize ?? (compact ? "xs" : "md");

  return (
    <div className={clsx("relative isolate", className)} style={{ aspectRatio: `${CHEST_ASPECT}` }}>
      <div
        className="absolute inset-0 isolate"
        style={{
          WebkitMaskImage: `url(${DYE})`,
          maskImage: `url(${DYE})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          maskMode: "luminance",
          WebkitMaskSourceType: "luminance",
          backgroundColor: color,
        } as CSSProperties}
      >
        <img
          src={DYE}
          alt=""
          draggable={false}
          className="h-full w-full object-contain opacity-90 mix-blend-multiply"
        />
      </div>
      <img
        src={LOCK}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-contain"
      />
      {laidOut.map((sticker) => {
        const item = ITEMS[sticker.itemId] as CaseItem | undefined;
        if (!item) return null;
        return (
          <div
            key={sticker.id}
            className={clsx(
              "pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-1/2",
              compact ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]" : "drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]",
            )}
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotate}deg) scale(${sticker.scale})`,
            }}
          >
            <ItemIcon icon={item.icon} rarity={item.rarity} size={size} lite />
          </div>
        );
      })}
    </div>
  );
}
