import { clsx } from "clsx";
import type { SlotSymbol } from "../../lib/slots";

export function SlotGlyph({
  symbol,
  size = "md",
  win = false,
}: {
  symbol: SlotSymbol;
  size?: "sm" | "md" | "lg";
  win?: boolean;
}) {
  const dim = size === "lg" ? "h-[4.6rem] w-[4.6rem] text-lg" : size === "sm" ? "h-11 w-11 text-[11px]" : "h-14 w-14 text-sm";
  return (
    <div
      className={clsx(
        "grid place-items-center rounded-md border-2 font-black tracking-wide shadow-[2px_2px_0_#050808]",
        dim,
        win && "ring-2 ring-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.45)]",
      )}
      style={{
        background: `radial-gradient(circle at 30% 25%, ${symbol.ink}33, ${symbol.fill})`,
        borderColor: symbol.ring,
        color: symbol.ink,
      }}
      title={symbol.label}
    >
      <span className="pixel-label leading-none">{symbol.mark}</span>
    </div>
  );
}
