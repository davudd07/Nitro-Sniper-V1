import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { clsx } from "clsx";
import { sound } from "../../lib/sound";
import { ACTIVITY_GAME_LABELS } from "../../store/activityStore";
import {
  formatWinMulti,
  useWinLeaderStore,
  type WinLeaderGame,
  type WinLeaderRecord,
} from "../../store/winLeaderStore";

export function WinLeaderBadge({
  game,
  className,
  compact = false,
}: {
  game: WinLeaderGame;
  className?: string;
  compact?: boolean;
}) {
  const record = useWinLeaderStore((s) => s.records[game]);
  if (!record) return null;
  return <WinLeaderMark game={game} record={record} className={className} compact={compact} />;
}

/** Small trophy + name, inset on the bottom-right of a play stage. */
export function WinLeaderStageMark({
  game,
  className,
}: {
  game: WinLeaderGame;
  className?: string;
}) {
  const record = useWinLeaderStore((s) => s.records[game]);
  if (!record) return null;
  return (
    <div className={clsx("pointer-events-auto absolute bottom-2.5 right-2.5 z-20", className)}>
      <WinLeaderMark
        game={game}
        record={record}
        compact
        className="rounded-md bg-[#07110c]/85 px-1.5 py-1 shadow-[0_0_0_1px_rgba(251,191,36,0.22)] backdrop-blur-[2px]"
      />
    </div>
  );
}

function WinLeaderMark({
  game,
  record,
  className,
  compact = false,
}: {
  game: WinLeaderGame;
  record: WinLeaderRecord;
  className?: string;
  compact?: boolean;
}) {
  const label = ACTIVITY_GAME_LABELS[game];
  const title = `${record.name} holds the ${label} record at ${formatWinMulti(record.multiplier)}`;
  const inner = compact ? (
    <>
      <Trophy className="h-3 w-3 shrink-0 text-amber-300" aria-hidden />
      <span className="max-w-[6.5rem] truncate">{record.name}</span>
    </>
  ) : (
    <>
      <span className="max-w-[7.5rem] truncate">{record.name}</span>
      <span className="font-mono text-[10px] font-medium tabular-nums text-amber-200/75">
        {formatWinMulti(record.multiplier)}
      </span>
      <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
    </>
  );
  const styles = clsx(
    "inline-flex items-center gap-1 text-[11px] font-semibold leading-none text-amber-100",
    className,
  );

  if (game === "battles" && record.battleId) {
    return (
      <Link
        to={`/battles/${record.battleId}?replay=1`}
        title={`${title} — replay this battle`}
        onClick={() => sound.click()}
        className={clsx(styles, "rounded-sm hover:text-amber-50 hover:underline")}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span title={title} className={styles}>
      {inner}
    </span>
  );
}
