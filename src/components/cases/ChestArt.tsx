import { clsx } from "clsx";
import type { CaseItem } from "../../data/items";
import { ITEMS } from "../../data/items";
import { ItemIcon } from "../ui/ItemIcon";
import { CHEST_ASPECT, type ChestSticker } from "../../lib/chest";

const DYE = "/images/chests/chest-dye.png";
const WOOD = "/images/chests/chest-wood.png";
const LOCK = "/images/chests/chest-lock.png";

export function ChestArt({
  color,
  stickers = [],
  className,
  compact = false,
}: {
  color: string;
  stickers?: ChestSticker[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={clsx("relative isolate", className)} style={{ aspectRatio: `${CHEST_ASPECT}` }}>
      <img src={WOOD} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
      <div
        className="absolute inset-0"
        style={{
          WebkitMaskImage: `url(${DYE})`,
          maskImage: `url(${DYE})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          backgroundColor: color,
        }}
      >
        <img
          src={DYE}
          alt=""
          draggable={false}
          className="h-full w-full object-contain opacity-90 mix-blend-multiply"
        />
      </div>
      {stickers.map((sticker) => {
        const item = ITEMS[sticker.itemId] as CaseItem | undefined;
        if (!item) return null;
        const size = compact ? "sm" : "md";
        return (
          <div
            key={sticker.id}
            className="pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]"
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
      <img
        src={LOCK}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 z-[3] h-full w-full object-contain"
      />
    </div>
  );
}
