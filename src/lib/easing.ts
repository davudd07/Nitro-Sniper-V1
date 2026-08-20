export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/** Very fast at the start, then a progressive brake. t in [0, 1]. */
export function longBrake(t: number): number {
  const split = 0.22;
  const splitY = 0.82;
  if (t <= split) return (splitY / split) * t;
  const u = (t - split) / (1 - split);
  return splitY + (1 - splitY) * (1 - Math.pow(1 - u, 4));
}
