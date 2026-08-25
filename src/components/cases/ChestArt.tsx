import type { CSSProperties } from "react";
import { clsx } from "clsx";
import type { CaseItem } from "../../data/items";
import { ITEMS, itemImageSrc } from "../../data/items";
import { RARITIES } from "../../data/rarities";
import { CHEST_ASPECT, compactPileStickers, type ChestSticker } from "../../lib/chest";

const DYE = "/images/chests/chest-dye.png";
const LOCK = "/images/chests/chest-lock.png";

export type ChestStickerSize = "xxs" | "xs" | "sm" | "md";

const STICKER_PX: Record<ChestStickerSize, number> = {
  xxs: 12,
  xs: 16,
  sm: 24,
  md: 30,
};

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
  iconSize?: ChestStickerSize;
}) {
  const laidOut = compact ? compactPileStickers(stickers) : stickers;
  const size = iconSize ?? (compact ? "xxs" : "sm");
  const px = STICKER_PX[size];

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
        const maxxx = item.icon === "maxxx";
        const pixel = item.icon !== "sparkles";
        const ring = RARITIES[item.rarity].ring;
        return (
          <div
            key={sticker.id}
            className="pointer-events-none absolute z-[3]"
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              width: maxxx ? px * 2 : px,
              height: px,
              transform: `translate(-50%, -50%) rotate(${sticker.rotate}deg) scale(${sticker.scale})`,
              filter: compact
                ? `drop-shadow(0 1px 1px rgba(0,0,0,0.9)) drop-shadow(0 0 2px ${ring}cc)`
                : `drop-shadow(0 2px 3px rgba(0,0,0,0.75)) drop-shadow(0 0 4px ${ring}99)`,
            }}
          >
            <img
              src={itemImageSrc(item)}
              alt=""
              draggable={false}
              className={clsx("h-full w-full object-contain", pixel && "pixelated")}
            />
          </div>
        );
      })}
    </div>
  );
}
