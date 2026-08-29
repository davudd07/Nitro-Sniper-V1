import { isLocalOwner } from "./owner";
import { recordWlWager } from "../store/leaderboardStore";

/**
 * Record a settled lock-ledger wager on the leaderboard and Vault Race.
 * `amount` is already World Locks (Diamond Locks and Blue Gem Locks convert at input:
 * 1 DL = 100 WL, 1 BGL = 10,000 WL). Shards must not be passed. Owner play is ignored.
 */
export function trackSettledWlWager(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) return;
  if (isLocalOwner()) return;
  recordWlWager(amount);
}
