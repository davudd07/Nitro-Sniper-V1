import { useLocation } from "react-router-dom";
import { WinLeaderBadge } from "./WinLeaderBadge";
import { isBattlesLobbyPath, useWinLeaderStore, winLeaderGameFromPath } from "../../store/winLeaderStore";

/** Slim bar under the main header. Trophy sits bottom-right; name beside it. Hidden on the battles lobby. */
export function WinLeaderStrip() {
  const { pathname } = useLocation();
  const game = winLeaderGameFromPath(pathname);
  const record = useWinLeaderStore((s) => (game ? s.records[game] : undefined));
  if (!game || isBattlesLobbyPath(pathname) || !record) return null;

  return (
    <div className="relative flex min-h-[1.625rem] shrink-0 items-end justify-end border-b border-white/[0.06] bg-[#0c1410]/80 px-4 pb-1 pr-12">
      <WinLeaderBadge game={game} />
    </div>
  );
}
