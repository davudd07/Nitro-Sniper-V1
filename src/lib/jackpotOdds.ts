export interface JackpotWeightInput {
  key: string;
  value: number;
}

/**
 * Individual per-player jackpot ticket weights (0..1, sums to 1). In Crazy
 * Mode the weighting inverts so lower pulls get more tickets instead of fewer.
 */
export function computeJackpotWeights(entries: JackpotWeightInput[], crazy: boolean): number[] {
  if (entries.length === 0) return [];
  const values = entries.map((e) => e.value);
  const maxVal = Math.max(...values, 0);
  const pot = values.reduce((s, v) => s + v, 0);
  const avg = pot / Math.max(1, entries.length);

  const weights = values.map((v) => (crazy ? Math.max(0.01, maxVal - v + avg * 0.15) : Math.max(0.01, v + avg * 0.05)));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  return weights.map((w) => w / weightSum);
}
