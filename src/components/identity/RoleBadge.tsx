import { clsx } from "clsx";
import { VISUAL_ROLE_META, type VisualRole } from "../../lib/identity";

export function RoleBadge({ role, className }: { role: VisualRole | null | undefined; className?: string }) {
  if (!role) return null;
  const meta = VISUAL_ROLE_META[role];
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-black uppercase tracking-wide",
        className,
      )}
      style={{ color: meta.color, background: `${meta.color}22`, boxShadow: `inset 0 0 0 1px ${meta.color}55` }}
    >
      {meta.label}
    </span>
  );
}
