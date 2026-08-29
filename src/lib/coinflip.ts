export type CoinSide = "heads" | "tails";

export const COIN_BASE_MULT = 1.92;
export const COIN_MAX_WINS = 10;
/** 1.92 × 2^9 — ten consecutive wins auto-cash out. */
export const COIN_MAX_MULT = 983.04;

export function roundMult(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Payout multiplier after `wins` consecutive correct guesses (0 before the first win). */
export function currentMultiplier(wins: number): number {
  if (wins <= 0) return 0;
  return roundMult(COIN_BASE_MULT * 2 ** (wins - 1));
}

/** Multiplier the next correct guess would pay, given wins so far. */
export function nextMultiplier(wins: number): number {
  if (wins >= COIN_MAX_WINS) return COIN_MAX_MULT;
  return roundMult(COIN_BASE_MULT * 2 ** wins);
}

export function isMaxWin(wins: number): boolean {
  return wins >= COIN_MAX_WINS;
}

export function rollCoin(float: number): CoinSide {
  return float < 0.5 ? "heads" : "tails";
}

export function payoutFor(bet: number, wins: number): number {
  return Math.round(bet * currentMultiplier(wins));
}
