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

/** Compact trophy + name. Overlay sits in the bottom-right of a `relative` green `surface`; `inline` docks it in-flow so it cannot cover action buttons. */
export function WinLeaderStageMark({
  game,
  className,
  inline = false,
}: {
  game: WinLeaderGame;
  className?: string;
  /** Place the mark in document flow (e.g. beside a full-width Upgrade button). */
  inline?: boolean;
}) {
  const record = useWinLeaderStore((s) => s.records[game]);
  if (!record) return null;
  return (
    <div
      className={clsx(
        "pointer-events-auto",
        inline
          ? "relative shrink-0"
          : "absolute bottom-2 right-2 z-20 sm:bottom-3 sm:right-3",
        className,
      )}
    >
      <WinLeaderMark
        game={game}
        record={record}
        compact
        className="rounded-md bg-[#07110c]/90 px-1.5 py-1 shadow-[0_0_0_1px_rgba(251,191,36,0.28)] backdrop-blur-[2px]"
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
