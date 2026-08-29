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

export const KENO_RISK_BLURB: Record<KenoRisk, string> = {
  low: "Frequent small wins; pays on fewer hits.",
  medium: "Balanced; higher multipliers on deeper hits, starts paying later.",
  high: "Rare wins, biggest multipliers; often needs 4–5+ hits.",
};

/** Multiplier by [spot count][catches]. Unlisted catch counts pay 0. */
export const KENO_PAYTABLE_LOW: Record<number, Record<number, number>> = {
  1: { 0: 0.7, 1: 1.86 },
  2: { 1: 2, 2: 3.83 },
  3: { 1: 1.1, 2: 1.39, 3: 26.01 },
  4: { 2: 2.2, 3: 7.92, 4: 90.1 },
  5: { 2: 1.5, 3: 4.2, 4: 13.12, 5: 300 },
  6: { 2: 1.1, 3: 2, 4: 6.2, 5: 100, 6: 700 },
  7: { 2: 1.1, 3: 1.6, 4: 3.5, 5: 15, 6: 227, 7: 700 },
  8: { 2: 1.1, 3: 1.5, 4: 2, 5: 5.51, 6: 39, 7: 100, 8: 800 },
  9: { 2: 1.1, 3: 1.3, 4: 1.7, 5: 2.5, 6: 7.35, 7: 50, 8: 250, 9: 1000 },
  10: { 2: 1.1, 3: 1.2, 4: 1.3, 5: 1.86, 6: 3.51, 7: 13, 8: 50, 9: 250, 10: 1000 },
};

export const KENO_PAYTABLE_MEDIUM: Record<number, Record<number, number>> = {
  1: { 0: 0.4, 1: 2.76 },
  2: { 1: 1.81, 2: 5.09 },
  3: { 2: 2.8, 3: 50.01 },
  4: { 2: 1.7, 3: 9.99, 4: 101.05 },
  5: { 2: 1.4, 3: 4, 4: 14.08, 5: 390 },
  6: { 3: 3, 4: 9, 5: 180.93, 6: 710 },
  7: { 3: 2, 4: 7, 5: 30, 6: 401.6, 7: 800 },
  8: { 3: 2, 4: 4, 5: 11, 6: 67.8, 7: 400, 8: 900 },
  9: { 3: 2, 4: 2.5, 5: 5, 6: 15.25, 7: 100, 8: 500, 9: 1000 },
  10: { 3: 1.6, 4: 2, 5: 4, 6: 7, 7: 26.8, 8: 100, 9: 500, 10: 1000 },
};

export const KENO_PAYTABLE_HIGH: Record<number, Record<number, number>> = {
  1: { 1: 3.96 },
  2: { 2: 17.16 },
  3: { 3: 81.51 },
  4: { 3: 10, 4: 259.41 },
  5: { 3: 4.5, 4: 48, 5: 453 },
  6: { 4: 11, 5: 350.01, 6: 710 },
  7: { 4: 7, 5: 90.06, 6: 400, 7: 800 },
  8: { 4: 5, 5: 20, 6: 270, 7: 613, 8: 900 },
  9: { 4: 4, 5: 11, 6: 56, 7: 503, 8: 800, 9: 1000 },
  10: { 4: 3.5, 5: 8, 6: 13, 7: 63.2, 8: 500, 9: 800, 10: 1000 },
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
