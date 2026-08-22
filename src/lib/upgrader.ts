import { ITEMS, type CaseItem } from "../data/items";
import { HOUSE_EDGE } from "./rakeback";

/** 5% Upgrader edge unless VIP admin overrides `upgrader`. */
export const UPGRADER_HOUSE_EDGE = HOUSE_EDGE.upgrader;

/** Playable floor: 1% green. Tiny enough to feel spicy, still a sane stake. */
export const UPGRADER_MIN_CHANCE = 0.01;
/** 1.00× at 5% edge is a 95% slice — never a free 100% green. */
export const UPGRADER_MIN_MULTIPLIER = 1;
export const UPGRADER_MAX_MULTIPLIER = 10_000;
/** Normal spin: ~1.75× the previous 2400ms roll, with more loops so it still feels like a spin. */
export const UPGRADER_SPIN_MS = 4200;
export const UPGRADER_EXTRA_SPINS = 12;
/** Fast spin is the previous Normal timing (no instant/0ms snap). */
export const UPGRADER_FAST_SPIN_MS = 2400;
export const UPGRADER_FAST_EXTRA_SPINS = 7;

/** Prefer the Upgrader VIP override, else the 5% Upgrader default. */
export function resolveUpgraderHouseEdge(overrides: Record<string, number> = {}): number {
  const pick = (key: string) => {
    const v = overrides[key];
    if (v != null && Number.isFinite(v)) return Math.min(0.99, Math.max(0, v));
    return null;
  };
  return pick("upgrader") ?? UPGRADER_HOUSE_EDGE;
}

/** CSS conic degrees: 0 at the top, clockwise. */
export function wrapDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Angle of a point relative to the dial center (0 = top, clockwise). */
export function degFromCenter(dx: number, dy: number): number {
  return wrapDeg((Math.atan2(dx, -dy) * 180) / Math.PI);
}

export function shortestDegDelta(from: number, to: number): number {
  let d = wrapDeg(to) - wrapDeg(from);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

let cachedCatalog: CaseItem[] | null = null;

/** Unique case-catalog items (site items with SH prices). */
export function catalogItems(): CaseItem[] {
  if (cachedCatalog) return cachedCatalog;
  const seen = new Set<string>();
  const out: CaseItem[] = [];
  for (const item of Object.values(ITEMS)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  cachedCatalog = out;
  return out;
}

/**
 * Round **up** to 2 decimal places so float dust cannot short the house.
 * 13.988 → 13.99, 13.981 → 13.99, 13.99 stays 13.99.
 */
export function ceilToCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value * 100 - 1e-9) / 100;
}

export function formatUpgraderStake(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ceilToCents(value));
}

function normalizedEdge(houseEdge: number): number {
  return Math.min(0.99, Math.max(0, houseEdge));
}

/** Max green = 1 − edge (95% at the default 5%). Never 100% (that would be +EV). */
export function upgraderMaxChance(houseEdge: number): number {
  const edge = normalizedEdge(houseEdge);
  const rtp = 1 - edge;
  if (!(rtp > 0)) return 0;
  return Math.min(rtp, 1 - Number.EPSILON);
}

export function clampUpgraderChance(chance: number, houseEdge: number): number {
  if (!(chance > 0)) return 0;
  const maxC = upgraderMaxChance(houseEdge);
  if (!(maxC > 0)) return 0;
  return Math.min(maxC, Math.max(UPGRADER_MIN_CHANCE, chance));
}

/**
 * Stake that keeps EV = chance × target = stake × (1 − edge).
 * Default 5% edge: `sourceStake = chance × target / 0.95`, then ceil-to-cents.
 */
export function stakeFromChance(chance: number, targetValue: number, houseEdge: number): number {
  if (!(targetValue > 0) || !(chance > 0)) return 0;
  const rtp = 1 - normalizedEdge(houseEdge);
  if (!(rtp > 0)) return 0;
  const clamped = clampUpgraderChance(chance, houseEdge);
  return ceilToCents((clamped * targetValue) / rtp);
}

/**
 * Win chance = (source / target) × (1 − house edge).
 * Default edge is 5%. Source may equal target at 95% (1×, still −EV). Never 100%.
 * Drag-resize and bet buttons use `clampUpgraderChance` (1% floor).
 */
