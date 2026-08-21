import { HOUSE_EDGE } from "./rakeback";

/** Loyalty categories used for flat rates and house-edge multipliers. */
export const XP_CATEGORIES = ["originals", "slots", "live_casino", "sports"] as const;
export type XpCategory = (typeof XP_CATEGORIES)[number];

export const XP_CATEGORY_LABELS: Record<XpCategory, string> = {
  originals: "Originals / House",
  slots: "Slots",
  live_casino: "Live Casino",
  sports: "Sports",
};

export type XpMode = "flat" | "house_edge";
export type XpSource = "wager" | "boost" | "mission" | "admin";
export type WagerCurrency = "shard" | "fun";

export interface LoyaltyGameDef {
  id: string;
  label: string;
  category: XpCategory;
  /** Assumed house edge used in house-edge XP mode (admin can override). */
  houseEdge: number;
}

export interface VipTier {
  id: string;
  name: string;
  minXp: number;
  color: string;
  benefits: string;
  /** Extra Instant Drop rakeback, e.g. 0.1 = +10%. */
  rakebackBonusPct: number;
}

export interface LoyaltyMission {
  id: string;
  title: string;
  description: string;
  kind: "wager_sh";
  target: number;
  bonusXp: number;
  period: "daily";
}

export interface XpBoost {
  id: string;
  /** `"*"` applies to every player. */
  userId: string | "*";
  multiplier: number;
  extraXpPerWager: number;
  startsAt: number;
  endsAt: number;
  reason: string;
}

export interface XpTransaction {
  id: string;
  userId: string;
  betId: string;
  amountWagered: number;
  gameType: string;
  category: XpCategory;
  mode: XpMode;
  houseEdge: number;
  categoryMultiplier: number;
  flatRate: number;
  boostMultiplier: number;
  calculatedXp: number;
  source: XpSource;
  reason: string;
  timestamp: number;
}

export interface LoyaltyConfig {
  mode: XpMode;
  /** XP per 1 SH wagered, by category (flat mode). */
  flatRates: Record<XpCategory, number>;
  /** Multiplier on house-edge XP, by category. */
  categoryMultipliers: Record<XpCategory, number>;
  /** Per-game house edges (admin-editable). */
  houseEdges: Record<string, number>;
  tiers: VipTier[];
  missions: LoyaltyMission[];
}

/** Live + coming-soon tables. House edges match `HOUSE_EDGE` where the game exists. */
export const LOYALTY_GAMES: LoyaltyGameDef[] = [
  { id: "mines", label: "Mines", category: "originals", houseEdge: HOUSE_EDGE.mines },
  { id: "blackjack", label: "Blackjack", category: "originals", houseEdge: HOUSE_EDGE.blackjack },
  { id: "cases", label: "Cases", category: "originals", houseEdge: HOUSE_EDGE.cases },
  { id: "battles", label: "Case Battles", category: "originals", houseEdge: HOUSE_EDGE.battles },
  { id: "jackpot", label: "Jackpot", category: "originals", houseEdge: HOUSE_EDGE.jackpot },
  { id: "coinflip", label: "Coin Flip", category: "originals", houseEdge: HOUSE_EDGE.coinflip },
  { id: "keno", label: "Keno", category: "originals", houseEdge: HOUSE_EDGE.keno },
  { id: "plinko", label: "Plinko", category: "originals", houseEdge: 0.04 },
  { id: "dice", label: "Dice", category: "originals", houseEdge: 0.04 },
  { id: "roulette", label: "Roulette", category: "live_casino", houseEdge: 0.027 },
  { id: "baccarat", label: "Baccarat", category: "live_casino", houseEdge: 0.0106 },
  { id: "slots", label: "Slots", category: "slots", houseEdge: 0.04 },
  { id: "sports", label: "Sports", category: "sports", houseEdge: 0.05 },
];

export const GAME_CATEGORY: Record<string, XpCategory> = Object.fromEntries(
  LOYALTY_GAMES.map((g) => [g.id, g.category]),
) as Record<string, XpCategory>;

