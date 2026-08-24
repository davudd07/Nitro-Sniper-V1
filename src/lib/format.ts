import { useSettingsStore } from "../store/settingsStore";
import {
  formatLockAmount,
  formatLockNumber,
  formatShardsAmount,
  formatShardsNumber,
  LOCK_META,
  type LockUnit,
} from "./money";

export function currentLockUnit(): LockUnit {
  return useSettingsStore.getState().lockUnit ?? "wl";
}

export function cashTicker(unit: LockUnit = currentLockUnit()): string {
  return LOCK_META[unit].ticker;
}

/** Play-money amount converted to the active lock unit, no ticker. */
export function formatCredits(value: number, unit: LockUnit = currentLockUnit()): string {
  return formatLockNumber(value, unit);
}

/** Play-money amount converted to the active lock unit, with ticker. */
export function formatCash(value: number, unit: LockUnit = currentLockUnit()): string {
  return formatLockAmount(value, unit);
}

/** Fractional play-money (rakeback, commission) in the active lock unit, no ticker. */
export function formatRakeback(value: number, unit: LockUnit = currentLockUnit()): string {
  return formatLockNumber(value, unit);
}

/** Shards wallet (formerly Fun Coins). Independent of lock conversion. */
export function formatFunCoins(value: number): string {
  return formatShardsNumber(value);
}

export function formatShards(value: number): string {
  return formatShardsAmount(value);
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatXp(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const digits = Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2;
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: 2 }).format(n);
}

export function formatTickets(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(n)));
}

export function shortId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
