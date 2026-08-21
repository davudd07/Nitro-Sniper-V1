import { Fragment } from "react";
import { User } from "lucide-react";
import { clsx } from "clsx";
import type { BattleMode } from "../../data/battleModes";
import { TEAM_COLORS } from "../../data/battleModes";

export function ModeGlyph({
  mode,
  className,
  iconClass = "h-3.5 w-3.5",
}: {
  mode: BattleMode;
  className?: string;
  iconClass?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-0.5", className)} title={mode.label} aria-label={mode.label}>
      {mode.teamSizes.map((size, ti) => (
        <Fragment key={ti}>
          {ti > 0 && (
            <span className="px-0.5 text-[10px] font-black leading-none text-slate-500" aria-hidden>
              ×
            </span>
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
