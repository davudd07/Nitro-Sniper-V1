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
}: {
  game: WinLeaderGame;
  className?: string;
}) {
  const record = useWinLeaderStore((s) => s.records[game]);
  if (!record) return null;
  return <WinLeaderMark game={game} record={record} className={className} />;
}

function WinLeaderMark({
  game,
  record,
  className,
}: {
  game: WinLeaderGame;
  record: WinLeaderRecord;
  className?: string;
}) {
  const label = ACTIVITY_GAME_LABELS[game];
  const title = `${record.name} holds the ${label} record at ${formatWinMulti(record.multiplier)}`;
  const inner = (
    <>
      <span className="max-w-[7.5rem] truncate">{record.name}</span>
      <span className="font-mono text-[10px] font-medium tabular-nums text-amber-200/75">
        {formatWinMulti(record.multiplier)}
      </span>
      <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
    </>
  );
  const styles = clsx(
    "inline-flex items-end gap-1 text-[11px] font-semibold leading-none text-amber-100",
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
