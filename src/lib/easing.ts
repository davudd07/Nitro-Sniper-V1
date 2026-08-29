export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * CSS cubic-bezier matching easeOutQuart (easings.net).
 * Use with Web Animations / CSS so the compositor interpolates the spin
 * instead of JS sampling the curve once per rAF.
 */
export const EASE_OUT_QUART_CSS = "cubic-bezier(0.165, 0.84, 0.44, 1)";

export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/**
 * Fast start that continuously decelerates to a stop.
 * Single C∞ curve — no piecewise speed drop.
 */
export function longBrake(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 6);
}

/** Longer hang at the end than longBrake — battle jackpot strip. */
export function slowBrake(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 8);
}
