import { clsx } from "clsx";
import type { Case } from "../../data/cases";
import { ChestArt } from "./ChestArt";

export function CaseThumb({ c, className }: { c: Case; className?: string }) {
  const color = c.chestColor ?? c.from;
  const stickers = c.chestStickers ?? [];
  const compact = className?.includes("h-10") || className?.includes("w-10") || className?.includes("h-16");

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
        className="relative z-[1] h-full w-full max-w-[220px] drop-shadow-lg transition-transform duration-200 group-hover:scale-105"
      />
    </div>
  );
}
