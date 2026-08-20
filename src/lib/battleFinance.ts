/** Max fraction of a seat a joiner can borrow. */
export const MAX_BORROW_PCT = 0.9;

export function clampPct(n: number, min = 0, max = 1): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** What a joiner pays after creator funding (before borrow). */
export function fundedSeatCost(costPerPlayer: number, fundedPct: number): number {
  return Math.round(costPerPlayer * (1 - clampPct(fundedPct)));
}

/** What a joiner actually spends after funding and optional borrow. */
export function joinCost(costPerPlayer: number, fundedPct: number, borrowPct: number): number {
  const funded = fundedSeatCost(costPerPlayer, fundedPct);
  const borrow = fundedPct > 0 ? 0 : clampPct(borrowPct, 0, MAX_BORROW_PCT);
  return Math.round(funded * (1 - borrow));
}

/** Creator pays their own full seat plus the funded slice of every other seat. */
export function creatorCost(costPerPlayer: number, seats: number, fundedPct: number): number {
  const others = Math.max(0, seats - 1);
  return Math.round(costPerPlayer + others * costPerPlayer * clampPct(fundedPct));
}

/** Winner keeps this fraction of their pot share after borrow. */
export function keepPct(borrowPct: number): number {
  return 1 - clampPct(borrowPct, 0, MAX_BORROW_PCT);
}

export function winPayout(fullShare: number, borrowPct: number): number {
  return Math.round(fullShare * keepPct(borrowPct));
}

export function pctLabel(pct: number): string {
  return `${Math.round(clampPct(pct) * 100)}%`;
}