export const DEFAULT_FLAT_RATES: Record<XpCategory, number> = {
  originals: 0.2,
  slots: 0.2,
  live_casino: 0.2,
  sports: 0.2,
};

export const DEFAULT_CATEGORY_MULTIPLIERS: Record<XpCategory, number> = {
  originals: 1,
  slots: 1,
  live_casino: 3,
  sports: 1,
};

export const DEFAULT_HOUSE_EDGES: Record<string, number> = Object.fromEntries(
  LOYALTY_GAMES.map((g) => [g.id, g.houseEdge]),
);

export const DEFAULT_VIP_TIERS: VipTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    minXp: 0,
    color: "#cd7f32",
    benefits: "Standard Instant Drop rakeback.",
    rakebackBonusPct: 0,
  },
  {
    id: "silver",
    name: "Silver",
    minXp: 2_500,
    color: "#c0c0c0",
    benefits: "+5% Instant Drop rakeback.",
    rakebackBonusPct: 0.05,
  },
  {
    id: "gold",
    name: "Gold",
    minXp: 10_000,
    color: "#eab308",
    benefits: "+10% Instant Drop rakeback.",
    rakebackBonusPct: 0.1,
  },
  {
    id: "platinum",
    name: "Platinum",
    minXp: 40_000,
    color: "#67e8f9",
    benefits: "+15% Instant Drop rakeback.",
    rakebackBonusPct: 0.15,
  },
  {
    id: "diamond",
    name: "Diamond",
    minXp: 120_000,
    color: "#a78bfa",
    benefits: "+20% Instant Drop rakeback. Warden queue priority (demo copy).",
    rakebackBonusPct: 0.2,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    minXp: 400_000,
    color: "#34d399",
    benefits: "+25% Instant Drop rakeback. Highest vault status.",
    rakebackBonusPct: 0.25,
  },
];

export const DEFAULT_MISSIONS: LoyaltyMission[] = [
  {
    id: "daily_wager_1k",
    title: "Daily grind",
    description: "Wager 1,000 SH today for bonus XP.",
    kind: "wager_sh",
    target: 1_000,
    bonusXp: 50,
    period: "daily",
  },
];

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  mode: "flat",
  flatRates: { ...DEFAULT_FLAT_RATES },
  categoryMultipliers: { ...DEFAULT_CATEGORY_MULTIPLIERS },
  houseEdges: { ...DEFAULT_HOUSE_EDGES },
  tiers: DEFAULT_VIP_TIERS.map((t) => ({ ...t })),
  missions: DEFAULT_MISSIONS.map((m) => ({ ...m })),
};

export const LOCAL_XP_USER = "local";
export const MAX_XP_LEDGER = 800;

export function categoryForGame(gameType: string): XpCategory {
  return GAME_CATEGORY[gameType] ?? "originals";
}

export function roundXp(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 10_000) / 10_000;
}

export function utcDayKey(at = Date.now()): string {
  return new Date(at).toISOString().slice(0, 10);
}

export function houseEdgeForGame(gameType: string, overrides: Record<string, number> = {}): number {
  if (overrides[gameType] != null && Number.isFinite(overrides[gameType])) return Math.max(0, overrides[gameType]);
  const known = DEFAULT_HOUSE_EDGES[gameType];
  if (known != null) return known;
  const fromLive = (HOUSE_EDGE as Record<string, number>)[gameType];
  return fromLive ?? 0.04;
}

/**
 * Flat: wager × category rate.
 * House-edge: wager × house_edge × 100 × category_multiplier.
 * Boosts apply after the base formula.
 */
