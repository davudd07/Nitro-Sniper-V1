export const KENO_BALLS = 40;
export const KENO_DRAWN = 10;
export const KENO_MIN_SPOTS = 1;
export const KENO_MAX_SPOTS = 10;
export const KENO_BET_PRESETS = [25, 50, 100, 250, 500, 1000] as const;
export const KENO_DEFAULT_BET = 100;

export const KENO_RISKS = ["low", "medium", "high"] as const;
export type KenoRisk = (typeof KENO_RISKS)[number];

export const KENO_RISK_LABEL: Record<KenoRisk, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Multiplier by [spot count][catches]. Unlisted catch counts pay 0. */
export const KENO_PAYTABLE_MEDIUM: Record<number, Record<number, number>> = {
  1: { 1: 3.5 },
  2: { 2: 12 },
  3: { 2: 2, 3: 35 },
  4: { 2: 1, 3: 5, 4: 70 },
  5: { 3: 3, 4: 12, 5: 250 },
  6: { 3: 2, 4: 6, 5: 40, 6: 800 },
  7: { 3: 1, 4: 3, 5: 15, 6: 120, 7: 2500 },
  8: { 4: 2, 5: 8, 6: 40, 7: 300, 8: 5000 },
  9: { 4: 1, 5: 4, 6: 20, 7: 100, 8: 800, 9: 10000 },
  10: { 5: 3, 6: 12, 7: 60, 8: 300, 9: 2000, 10: 15000 },
};

/** More frequent small pays, lower tops. */
export const KENO_PAYTABLE_LOW: Record<number, Record<number, number>> = {
  1: { 1: 2.4 },
  2: { 1: 0.4, 2: 7 },
  3: { 2: 1.6, 3: 18 },
  4: { 2: 1.2, 3: 3.5, 4: 28 },
  5: { 2: 0.6, 3: 2.2, 4: 8, 5: 80 },
  6: { 3: 1.5, 4: 4, 5: 16, 6: 220 },
  7: { 3: 1, 4: 2.4, 5: 8, 6: 45, 7: 700 },
  8: { 4: 1.5, 5: 5, 6: 16, 7: 80, 8: 1400 },
  9: { 4: 1, 5: 3, 6: 10, 7: 36, 8: 220, 9: 2800 },
  10: { 4: 0.7, 5: 2, 6: 6, 7: 18, 8: 70, 9: 400, 10: 3500 },
};

/** Fewer mid hits, larger max. */
export const KENO_PAYTABLE_HIGH: Record<number, Record<number, number>> = {
  1: { 1: 4.8 },
  2: { 2: 18 },
  3: { 3: 55 },
  4: { 3: 8, 4: 120 },
  5: { 4: 18, 5: 450 },
  6: { 4: 8, 5: 55, 6: 1400 },
  7: { 5: 22, 6: 180, 7: 4500 },
  8: { 5: 12, 6: 70, 7: 480, 8: 9000 },
  9: { 6: 28, 7: 150, 8: 1400, 9: 18000 },
  10: { 6: 16, 7: 80, 8: 450, 9: 3200, 10: 25000 },
};

export const KENO_PAYTABLES: Record<KenoRisk, Record<number, Record<number, number>>> = {
  low: KENO_PAYTABLE_LOW,
  medium: KENO_PAYTABLE_MEDIUM,
  high: KENO_PAYTABLE_HIGH,
};

/** @deprecated Use KENO_PAYTABLES.medium — kept for existing imports. */
export const KENO_PAYTABLE = KENO_PAYTABLE_MEDIUM;

/** Approximate odds of hitting the top catch for each spot count (40-ball / 10-draw). */
export const KENO_TOP_ODDS: Record<number, string> = {
  1: "~1 in 4",
  2: "~1 in 13",
  3: "~1 in 48",
  4: "~1 in 195",
  5: "~1 in 850",
  6: "~1 in 4,000",
  7: "~1 in 20,000",
  8: "~1 in 110,000",
  9: "~1 in 650,000",
  10: "~1 in 4,200,000",
};

export function kenoTable(risk: KenoRisk = "medium"): Record<number, Record<number, number>> {
  return KENO_PAYTABLES[risk] ?? KENO_PAYTABLE_MEDIUM;
}

export function kenoMultiplier(spots: number, catches: number, risk: KenoRisk = "medium"): number {
  return kenoTable(risk)[spots]?.[catches] ?? 0;
}

export function paytableRows(spots: number, risk: KenoRisk = "medium"): { catches: number; multiplier: number }[] {
  const table = kenoTable(risk)[spots];
  if (!table) return [];
  return Object.entries(table)
    .map(([catches, multiplier]) => ({ catches: Number(catches), multiplier }))
    .sort((a, b) => a.catches - b.catches);
}

export function kenoCatches(picks: number[], drawn: number[]): number {
  const set = new Set(drawn);
  return picks.reduce((n, p) => n + (set.has(p) ? 1 : 0), 0);
}

export function kenoPayout(bet: number, spots: number, catches: number, risk: KenoRisk = "medium"): number {
  return Math.round(bet * kenoMultiplier(spots, catches, risk));
}

/** Shuffle 1..40 from 40 independent [0,1) rolls and take the first 10. */
export function drawKeno(rolls: number[]): number[] {
  const n = Math.min(rolls.length, KENO_BALLS);
  const order = Array.from({ length: n }, (_, i) => ({ r: rolls[i], num: i + 1 }));
  order.sort((a, b) => a.r - b.r);
  return order.slice(0, KENO_DRAWN).map((o) => o.num);
}

export function quickPick(count = KENO_MAX_SPOTS): number[] {
  const size = Math.min(KENO_MAX_SPOTS, Math.max(KENO_MIN_SPOTS, count));
  const pool = Array.from({ length: KENO_BALLS }, (_, i) => i + 1);
  const buf = new Uint32Array(pool.length);
  crypto.getRandomValues(buf);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = buf[i]! % (i + 1);
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, size).sort((a, b) => a - b);
}
