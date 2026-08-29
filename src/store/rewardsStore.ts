import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_REWARDS_XP } from "../lib/xp";

const MINUTE = 60_000;
const DAY = 86_400_000;

const WEEKLY_FIRST_DELAY = 3 * DAY + 20 * MINUTE + 40_000;
const MONTHLY_FIRST_DELAY = 11 * DAY + 20 * MINUTE + 40_000;

export const WEEKLY_DROP_SH = 250;
export const MONTHLY_DROP_SH = 1_000;
export const WEEKLY_PERIOD_MS = 7 * DAY;
export const MONTHLY_PERIOD_MS = 30 * DAY;

interface RewardsState {
  xp: number;
  weeklyReadyAt: number;
  monthlyReadyAt: number;
  addXp: (amount: number) => void;
  claimWeekly: () => number;
  claimMonthly: () => number;
}

function nowPlus(ms: number): number {
  return Date.now() + ms;
}

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      xp: DEFAULT_REWARDS_XP,
      weeklyReadyAt: nowPlus(WEEKLY_FIRST_DELAY),
      monthlyReadyAt: nowPlus(MONTHLY_FIRST_DELAY),
      addXp: (amount) => {
        if (amount <= 0) return;
        set((s) => ({ xp: s.xp + Math.floor(amount) }));
      },
      claimWeekly: () => {
        if (Date.now() < get().weeklyReadyAt) return 0;
        set({ weeklyReadyAt: nowPlus(WEEKLY_PERIOD_MS) });
        return WEEKLY_DROP_SH;
      },
      claimMonthly: () => {
        if (Date.now() < get().monthlyReadyAt) return 0;
        set({ monthlyReadyAt: nowPlus(MONTHLY_PERIOD_MS) });
        return MONTHLY_DROP_SH;
      },
    }),
    { name: "prism-vault-rewards" },
  ),
);
