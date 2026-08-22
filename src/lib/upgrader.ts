import { ITEMS, type CaseItem } from "../data/items";
import { HOUSE_EDGE } from "./rakeback";

/** Same originals/cases edge unless VIP admin overrides `upgrader` (or `cases`). */
export const UPGRADER_HOUSE_EDGE = HOUSE_EDGE.upgrader;

export const UPGRADER_MIN_MULTIPLIER = 1.01;
export const UPGRADER_MAX_MULTIPLIER = 10_000;
export const UPGRADER_SPIN_MS = 2400;
export const UPGRADER_FAST_SPIN_MS = 780;
export const UPGRADER_INSTANT_SPIN_MS = 90;

/** Prefer the Upgrader VIP override, else the cases/originals edge, else 4%. */
export function resolveUpgraderHouseEdge(overrides: Record<string, number> = {}): number {
  const pick = (key: string) => {
    const v = overrides[key];
    if (v != null && Number.isFinite(v)) return Math.min(0.99, Math.max(0, v));
    return null;
  };
  return pick("upgrader") ?? pick("cases") ?? UPGRADER_HOUSE_EDGE;
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
 * Win chance = (input / target) × (1 − house edge).
 * Always strictly below 100%. Input must be below target so the house keeps its edge
 * (an even or overpay trade is rejected rather than paying above EV).
 */
export function upgraderChance(inputValue: number, targetValue: number, houseEdge: number): number {
  if (!(inputValue > 0) || !(targetValue > 0)) return 0;
  const edge = Math.min(0.99, Math.max(0, houseEdge));
  if (inputValue >= targetValue) return 0;
  const chance = (inputValue / targetValue) * (1 - edge);
  const cap = 1 - edge;
  if (!(chance > 0)) return 0;
  const clamped = Math.min(chance, cap);
  if (!(clamped > 0) || clamped >= 1) return 0;
  return clamped;
}

export function targetFromMultiplier(inputValue: number, multiplier: number): number {
  if (!(inputValue > 0) || !(multiplier > 1)) return 0;
  const raw = Math.round(inputValue * multiplier);
  return Math.max(raw, Math.floor(inputValue) + 1);
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

/** Map the fair roll into a landing angle (0 = top / start of the winning arc). */
export function landDegForRoll(roll: number, chance: number, won: boolean): number {
  const winSweep = Math.max(0, Math.min(360, chance * 360));
  const loseSweep = 360 - winSweep;
  const inset = 0.06;
  if (won && winSweep > 0) {
    const t = chance > 0 ? Math.min(1, Math.max(0, roll / chance)) : 0.5;
    return (inset + t * (1 - 2 * inset)) * winSweep;
  }
  if (loseSweep <= 0) return 180;
  const denom = 1 - chance;
  const t = denom > 0 ? Math.min(1, Math.max(0, (roll - chance) / denom)) : 0.5;
  return winSweep + (inset + t * (1 - 2 * inset)) * loseSweep;
}

export function formatChancePct(chance: number): string {
  if (!(chance > 0)) return "0%";
  const pct = chance * 100;
  if (pct < 0.01) return `${pct.toFixed(4)}%`;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(2)}%`;
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
