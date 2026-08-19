import { clsx } from "clsx";
import type { RiskLevel } from "../../data/cases";

const STYLES: Record<RiskLevel, string> = {
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  high: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

const LABELS: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  return (
    <span className={clsx("inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STYLES[risk], className)}>
      {LABELS[risk]}
    </span>
  );
}