export function upgraderChance(inputValue: number, targetValue: number, houseEdge: number): number {
  if (!(inputValue > 0) || !(targetValue > 0)) return 0;
  if (inputValue > targetValue) return 0;
  const rtp = 1 - normalizedEdge(houseEdge);
  const chance = (inputValue / targetValue) * rtp;
  if (!(chance > 0)) return 0;
  return Math.min(chance, upgraderMaxChance(houseEdge));
}

export function targetFromMultiplier(inputValue: number, multiplier: number): number {
  if (!(inputValue > 0) || !(multiplier >= UPGRADER_MIN_MULTIPLIER)) return 0;
  const raw = Math.round(inputValue * multiplier * 100) / 100;
  return Math.max(raw, ceilToCents(inputValue));
}

export function multiplierFromValues(inputValue: number, targetValue: number): number {
  if (!(inputValue > 0) || !(targetValue > 0)) return UPGRADER_MIN_MULTIPLIER;
  return clampMultiplier(targetValue / inputValue);
}

export function clampMultiplier(n: number): number {
  if (!Number.isFinite(n)) return UPGRADER_MIN_MULTIPLIER;
  return Math.min(UPGRADER_MAX_MULTIPLIER, Math.max(UPGRADER_MIN_MULTIPLIER, n));
}

export function closestItemNear(value: number, minExclusive: number): CaseItem | undefined {
  const pool = catalogItems().filter((item) => item.value > minExclusive);
  if (pool.length === 0) return undefined;
  let best = pool[0]!;
  let bestDist = Math.abs(best.value - value);
  for (const item of pool) {
    const dist = Math.abs(item.value - value);
    if (dist < bestDist || (dist === bestDist && item.value > best.value)) {
      best = item;
      bestDist = dist;
    }
  }
  return best;
}

export function settleUpgrade(roll: number, chance: number): boolean {
  if (!(chance > 0) || chance >= 1) return false;
  return roll < chance;
}

/**
 * Map the fair roll onto the dial. `arcStartDeg` is the player-placed start of the
 * green win slice (0 = top, clockwise). Roll 0..chance lands inside that slice.
 */
export function landDegForRoll(roll: number, chance: number, won: boolean, arcStartDeg = 0): number {
  const winSweep = Math.max(0, Math.min(360, chance * 360));
  const loseSweep = 360 - winSweep;
  const inset = 0.06;
  let rel: number;
  if (won && winSweep > 0) {
    const t = chance > 0 ? Math.min(1, Math.max(0, roll / chance)) : 0.5;
    rel = (inset + t * (1 - 2 * inset)) * winSweep;
  } else if (loseSweep <= 0) {
    rel = 180;
  } else {
    const denom = 1 - chance;
    const t = denom > 0 ? Math.min(1, Math.max(0, (roll - chance) / denom)) : 0.5;
    rel = winSweep + (inset + t * (1 - 2 * inset)) * loseSweep;
  }
  return wrapDeg(arcStartDeg + rel);
}

export function formatChancePct(chance: number): string {
  if (!(chance > 0)) return "0.00%";
  const pct = chance * 100;
  if (pct < 0.01) return `${pct.toFixed(4)}%`;
  return `${pct.toFixed(2)}%`;
}

/** Attempted upgrade multiplier for hub copy, e.g. `2.00x`. */
export function formatAttemptMultiplier(multi: number): string {
  if (!Number.isFinite(multi) || multi <= 0) return "0.00x";
  return `${multi.toFixed(2)}x`;
}

/** Winning roll band shown on the dial, e.g. `0.00–47.50`. */
export function formatRollBand(chance: number): string {
  if (!(chance > 0)) return "0.00–0.00";
  const hi = chance * 100;
  const hiStr = hi < 0.01 ? hi.toFixed(4) : hi.toFixed(2);
  return `0.00–${hiStr}`;
}

export type UpgradeSort = "price_desc" | "price_asc";

export function filterCatalog(opts: {
  query: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: UpgradeSort;
}): CaseItem[] {
  const q = opts.query.trim().toLowerCase();
  const rows = catalogItems().filter((item) => {
    if (q && !item.name.toLowerCase().includes(q)) return false;
    if (opts.minPrice != null && Number.isFinite(opts.minPrice) && item.value < opts.minPrice) return false;
    if (opts.maxPrice != null && Number.isFinite(opts.maxPrice) && item.value > opts.maxPrice) return false;
    return true;
  });
  rows.sort((a, b) => (opts.sort === "price_asc" ? a.value - b.value : b.value - a.value));
  return rows;
}