export function calculateWagerXp(input: {
  wagered: number;
  gameType: string;
  config: LoyaltyConfig;
  boostMultiplier?: number;
  extraXpPerWager?: number;
}): {
  xp: number;
  category: XpCategory;
  houseEdge: number;
  flatRate: number;
  categoryMultiplier: number;
  boostMultiplier: number;
} {
  const category = categoryForGame(input.gameType);
  const houseEdge = houseEdgeForGame(input.gameType, input.config.houseEdges);
  const flatRate = input.config.flatRates[category] ?? DEFAULT_FLAT_RATES[category];
  const categoryMultiplier = input.config.categoryMultipliers[category] ?? DEFAULT_CATEGORY_MULTIPLIERS[category];
  const boostMultiplier = input.boostMultiplier && input.boostMultiplier > 0 ? input.boostMultiplier : 1;
  const extra = Math.max(0, input.extraXpPerWager ?? 0);
  if (input.wagered <= 0) {
    return { xp: 0, category, houseEdge, flatRate, categoryMultiplier, boostMultiplier };
  }
  const base =
    input.config.mode === "flat"
      ? input.wagered * flatRate
      : input.wagered * houseEdge * 100 * categoryMultiplier;
  return {
    xp: roundXp(base * boostMultiplier + extra),
    category,
    houseEdge,
    flatRate,
    categoryMultiplier,
    boostMultiplier,
  };
}

export function sortedTiers(tiers: VipTier[]): VipTier[] {
  return [...tiers].sort((a, b) => a.minXp - b.minXp);
}

export function resolveVip(
  xp: number,
  tiers: VipTier[],
): {
  current: VipTier;
  next: VipTier | null;
  into: number;
  needed: number;
  remaining: number;
  ratio: number;
} {
  const list = sortedTiers(tiers.length ? tiers : DEFAULT_VIP_TIERS);
  const lifetime = Math.max(0, xp);
  let current = list[0]!;
  for (const t of list) {
    if (lifetime >= t.minXp) current = t;
  }
  const idx = list.findIndex((t) => t.id === current.id);
  const next = list[idx + 1] ?? null;
  if (!next) {
    return { current, next: null, into: lifetime - current.minXp, needed: 0, remaining: 0, ratio: 1 };
  }
  const needed = Math.max(0, next.minXp - current.minXp);
  const into = Math.max(0, lifetime - current.minXp);
  return {
    current,
    next,
    into,
    needed,
    remaining: Math.max(0, next.minXp - lifetime),
    ratio: needed > 0 ? Math.min(1, into / needed) : 1,
  };
}

export function activeBoosts(boosts: XpBoost[], userId: string, now = Date.now()): XpBoost[] {
  return boosts.filter((b) => {
    if (now < b.startsAt || now >= b.endsAt) return false;
    return b.userId === "*" || b.userId === userId;
  });
}

export function combineBoosts(boosts: XpBoost[]): { multiplier: number; extraXpPerWager: number } {
  if (boosts.length === 0) return { multiplier: 1, extraXpPerWager: 0 };
  return {
    multiplier: boosts.reduce((m, b) => m * Math.max(0, b.multiplier || 1), 1),
    extraXpPerWager: boosts.reduce((s, b) => s + Math.max(0, b.extraXpPerWager || 0), 0),
  };
}

export function mergeLoyaltyConfig(partial?: Partial<LoyaltyConfig> | null): LoyaltyConfig {
  const src = partial ?? {};
  const tiers = Array.isArray(src.tiers) && src.tiers.length > 0 ? src.tiers.map((t) => ({ ...t })) : DEFAULT_VIP_TIERS.map((t) => ({ ...t }));
  return {
    mode: src.mode === "house_edge" ? "house_edge" : "flat",
    flatRates: { ...DEFAULT_FLAT_RATES, ...src.flatRates },
    categoryMultipliers: { ...DEFAULT_CATEGORY_MULTIPLIERS, ...src.categoryMultipliers },
    houseEdges: { ...DEFAULT_HOUSE_EDGES, ...src.houseEdges },
    tiers,
    missions: Array.isArray(src.missions) && src.missions.length > 0 ? src.missions.map((m) => ({ ...m })) : DEFAULT_MISSIONS.map((m) => ({ ...m })),
  };
}
