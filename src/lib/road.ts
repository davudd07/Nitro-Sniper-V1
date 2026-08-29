/** Cross the Road: per-lane hit chance and posted multipliers. */

export type RoadDifficulty = "easy" | "medium" | "hard" | "expert";

export interface RoadDifficultyDef {
  id: RoadDifficulty;
  label: string;
  /** Chance this lane runs the chicken over. */
  hit: number;
  /** Display as "n in d". */
  hitN: number;
  hitD: number;
  survive: number;
  lanes: number;
  multipliers: number[];
}

/** Easy 24 · Medium 22 · Hard 20 · Expert 15 */
export const ROAD_MULTIPLIERS: Record<RoadDifficulty, readonly number[]> = {
  easy: [
    1, 1.04, 1.09, 1.14, 1.2, 1.26, 1.33, 1.41, 1.5, 1.6, 1.71, 1.85, 2, 2.18, 2.4, 2.67, 3, 3.43, 4, 4.8, 6, 8, 12, 24,
  ],
  medium: [
    1.09, 1.25, 1.43, 1.66, 1.94, 2.28, 2.71, 3.25, 3.94, 4.85, 6.07, 7.72, 10.04, 13.38, 18.4, 26.29, 39.43, 63.09,
    110.4, 220.8, 552, 2208,
  ],
  hard: [
    1.2, 1.52, 1.94, 2.51, 3.29, 4.39, 5.95, 8.24, 11.68, 16.98, 25.48, 39.63, 64.4, 110.4, 202.4, 404.8, 910.8, 2428.8,
    8500.8, 51004.8,
  ],
  expert: [
    1.6, 2.74, 4.85, 8.9, 16.98, 33.97, 71.71, 161.35, 391.86, 1044.96, 3134.87, 10972.06, 47545.6, 285273.6, 3138009.6,
  ],
};

type HitRatio = { n: number; d: number };

const HITS: Record<RoadDifficulty, HitRatio> = {
  easy: { n: 1, d: 20 },
  medium: { n: 3, d: 22 },
  hard: { n: 1, d: 4 },
  expert: { n: 1, d: 2.2 },
};

/** Steeper hit chance after a milestone. `afterLane` is 0-based and inclusive of the tile just reached. */
const LATE_HITS: Partial<Record<RoadDifficulty, HitRatio & { afterLane: number }>> = {
  // Easy 2.00× is the 13th tile (index 12). Later Go attempts are 1 in 8.
  easy: { n: 1, d: 8, afterLane: ROAD_MULTIPLIERS.easy.findIndex((m) => m >= 2) },
  // After the 6th medium tile (index 5), later Go attempts are 1 in 5.5.
  medium: { n: 1, d: 5.5, afterLane: 5 },
};

function def(id: RoadDifficulty, label: string): RoadDifficultyDef {
  const { n, d } = HITS[id];
  const hit = n / d;
  const multipliers = [...ROAD_MULTIPLIERS[id]];
  return { id, label, hit, hitN: n, hitD: d, survive: 1 - hit, lanes: multipliers.length, multipliers };
}

export const ROAD_DIFFICULTIES: RoadDifficultyDef[] = [
  def("easy", "Easy"),
  def("medium", "Medium"),
  def("hard", "Hard"),
  def("expert", "Expert"),
];

export function roadDifficulty(id: RoadDifficulty): RoadDifficultyDef {
  return ROAD_DIFFICULTIES.find((d) => d.id === id) ?? ROAD_DIFFICULTIES[0]!;
}

function formatHitRatio(n: number, d: number): string {
  const dLabel = Number.isInteger(d) ? String(d) : d.toFixed(1).replace(/\.0$/, "");
  return `${n} in ${dLabel}`;
}

export function formatRoadHit(def: RoadDifficultyDef): string {
  const late = LATE_HITS[def.id];
  const early = formatHitRatio(def.hitN, def.hitD);
  if (!late || late.afterLane < 0) return early;
  if (def.id === "easy") return `${early} until 2×, then ${formatHitRatio(late.n, late.d)}`;
  if (def.id === "medium") return `${early} until tile 6, then ${formatHitRatio(late.n, late.d)}`;
  return early;
}

/** Hit chance for the Go onto `laneIndex` (0 = first road tile). */
export function roadHitChance(difficulty: RoadDifficulty, laneIndex: number): number {
  const early = HITS[difficulty];
  const late = LATE_HITS[difficulty];
  const useLate = Boolean(late && late.afterLane >= 0 && laneIndex > late.afterLane);
  const { n, d } = useLate && late ? late : early;
  if (!(d > 0)) return 0;
  return n / d;
}

/** Multiplier after `steps` successful crosses. Step 0 is the sidewalk (1.00×, no cash-out). */
export function roadMultiplier(steps: number, difficulty: RoadDifficulty): number {
  if (!(steps > 0)) return 1;
  const table = ROAD_MULTIPLIERS[difficulty];
  return table[Math.min(steps, table.length) - 1] ?? 1;
}

export function formatRoadMulti(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m >= 1000) {
    const digits = Math.abs(m - Math.round(m)) < 0.005 ? 0 : 2;
    return `${m.toLocaleString("en-US", { maximumFractionDigits: digits })}×`;
  }
  return `${Number.parseFloat(m.toFixed(2))}×`;
}

/** Compact lane labels so 7-digit payouts still fit the 112px strip. */
export function formatRoadMultiShort(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(m >= 10_000_000 ? 1 : 2)}M×`;
  if (m >= 10_000) {
    const digits = Math.abs(m - Math.round(m)) < 0.005 ? 0 : 1;
    return `${m.toLocaleString("en-US", { maximumFractionDigits: digits })}×`;
  }
  return formatRoadMulti(m);
}

export function roadPayout(stake: number, steps: number, difficulty: RoadDifficulty): number {
  if (!(stake > 0) || !(steps > 0)) return 0;
  return Math.round(stake * roadMultiplier(steps, difficulty));
}

/** Lane `i` is a hit when the fair float is below that lane's miss chance. */
export function roadLaneHits(rolls: number[], difficulty: RoadDifficulty): boolean[] {
  return rolls.map((r, i) => {
    const miss = Math.min(0.99, Math.max(0.01, roadHitChance(difficulty, i)));
    const u = Number.isFinite(r) ? Math.min(0.999999, Math.max(0, r)) : 0;
    return u < miss;
  });
}

/** How many successful steps this seed allows before the first hit. */
export function roadSeedMaxSteps(hits: boolean[]): number {
  const i = hits.findIndex(Boolean);
  return i < 0 ? hits.length : i;
}

export function roadSeedMaxMulti(hits: boolean[], difficulty: RoadDifficulty): number {
  return roadMultiplier(roadSeedMaxSteps(hits), difficulty);
}
