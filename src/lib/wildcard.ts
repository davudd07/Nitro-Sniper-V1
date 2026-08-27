export type WildcardMulti = 0 | 0.5 | 0.75 | 2 | 5 | 10;
export type WildcardTone = "up" | "down";

export interface WildcardRow {
  multi: WildcardMulti;
  chance: number;
  tone: WildcardTone;
}

/** Per-player end-of-battle multiplier. Chances sum to 1. */
export const WILDCARD_ROWS: WildcardRow[] = [
  { multi: 2, chance: 0.28, tone: "up" },
  { multi: 0.75, chance: 0.2, tone: "down" },
  { multi: 0.5, chance: 0.29, tone: "down" },
  { multi: 0, chance: 0.15, tone: "down" },
  { multi: 5, chance: 0.05, tone: "up" },
  { multi: 10, chance: 0.03, tone: "up" },
];

const WILDCARD_SET = new Set<number>(WILDCARD_ROWS.map((row) => row.multi));

export function isWildcardMulti(value: number): value is WildcardMulti {
  return WILDCARD_SET.has(value);
}

export function wildcardTone(multi: number): WildcardTone {
  return multi >= 2 ? "up" : "down";
}

export function formatWildcard(multi: number): string {
  if (multi === 0) return "0x";
  if (multi === 10 || multi === 5 || multi === 2) return `${multi}x`;
  if (multi === 0.75) return "0.75x";
  if (multi === 0.5) return "0.5x";
  return `${multi}x`;
}

export function pickWildcard(roll: number): WildcardMulti {
  const x = Number.isFinite(roll) ? Math.min(0.999999999, Math.max(0, roll)) : 0;
  let acc = 0;
  for (const row of WILDCARD_ROWS) {
    acc += row.chance;
    if (x < acc) return row.multi;
  }
  return WILDCARD_ROWS[WILDCARD_ROWS.length - 1]!.multi;
}

export function applyWildcard(value: number, multi: number | null | undefined): number {
  if (multi == null) return value;
  return value * multi;
}

export function wildcardMapFromUnknown(
  raw: Record<string | number, number> | null | undefined,
): Record<number, WildcardMulti> {
  const out: Record<number, WildcardMulti> = {};
  if (!raw) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && isWildcardMulti(v)) out[Number(k)] = v;
  }
  return out;
}

const FAST_SPIN_MS = 2600;
const NORMAL_SPIN_MS = 3800;
const FAST_HOLD_MS = 900;
const NORMAL_HOLD_MS = 1400;
const LANE_STAGGER_MS = 180;

export function wildcardBaseSpinMs(fastSpin: boolean): number {
  return fastSpin ? FAST_SPIN_MS : NORMAL_SPIN_MS;
}

export function wildcardLaneSpinMs(fastSpin: boolean, laneSeed: number): number {
  return wildcardBaseSpinMs(fastSpin) + Math.max(0, laneSeed) * LANE_STAGGER_MS;
}

/** Time the room stays on the Wildcard phase: longest lane spin + land hold. */
export function wildcardPhaseMs(fastSpin: boolean, slotIndexes: number[]): number {
  const maxSeed = slotIndexes.length > 0 ? Math.max(0, ...slotIndexes) : 0;
  const hold = fastSpin ? FAST_HOLD_MS : NORMAL_HOLD_MS;
  return wildcardLaneSpinMs(fastSpin, maxSeed) + hold;
}
