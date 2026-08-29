import { ACTIVITY_GAME_LABELS, type ActivityGame } from "../store/activityStore";
import { useChatStore } from "../store/chatStore";

/** Public chat shout when a real-stake round pays at least this multiplier. */
export const BIG_WIN_SHOUT_MIN = 10;

const SHOUT_GAME_LABELS: Record<ActivityGame, string> = {
  ...ACTIVITY_GAME_LABELS,
  battles: "Battles",
};

function formatShoutMulti(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return `${Math.round(n)}x`;
  if (n >= 10) return `${n.toFixed(1)}x`;
  return `${n.toFixed(2)}x`;
}

export function formatBigWinShout(name: string, multiplier: number, game: ActivityGame): string {
  return `${name} won ${formatShoutMulti(multiplier)} on ${SHOUT_GAME_LABELS[game]}`;
}

/** Post a local demo chat line for 10×+ hits. Skips demo 0-stake rounds. */
export function maybeShoutBigWin(name: string, wagered: number, won: number, game: ActivityGame): void {
  if (!(wagered > 0) || !(won > 0)) return;
  const multiplier = won / wagered;
  if (!Number.isFinite(multiplier) || multiplier < BIG_WIN_SHOUT_MIN) return;
  const who = name.trim() || "You";
  useChatStore.getState().post({
    name: "VaultBot",
    color: "#fbbf24",
    shout: true,
    text: formatBigWinShout(who, multiplier, game),
  });
}
