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
  /** Extra Instant (and Daily) Drop rakeback, e.g. 0.1 = +10%. */
  rakebackBonusPct: number;
  /** One-time play-money Shard drop the first time this rank is reached. */
  rankDropSh: number;
  /** Cosmetic / title copy shown on Rewards and VIP. Play-money only. */
  cosmetic: string;
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
  { id: "upgrader", label: "Upgrader", category: "originals", houseEdge: HOUSE_EDGE.upgrader },
  { id: "keno", label: "Keno", category: "originals", houseEdge: HOUSE_EDGE.keno },
  { id: "plinko", label: "Plinko", category: "originals", houseEdge: 0.04 },
  { id: "dice", label: "Dice", category: "originals", houseEdge: HOUSE_EDGE.dice },
  { id: "crash", label: "Crash", category: "originals", houseEdge: HOUSE_EDGE.crash },
  { id: "road", label: "Cross the Road", category: "originals", houseEdge: HOUSE_EDGE.road },
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

/** Old Bronze → Obsidian six-rank ladder. Replaced on rehydrate. */
export const LEGACY_DEFAULT_TIER_IDS = ["bronze", "silver", "gold", "platinum", "diamond", "obsidian"] as const;

/**
 * Lifetime XP thresholds (flat mode ≈ 0.2 XP per 1 SH wagered).
 * Unranked is 0. The rest is an increasing curve through mid (Diamond ~55k–130k)
 * into prestige (Emperor 2.6M ≈ 13M SH wagered).
 */
