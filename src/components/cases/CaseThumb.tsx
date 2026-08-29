import { clsx } from "clsx";
import type { Case } from "../../data/cases";
import { ChestArt } from "./ChestArt";

export type CaseThumbSize = "list" | "cozy" | "tile";

function inferSize(className?: string): CaseThumbSize {
  const cn = className ?? "";
  if (/\b(h-8|w-8|h-9|w-9|h-10|w-10|h-11|w-11|h-12|w-12|h-14|w-14|h-16|w-16)\b/.test(cn)) {
    return "list";
  }
  if (/\b(h-20|h-24|h-28)\b/.test(cn)) return "cozy";
  return "tile";
}

export function CaseThumb({
  c,
  className,
  size,
}: {
  c: Case;
  className?: string;
  size?: CaseThumbSize;
}) {
  const color = c.chestColor ?? c.from;
  const stickers = c.chestStickers ?? [];
  const density = size ?? inferSize(className);
  const compact = density === "list";

  return (
    <div
      className={clsx("relative flex items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(160deg, ${c.from}, ${c.to})` }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 45%)",
        }}
      />
      <ChestArt
        color={color}
        stickers={stickers}
        compact={compact}
        iconSize={density === "list" ? "xxs" : density === "cozy" ? "xs" : "sm"}
        className={clsx(
          "relative z-[1] w-auto shrink-0 drop-shadow-lg transition-transform duration-200 group-hover:scale-105",
          compact ? "h-[96%] max-w-[96%]" : density === "cozy" ? "h-[90%] max-w-[84%]" : "h-[90%] max-w-[78%]",
        )}
      />
    </div>
  );
}
