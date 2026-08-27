import { utcDayKey } from "./loyalty";

export type LeaderboardPeriod = "daily" | "weekly" | "monthly";

/** Placeholder prize pools — change these later. World Locks, top 5 only. */
export const LEADERBOARD_PRIZES: Record<LeaderboardPeriod, readonly number[]> = {
  daily: [500, 300, 200, 100, 50],
  weekly: [5_000, 3_000, 2_000, 1_000, 500],
  monthly: [50_000, 30_000, 20_000, 10_000, 5_000],
};

export const LEADERBOARD_PERIOD_LABEL: Record<LeaderboardPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const LOCAL_LEADERBOARD_ID = "you";
export const HIDDEN_LEADERBOARD_NAME = "Hidden";

export interface LeaderboardKeys {
  daily: string;
  weekly: string;
  monthly: string;
}

/** ISO week key in UTC, Monday-start (e.g. 2026-W35). */
export function utcWeekKey(at = Date.now()): string {
  const d = new Date(at);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function utcMonthKey(at = Date.now()): string {
  const d = new Date(at);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function leaderboardKeys(at = Date.now()): LeaderboardKeys {
  return {
    daily: utcDayKey(at),
    weekly: utcWeekKey(at),
    monthly: utcMonthKey(at),
  };
}

export function prizeForPlace(period: LeaderboardPeriod, place: number): number {
  if (place < 1 || place > 5) return 0;
  return LEADERBOARD_PRIZES[period][place - 1] ?? 0;
}
