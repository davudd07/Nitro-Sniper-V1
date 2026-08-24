export const RAKEBACK_OF_EDGE = 0.04;

export const HOUSE_EDGE = {
  mines: 0.04,
  blackjack: 0.0059,
  cases: 0.04,
  jackpot: 0.09,
  coinflip: 0.04,
  battles: 0.04,
  keno: 0.06,
  upgrader: 0.05,
  dice: 0.04,
} as const;

export type HouseGame = keyof typeof HOUSE_EDGE;

/** Rakeback is 4% of the house-edge slice of the stake, not 4% of the bet. */
export function rakebackAmount(stake: number, houseEdge: number): number {
  if (stake <= 0 || houseEdge <= 0) return 0;
  return stake * houseEdge * RAKEBACK_OF_EDGE;
}
