import { useEffect } from "react";
import { useLeaderboardStore } from "../../store/leaderboardStore";
import { useFundedBattleStore } from "../../store/fundedBattleStore";
import { useRankRewardStore } from "../../store/rankRewardStore";

/** Period rollover, house-funded spawn windows, and rank-key catch-up. */
export function VaultEventsController() {
  useEffect(() => {
    const tick = () => {
      if (
        !useLeaderboardStore.persist.hasHydrated() ||
        !useFundedBattleStore.persist.hasHydrated() ||
        !useRankRewardStore.persist.hasHydrated()
      ) {
        return;
      }
      const now = Date.now();
      useLeaderboardStore.getState().tick(now);
      useFundedBattleStore.getState().tick(now);
      useRankRewardStore.getState().ensureCaughtUp();
    };
    const start = () => tick();
    start();
    const unsubs = [
      useLeaderboardStore.persist.onFinishHydration(start),
      useFundedBattleStore.persist.onFinishHydration(start),
      useRankRewardStore.persist.onFinishHydration(start),
    ];
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
      unsubs.forEach((u) => u?.());
    };
  }, []);
  return null;
}
