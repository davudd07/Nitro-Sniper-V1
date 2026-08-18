export type Suit = "♠" | "♥" | "♦" | "♣";
export interface Card {
  rank: string;
  suit: Suit;
  value: number;
}

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const value = rank === "A" ? 11 : ["J", "Q", "K"].includes(rank) ? 10 : Number(rank);
      deck.push({ rank, suit, value });
    }
  }
  return deck;
}

/** Deterministic shuffle driven by provably-fair rolls (Fisher-Yates). */
export function shuffleDeck(deck: Card[], rolls: number[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rolls[arr.length - 1 - i] * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function handTotal(cards: Card[]): { total: number; soft: boolean } {
  let total = cards.reduce((s, c) => s + c.value, 0);
  let acesAsEleven = cards.filter((c) => c.rank === "A").length;
  while (total > 21 && acesAsEleven > 0) {
    total -= 10;
    acesAsEleven -= 1;
  }
  // "Soft" means at least one ace is still being counted as 11.
  return { total, soft: acesAsEleven > 0 };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards).total === 21;
}
