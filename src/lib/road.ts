/** Cross the Road: 96% RTP. Each lane is an independent survive-or-bust step. */

export const ROAD_RTP = 0.96;
export const ROAD_HOUSE_EDGE = 1 - ROAD_RTP;

export type RoadDifficulty = "easy" | "medium" | "hard" | "expert";

export interface RoadDifficultyDef {
  id: RoadDifficulty;
  label: string;
  /** Chance a given lane is clear. */
  survive: number;
  lanes: number;
}

export const ROAD_DIFFICULTIES: RoadDifficultyDef[] = [
  { id: "easy", label: "Easy", survive: 0.96, lanes: 24 },
  { id: "medium", label: "Medium", survive: 0.88, lanes: 20 },
  { id: "hard", label: "Hard", survive: 0.78, lanes: 16 },
  { id: "expert", label: "Expert", survive: 0.62, lanes: 12 },
];

export function roadDifficulty(id: RoadDifficulty): RoadDifficultyDef {
  return ROAD_DIFFICULTIES.find((d) => d.id === id) ?? ROAD_DIFFICULTIES[0]!;
}

/** Multiplier after `steps` successful crosses. Step 0 is the sidewalk (1.00×, no cash-out). */
export function roadMultiplier(steps: number, survive: number, rtp = ROAD_RTP): number {
  if (!(steps > 0) || !(survive > 0)) return 1;
  return rtp / Math.pow(survive, steps);
}

export function formatRoadMulti(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m >= 100) return `${Math.round(m)}×`;
  if (m >= 10) return `${m.toFixed(2)}×`;
  return `${m.toFixed(2)}×`;
}

export function roadPayout(stake: number, steps: number, survive: number): number {
  if (!(stake > 0) || !(steps > 0)) return 0;
  return Math.round(stake * roadMultiplier(steps, survive));
}

/** Lane `i` is a hit when the fair float is below the miss chance. */
export function roadLaneHits(rolls: number[], survive: number): boolean[] {
  const miss = 1 - Math.min(0.99, Math.max(0.01, survive));
  return rolls.map((r) => {
    const u = Number.isFinite(r) ? Math.min(0.999999, Math.max(0, r)) : 0;
    return u < miss;
  });
}
