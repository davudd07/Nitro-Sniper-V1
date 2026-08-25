/** Min / max fraction of a seat a player can borrow. Integer percents 1–90. */
export const MIN_BORROW_PCT = 0.01;
export const MAX_BORROW_PCT = 0.9;
/** Whole-percent steps on borrow sliders (1, 2, … 90 — not 5/10/15). */
export const BORROW_PCT_STEP = 0.01;

/** Snap a borrow fraction onto an integer percent in [min, MAX]. */
export function snapBorrowPct(n: number, allowZero = false): number {
  const min = allowZero ? 0 : MIN_BORROW_PCT;
  const clamped = clampPct(n, min, MAX_BORROW_PCT);
  return Math.round(clamped * 100) / 100;
}

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

/** Creator pays their own seat (after optional borrow) plus funded slices of other seats. */
export function creatorCreateCost(
  costPerPlayer: number,
  seats: number,
  fundedPct: number,
  borrowPct: number,
): number {
  const borrow = fundedPct > 0 ? 0 : clampPct(borrowPct, 0, MAX_BORROW_PCT);
  const own = Math.round(costPerPlayer * (1 - borrow));
  const others = Math.max(0, seats - 1);
  const fund = Math.round(others * costPerPlayer * clampPct(fundedPct));
  return own + fund;
}

/** Winner keeps this fraction of their pot share after borrow. Borrow 40% → keep 60%. */
export function keepPct(borrowPct: number): number {
  return 1 - clampPct(borrowPct, 0, MAX_BORROW_PCT);
}

/** Player-paid fraction of a seat. Borrow 40% means they only put up 60%. */
export function paidSeatFraction(borrowPct: number): number {
  return keepPct(borrowPct);
}

export function winPayout(fullShare: number, borrowPct: number): number {
  return Math.round(fullShare * keepPct(borrowPct));
}

/**
 * Paid-open weight for one human battle seat. Borrow 40% → 0.6 (never 1.0).
 * Funded rooms disable borrow, so the seat is fully player-funded.
 */
export function humanSeatPaidFraction(
  seat: { kind: string; slotIndex: number },
  opts: {
    fundedPct: number;
    creatorSeat?: number;
    creatorBorrowPct: number;
    /** Local player's borrow. Same as creatorBorrowPct when they hosted. */
    joinerBorrowPct: number;
  },
): number {
  if (seat.kind === "bot" || seat.kind === "empty" || seat.kind === "joining") return 0;
  if (clampPct(opts.fundedPct) > 0) return 1;
  if (seat.kind === "you") return keepPct(opts.joinerBorrowPct);
  if (seat.kind === "player" && seat.slotIndex === (opts.creatorSeat ?? 0)) {
    return keepPct(opts.creatorBorrowPct);
  }
  if (seat.kind === "player") return 1;
  return 0;
}

export function pctLabel(pct: number): string {
  return `${Math.round(clampPct(pct) * 100)}%`;
}
