import { Package } from "lucide-react";
import type { Case } from "../../data/cases";
import { clsx } from "clsx";

export function CaseThumb({ c, className }: { c: Case; className?: string }) {
  return (
    <div
      className={clsx("relative flex items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(160deg, ${c.from}, ${c.to})` }}
    >
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 45%)",
      }} />
      <Package className="h-1/2 w-1/2 text-white/90 drop-shadow-lg transition-transform group-hover:scale-110" strokeWidth={1.4} />
    </div>
  );
}
