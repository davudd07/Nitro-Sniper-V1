/**
 * Play-money ledger is ALWAYS World Locks (WL).
 *
 * Diamond Lock  = 100 WL
 * Blue Gem Lock = 100 Diamond Locks = 10,000 WL
 *
 * Display units never change stored balances, stakes, or payouts.
 * Wins, rakeback, tips, and case values are credited in WL only.
 */

export type LockUnit = "wl" | "dl" | "bgl";
export type HeaderWallet = "locks" | "shards";

export const WL_PER_DL = 100;
export const WL_PER_BGL = 10_000;

export const LOCK_UNITS: readonly LockUnit[] = ["wl", "dl", "bgl"];

export const LOCK_META: Record<
  LockUnit,
  {
    id: LockUnit;
    ticker: string;
    name: string;
    shortName: string;
    icon: string;
    wlPer: number;
    maxFractionDigits: number;
  }
> = {
  wl: {
    id: "wl",
    ticker: "WL",
    name: "World Lock",
    shortName: "World Locks",
    icon: "/images/currency/world-lock.png",
    wlPer: 1,
    maxFractionDigits: 2,
  },
  dl: {
    id: "dl",
    ticker: "DL",
    name: "Diamond Lock",
    shortName: "Diamond Locks",
    icon: "/images/currency/diamond-lock.png",
    wlPer: WL_PER_DL,
    maxFractionDigits: 4,
  },
  bgl: {
    id: "bgl",
    ticker: "BGL",
    name: "Blue Gem Lock",
    shortName: "Blue Gem Locks",
    icon: "/images/currency/blue-gem-lock.png",
    wlPer: WL_PER_BGL,
    maxFractionDigits: 6,
  },
};

export const SHARD_META = {
  ticker: "SH",
  name: "Shards",
  icon: "/images/currency/shard.png",
} as const;

export function isLockUnit(value: unknown): value is LockUnit {
  return value === "wl" || value === "dl" || value === "bgl";
}

export function wlPerUnit(unit: LockUnit): number {
  return LOCK_META[unit].wlPer;
}

/** Ledger resolution: hundredths of a World Lock. */
export function roundWl(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100 + Number.EPSILON * Math.sign(n || 1)) / 100;
}

export function worldLocksToDisplay(wl: number, unit: LockUnit): number {
  if (!Number.isFinite(wl)) return 0;
  const meta = LOCK_META[unit];
  const raw = wl / meta.wlPer;
  const f = 10 ** meta.maxFractionDigits;
  return Math.round((raw + Number.EPSILON * Math.sign(raw || 1)) * f) / f;
}

export function displayToWorldLocks(display: number, unit: LockUnit): number {
  if (!Number.isFinite(display) || display === 0) return 0;
  return roundWl(display * wlPerUnit(unit));
}

export function parseLockInput(raw: string, unit: LockUnit): number {
  const n = Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return displayToWorldLocks(n, unit);
}

export function inputStepFor(unit: LockUnit): string {
  return unit === "bgl" ? "0.000001" : unit === "dl" ? "0.0001" : "0.01";
}

export function formatLockNumber(wl: number, unit: LockUnit): string {
  const n = worldLocksToDisplay(wl, unit);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: LOCK_META[unit].maxFractionDigits,
  }).format(n);
}

export function formatLockAmount(wl: number, unit: LockUnit): string {
  return `${formatLockNumber(wl, unit)} ${LOCK_META[unit].ticker}`;
}

export function compactLockLabel(wl: number, unit: LockUnit): string {
  const n = worldLocksToDisplay(wl, unit);
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  if (Number.isInteger(n)) return String(n);
  return n
    .toFixed(LOCK_META[unit].maxFractionDigits)
    .replace(/\.?0+$/, "");
}

export function formatShardsNumber(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatShardsAmount(value: number): string {
  return `${formatShardsNumber(value)} ${SHARD_META.ticker}`;
}
