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

const RED_SUITS = new Set<Suit>(["♥", "♦"]);
function isRed(suit: Suit): boolean {
  return RED_SUITS.has(suit);
}

// --- Side bets -------------------------------------------------------------
// "Perfect Pairs" and "21+3" are generic, widely-offered blackjack side-bet
// variants found across countless casinos (not exclusive to any one brand).
// Paytables below are standard industry-common figures.

export type PerfectPairsTier = "none" | "mixed" | "colored" | "perfect";

export interface PerfectPairsResult {
  tier: PerfectPairsTier;
  multiplier: number;
}

const PERFECT_PAIRS_PAYOUTS: Record<PerfectPairsTier, number> = {
  none: 0,
  mixed: 6,
  colored: 12,
  perfect: 25,
};

/** Evaluates the player's first two cards for a Perfect Pairs side bet. */
export function evaluatePerfectPairs(hand: [Card, Card]): PerfectPairsResult {
  const [a, b] = hand;
  if (a.rank !== b.rank) return { tier: "none", multiplier: 0 };
  if (a.suit === b.suit) return { tier: "perfect", multiplier: PERFECT_PAIRS_PAYOUTS.perfect };
  if (isRed(a.suit) === isRed(b.suit)) return { tier: "colored", multiplier: PERFECT_PAIRS_PAYOUTS.colored };
  return { tier: "mixed", multiplier: PERFECT_PAIRS_PAYOUTS.mixed };
}

export type TwentyOnePlusThreeTier = "none" | "flush" | "straight" | "threeOfAKind" | "straightFlush";

export interface TwentyOnePlusThreeResult {
  tier: TwentyOnePlusThreeTier;
  multiplier: number;
}

const TWENTY_ONE_PLUS_THREE_PAYOUTS: Record<TwentyOnePlusThreeTier, number> = {
  none: 0,
  flush: 5,
  straight: 10,
  threeOfAKind: 30,
  straightFlush: 40,
};

const RANK_ORDER = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/** Evaluates the player's first two cards + dealer's up-card as a 3-card poker hand. */
export function evaluateTwentyOnePlusThree(cards: [Card, Card, Card]): TwentyOnePlusThreeResult {
  const ranks = cards.map((c) => c.rank);
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
  const isThreeOfAKind = ranks[0] === ranks[1] && ranks[1] === ranks[2];

  const indices = ranks.map((r) => RANK_ORDER.indexOf(r)).sort((x, y) => x - y);
  const isSequential = indices[2] - indices[1] === 1 && indices[1] - indices[0] === 1;
  // Ace can also play low, completing Q-K-A as a straight.
  const isAceHighStraight = indices[0] === 0 && indices[1] === 11 && indices[2] === 12;
  const isStraight = isSequential || isAceHighStraight;

  let tier: TwentyOnePlusThreeTier = "none";
  if (isThreeOfAKind) tier = "threeOfAKind";
  else if (isStraight && isFlush) tier = "straightFlush";
  else if (isFlush) tier = "flush";
  else if (isStraight) tier = "straight";

  return { tier, multiplier: TWENTY_ONE_PLUS_THREE_PAYOUTS[tier] };
}
