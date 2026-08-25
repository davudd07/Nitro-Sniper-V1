/** Crash: 96% RTP. Cash out at C pays C× when the round survives to C. */
export const CRASH_RTP = 0.96;
export const CRASH_HOUSE_EDGE = 1 - CRASH_RTP;
export const CRASH_MAX_MULTI = 1_000;
export const CRASH_MIN_CASHOUT = 1.01;
/** Seconds to reach 2.00× on the visible curve. */
export const CRASH_TWO_X_SECONDS = 6;
export const CRASH_GROWTH = Math.log(2) / CRASH_TWO_X_SECONDS;
export const CRASH_BETTING_MS = 6_500;
export const CRASH_CRASH_HOLD_MS = 2_800;
export const CRASH_INSTANT_MS = 420;

export type CrashPhase = "betting" | "running" | "crashed";

export function roundCrash(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.round(n * 100 + Number.EPSILON * Math.sign(n || 1)) / 100;
}

export function clampCashout(n: number): number {
  if (!Number.isFinite(n)) return 2;
  return roundCrash(Math.min(CRASH_MAX_MULTI, Math.max(CRASH_MIN_CASHOUT, n)));
}

/**
 * Bustabit-style point: P(crash > m) = (1 − edge) / m.
 * Instant 1.00× chance equals the house edge. RTP at any cashout is 1 − edge.
 */
export function crashPointFromFloat(float: number, houseEdge = CRASH_HOUSE_EDGE): number {
  const edge = Math.min(0.2, Math.max(0, houseEdge));
  const r = Number.isFinite(float) ? Math.min(0.999999999999, Math.max(0, float)) : 0;
  const raw = (1 - edge) / (1 - r);
  return Math.min(CRASH_MAX_MULTI, Math.max(1, Math.floor(raw * 100) / 100));
}

export function multiplierAtElapsed(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs) / 1000;
  return Math.exp(CRASH_GROWTH * t);
}

export function elapsedMsForMultiplier(multi: number): number {
  const m = Math.max(1, multi);
  return (Math.log(m) / CRASH_GROWTH) * 1000;
}

export function flightDurationMs(crashPoint: number): number {
  if (!(crashPoint > 1)) return CRASH_INSTANT_MS;
  return elapsedMsForMultiplier(crashPoint);
}

export function displayedMultiplier(elapsedMs: number, crashPoint: number): number {
  if (!(crashPoint > 1)) return 1;
  return Math.min(crashPoint, multiplierAtElapsed(elapsedMs));
}

export function crashPayout(stake: number, cashoutAt: number): number {
  if (!(stake > 0) || !(cashoutAt >= 1)) return 0;
  return Math.round(stake * cashoutAt);
}

export function formatCrashMulti(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m >= 100) return `${Math.round(m)}×`;
  if (m >= 10) return `${m.toFixed(2)}×`;
  return `${m.toFixed(2)}×`;
}

export function crashChipTone(m: number): "mute" | "hit" | "moon" {
  if (m >= 10) return "moon";
  if (m >= 2) return "hit";
  return "mute";
}

export function seedCrashHistory(): number[] {
  return [1.21, 2.04, 1.08, 3.55, 1.44, 12.02, 1.91, 2.33, 1.03, 4.18, 1.62, 2.87];
}
