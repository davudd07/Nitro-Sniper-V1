import { Fragment } from "react";
import { Swords, User, Users } from "lucide-react";
import { clsx } from "clsx";
import type { BattleMode } from "../../data/battleModes";
import { TEAM_COLORS } from "../../data/battleModes";

export function ModeGlyph({
  mode,
  className,
  iconClass = "h-3.5 w-3.5",
  hideVs = false,
}: {
  mode: BattleMode;
  className?: string;
  iconClass?: string;
  /** Skip the swords between teams (shared FFA rows). */
  hideVs?: boolean;
}) {
  return (
    <span className={clsx("inline-flex max-w-full flex-wrap items-center gap-0.5", className)} title={mode.label} aria-label={mode.label}>
      {mode.teamSizes.map((size, ti) => (
        <Fragment key={ti}>
          {ti > 0 && !hideVs && (
            <Swords className="mx-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
          )}
          <span className="inline-flex items-center -space-x-0.5">
            {Array.from({ length: size }, (_, i) => (
              <User
                key={i}
                className={iconClass}
                style={{ color: TEAM_COLORS[ti % TEAM_COLORS.length] }}
                fill="currentColor"
                strokeWidth={1.5}
              />
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/** Occupied-seat dots grouped by team, with swords between teams (none for shared FFA). */
export function SeatStrip({
  flags,
  teamSizes,
  hideVs = false,
}: {
  flags: boolean[];
  teamSizes: number[];
  hideVs?: boolean;
}) {
  const groups: boolean[][] = [];
  if (hideVs || teamSizes.length === 0) {
    groups.push(flags);
  } else {
    let offset = 0;
    for (const size of teamSizes) {
      groups.push(flags.slice(offset, offset + size));
      offset += size;
    }
    if (offset < flags.length) groups.push(flags.slice(offset));
  }
  const crowded = flags.length > 6;
  const filled = flags.filter(Boolean).length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {groups.map((group, ti) => (
        <Fragment key={ti}>
          {ti > 0 && !hideVs && <Swords className="mx-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />}
          <span className="inline-flex items-center gap-0.5">
            {group.map((taken, i) => (
              <span
                key={i}
                className={clsx(
                  "grid place-items-center rounded-full text-[10px] font-bold",
                  crowded ? "h-5 w-5" : "h-6 w-6",
                  taken ? "bg-white/15 text-white" : "border border-dashed border-white/20 text-slate-600",
                )}
              >
                {taken ? <Users className={crowded ? "h-2.5 w-2.5" : "h-3 w-3"} /> : null}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
      <span className="text-[11px] text-slate-500">
        {filled}/{flags.length}
      </span>
    </span>
  );
}