export const DEFAULT_VIP_TIERS: VipTier[] = [
  {
    id: "unranked",
    name: "Unranked",
    minXp: 0,
    color: "#64748b",
    benefits: "Standard Instant Drop and Daily rakeback.",
    rakebackBonusPct: 0,
    rankDropSh: 0,
    cosmetic: "Starter vault badge",
  },
  {
    id: "silver_1",
    name: "Silver 1",
    minXp: 1_000,
    color: "#94a3b8",
    benefits: "+2% Instant Drop and Daily rakeback.",
    rakebackBonusPct: 0.02,
    rankDropSh: 0,
    cosmetic: "Silver I badge",
  },
  {
    id: "silver_2",
    name: "Silver 2",
    minXp: 2_500,
    color: "#cbd5e1",
    benefits: "+4% Instant Drop and Daily rakeback.",
    rakebackBonusPct: 0.04,
    rankDropSh: 0,
    cosmetic: "Silver II badge",
  },
  {
    id: "silver_3",
    name: "Silver 3",
    minXp: 5_000,
    color: "#e2e8f0",
    benefits: "+6% Instant Drop and Daily rakeback. One-time 25 SH rank drop.",
    rakebackBonusPct: 0.06,
    rankDropSh: 25,
    cosmetic: "Silver III badge",
  },
  {
    id: "gold_1",
    name: "Gold 1",
    minXp: 10_000,
    color: "#ca8a04",
    benefits: "+8% Instant Drop and Daily rakeback.",
    rakebackBonusPct: 0.08,
    rankDropSh: 0,
    cosmetic: "Gold I badge",
  },
  {
    id: "gold_2",
    name: "Gold 2",
    minXp: 20_000,
    color: "#eab308",
    benefits: "+10% Instant Drop and Daily rakeback.",
    rakebackBonusPct: 0.1,
    rankDropSh: 0,
    cosmetic: "Gold II badge",
  },
  {
    id: "gold_3",
    name: "Gold 3",
    minXp: 35_000,
    color: "#facc15",
    benefits: "+12% Instant Drop and Daily rakeback. One-time 75 SH rank drop.",
    rakebackBonusPct: 0.12,
    rankDropSh: 75,
    cosmetic: "Gold III badge",
  },
  {
    id: "diamond_1",
    name: "Diamond 1",
    minXp: 55_000,
    color: "#67e8f9",
    benefits: "+14% Instant Drop and Daily rakeback.",
    rakebackBonusPct: 0.14,
    rankDropSh: 0,
    cosmetic: "Diamond I chrome",
  },
  {
    id: "diamond_2",
    name: "Diamond 2",
    minXp: 85_000,
    color: "#22d3ee",
    benefits: "+16% Instant Drop and Daily rakeback.",
    rakebackBonusPct: 0.16,
    rankDropSh: 0,
    cosmetic: "Diamond II chrome",
  },
  {
    id: "diamond_3",
    name: "Diamond 3",
    minXp: 130_000,
    color: "#a5f3fc",
    benefits: "+18% Instant Drop and Daily rakeback. One-time 150 SH rank drop.",
    rakebackBonusPct: 0.18,
    rankDropSh: 150,
    cosmetic: "Diamond III chrome",
  },
  {
    id: "emerald",
    name: "Emerald",
    minXp: 200_000,
    color: "#34d399",
    benefits: "+20% Instant Drop and Daily rakeback. One-time 200 SH rank drop.",
    rakebackBonusPct: 0.2,
    rankDropSh: 200,
    cosmetic: "Emerald vault title",
  },
  {
    id: "sapphire",
    name: "Sapphire",
    minXp: 300_000,
    color: "#3b82f6",
    benefits: "+22% Instant Drop and Daily rakeback. Warden queue priority (demo copy).",
    rakebackBonusPct: 0.22,
    rankDropSh: 0,
    cosmetic: "Sapphire vault title",
  },
  {
    id: "ruby",
    name: "Ruby",
    minXp: 450_000,
    color: "#f43f5e",
    benefits: "+24% Instant Drop and Daily rakeback. One-time 300 SH rank drop.",
    rakebackBonusPct: 0.24,
    rankDropSh: 300,
    cosmetic: "Ruby vault title",
  },
  {
    id: "elite",
    name: "Elite",
    minXp: 700_000,
    color: "#a78bfa",
    benefits: "+26% Instant Drop and Daily rakeback. One-time 400 SH rank drop.",
    rakebackBonusPct: 0.26,
    rankDropSh: 400,
    cosmetic: "Elite banner",
  },
  {
    id: "grandmaster",
    name: "Grandmaster",
    minXp: 1_100_000,
    color: "#f97316",
    benefits: "+28% Instant Drop and Daily rakeback. One-time 500 SH rank drop.",
    rakebackBonusPct: 0.28,
    rankDropSh: 500,
    cosmetic: "Grandmaster title",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    minXp: 1_700_000,
    color: "#2dd4bf",
    benefits: "+30% Instant Drop and Daily rakeback. One-time 750 SH rank drop.",
    rakebackBonusPct: 0.3,
    rankDropSh: 750,
    cosmetic: "Obsidian vault chrome",
  },
  {
    id: "emperor",
    name: "Emperor",
    minXp: 2_600_000,
    color: "#fbbf24",
    benefits: "+35% Instant Drop and Daily rakeback. Emperor vault status. One-time 1,000 SH rank drop.",
    rakebackBonusPct: 0.35,
    rankDropSh: 1_000,
    cosmetic: "Emperor crown (cosmetic)",
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

export function normalizeVipTier(t: Partial<VipTier> & Pick<VipTier, "id" | "name">): VipTier {
  return {
    id: t.id,
    name: t.name,
    minXp: Math.max(0, Number(t.minXp) || 0),
    color: t.color && t.color.trim() ? t.color : "#67e8f9",
    benefits: t.benefits ?? "",
    rakebackBonusPct: Math.max(0, Number(t.rakebackBonusPct) || 0),
    rankDropSh: Math.max(0, Number(t.rankDropSh) || 0),
    cosmetic: t.cosmetic ?? "",
  };
}

export function isLegacyDefaultVipTiers(tiers: VipTier[]): boolean {
  if (tiers.length !== LEGACY_DEFAULT_TIER_IDS.length) return false;
  return tiers.every((t, i) => t.id === LEGACY_DEFAULT_TIER_IDS[i]);
}

export function migrateVipTiers(tiers?: VipTier[] | null): VipTier[] {
  if (!Array.isArray(tiers) || tiers.length === 0 || isLegacyDefaultVipTiers(tiers)) {
    return DEFAULT_VIP_TIERS.map((t) => ({ ...t }));
  }
  return tiers.map((t) => normalizeVipTier(t));
}

export function sortedTiers(tiers: VipTier[]): VipTier[] {
  return [...tiers].sort((a, b) => a.minXp - b.minXp);
}

/** Play-money SH granted when lifetime XP crosses one or more ranks. */
export function rankDropsBetween(
  before: number,
  after: number,
  tiers: VipTier[],
): { amount: number; names: string[] } {
  const list = sortedTiers(tiers.length ? tiers : DEFAULT_VIP_TIERS);
  const prev = resolveVip(before, list);
  const next = resolveVip(after, list);
  if (prev.current.id === next.current.id) return { amount: 0, names: [] };
  const prevIdx = list.findIndex((t) => t.id === prev.current.id);
  const nextIdx = list.findIndex((t) => t.id === next.current.id);
  if (prevIdx < 0 || nextIdx < 0 || nextIdx <= prevIdx) return { amount: 0, names: [] };
  let amount = 0;
  const names: string[] = [];
  for (let i = prevIdx + 1; i <= nextIdx; i++) {
    const t = list[i];
    if (!t) continue;
    names.push(t.name);
    amount += Math.max(0, t.rankDropSh || 0);
  }
  return { amount, names };
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
  return {
    mode: src.mode === "house_edge" ? "house_edge" : "flat",
    flatRates: { ...DEFAULT_FLAT_RATES, ...src.flatRates },
    categoryMultipliers: { ...DEFAULT_CATEGORY_MULTIPLIERS, ...src.categoryMultipliers },
    houseEdges: { ...DEFAULT_HOUSE_EDGES, ...src.houseEdges },
    tiers: migrateVipTiers(src.tiers),
    missions: Array.isArray(src.missions) && src.missions.length > 0 ? src.missions.map((m) => ({ ...m })) : DEFAULT_MISSIONS.map((m) => ({ ...m })),
  };
}
