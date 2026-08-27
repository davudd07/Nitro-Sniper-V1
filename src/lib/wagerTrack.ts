import { isLocalOwner } from "./owner";
import { recordWlWager } from "../store/leaderboardStore";

/** Record a settled World Lock wager for boards. Owner play is ignored. */
export function trackSettledWlWager(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) return;
  if (isLocalOwner()) return;
  recordWlWager(amount);
}
