export function DemoBetBadge({ active, className }: { active?: boolean; className?: string }) {
  if (!active) return null;
  return (
    <span
      className={`inline-flex items-center rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 ${className ?? ""}`}
    >
      Demo
    </span>
  );
}
