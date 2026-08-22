import type { Case, CaseOddsEntry, RiskLevel } from "../data/cases";
import { ITEMS, type CaseItem } from "../data/items";
import { houseEdgeForGame, sortedTiers, type VipTier } from "./loyalty";
import { HOUSE_EDGE } from "./rakeback";

/**
 * Community case pricing matches official cases (EV stays below price by the
 * cases house edge). Creator commission is a slice of the house's edge take,
 * not extra rake stacked on the player:
 *
 *   Item EV     = Σ (itemPrice × chance)
 *   houseEdge   = live Cases edge from VIP/admin config (default HOUSE_EDGE.cases = 4%)
 *   price       = ceil(EV / (1 − houseEdge))     // same identity as official
 *   houseTake   = houseEdge × price
 *   commission  = 5% of houseTake
 *               = COMMUNITY_COMMISSION_OF_EDGE × houseEdge × price
 *
 * Example at 4% house edge, EV 96 → price 100. House take 4 SH. Creator 0.20 SH.
 * Player RTP is unchanged vs official (~96%). Commission does NOT raise price.
 * +EV community cases are rejected (EV must be < price).
 *
 * Who pays: only actual people. Solo opens by the logged-in user accrue.
 * In battles, each human opener (`you` / `player`) accrues; bot columns
 * (`kind === "bot"`, from `botSeats` / `prefillBots`) that unroll the same
 * case do not. Demo 0-stakes and battle replays do not pay. Borrow-mode
 * credits, when applied, scale human seats only.
 */
export const COMMUNITY_COMMISSION_OF_EDGE = 0.05;
/** @deprecated Use COMMUNITY_COMMISSION_OF_EDGE — this is 5% of the house-edge take, not of price. */
export const COMMUNITY_COMMISSION = COMMUNITY_COMMISSION_OF_EDGE;
export const COMMUNITY_MAX_ITEMS = 25;
export const COMMUNITY_MAX_DESIGN_ITEMS = 5;
export const COMMUNITY_NAME_MIN = 4;
export const COMMUNITY_NAME_MAX = 22;
/** 4–22 chars, starts/ends alphanumeric, spaces / hyphens / apostrophes in between. */
export const COMMUNITY_NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9 \-']{0,20}[A-Za-z0-9])?$/;

/**
 * Community-case create gate:
 * VIP has named ranks, not numeric levels. Default requirement is Diamond 1
 * (`diamond_1`, 55,000 lifetime XP on the Unranked → Emperor ladder).
 * Creation is enforced against that XP threshold (and live admin-edited tiers).
 */
export const COMMUNITY_CREATE_TIER_ID = "diamond_1";
export const COMMUNITY_CREATE_VIP_RANK = 8;

export const CASE_COLOR_PRESETS: { id: string; from: string; to: string }[] = [
  { id: "vault", from: "#0f766e", to: "#042f2e" },
  { id: "ember", from: "#c2410c", to: "#431407" },
  { id: "prime", from: "#a16207", to: "#422006" },
  { id: "elite", from: "#6d28d9", to: "#2e1065" },
  { id: "apex", from: "#be123c", to: "#4c0519" },
  { id: "tide", from: "#155e75", to: "#020617" },
  { id: "slate", from: "#334155", to: "#0f172a" },
  { id: "cyan", from: "#0e7490", to: "#083344" },
];

export const DEFAULT_CASE_COLOR = CASE_COLOR_PRESETS[0]!;

export interface CommunityOddsInput {
  itemId: string;
  chancePct: number;
}

export interface CommunityCaseRecord {
  id: string;
  name: string;
  price: number;
  ev: number;
  houseEdge: number;
  commissionRate: number;
  risk: RiskLevel;
  blurb: string;
  from: string;
  to: string;
  creatorId: string;
  creatorName: string;
  createdAt: number;
  designItemIds: string[];
  entries: CommunityOddsInput[];
}

export function communityHouseEdge(overrides?: Record<string, number>): number {
  return houseEdgeForGame("cases", overrides ?? { cases: HOUSE_EDGE.cases });
}

export function communityCreateRequirement(tiers: VipTier[]): { tier: VipTier; minXp: number; rank: number } {
  const list = sortedTiers(tiers);
  const named = list.findIndex((t) => t.id === COMMUNITY_CREATE_TIER_ID);
  const idx =
    named >= 0
      ? named
      : Math.min(Math.max(0, COMMUNITY_CREATE_VIP_RANK - 1), Math.max(0, list.length - 1));
  const tier = list[idx]!;
  return { tier, minXp: tier.minXp, rank: idx + 1 };
}

export function canCreateCommunityCase(lifetimeXp: number, tiers: VipTier[]): boolean {
  return lifetimeXp >= communityCreateRequirement(tiers).minXp;
}

export function communityNameIssue(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return "Enter a case name.";
  if (name.length < COMMUNITY_NAME_MIN || name.length > COMMUNITY_NAME_MAX) {
    return `Name must be ${COMMUNITY_NAME_MIN}–${COMMUNITY_NAME_MAX} characters.`;
  }
  if (!COMMUNITY_NAME_RE.test(name)) {
    return "Use letters, numbers, spaces, hyphens, or apostrophes. Start and end with a letter or number.";
  }
  return null;
}

export function chanceSumPct(entries: CommunityOddsInput[]): number {
  return entries.reduce((s, e) => s + (Number.isFinite(e.chancePct) ? e.chancePct : 0), 0);
}

export function chancesAreHundred(entries: CommunityOddsInput[]): boolean {
  return Math.round(chanceSumPct(entries) * 10_000) === 1_000_000;
}

export function itemEv(entries: CommunityOddsInput[]): number {
  return entries.reduce((s, e) => {
    const item = ITEMS[e.itemId];
    if (!item) return s;
    const p = (Number.isFinite(e.chancePct) ? e.chancePct : 0) / 100;
    return s + item.value * p;
  }, 0);
}

/**
 * Inverse of official `EV = price × (1 − houseEdge)`. Commission is paid from
 * the house-edge take and is not added to the denominator.
 * Returns 0 when EV cannot sit strictly below a fair (edged) price.
 */
export function communityCasePrice(ev: number, houseEdge: number): number {
  const edge = Math.min(0.99, Math.max(0, houseEdge));
  const denom = 1 - edge;
  if (!(ev > 0) || !(edge > 0) || !(denom > 0)) return 0;
  const price = Math.max(1, Math.ceil(ev / denom));
  if (ev >= price) return 0;
  return price;
}

/** House-edge take on one paid open: `houseEdge × casePrice`. */
export function communityHouseTake(price: number, houseEdge: number): number {
  if (!(price > 0) || !(houseEdge > 0)) return 0;
  return houseEdge * price;
}

/** Creator commission on one paid open: `0.05 × houseEdge × casePrice`. */
export function communityCommissionPerOpen(
  price: number,
  houseEdge: number,
  rate: number = COMMUNITY_COMMISSION_OF_EDGE,
): number {
  const slice = rate > 0 ? rate : COMMUNITY_COMMISSION_OF_EDGE;
  return communityHouseTake(price, houseEdge) * slice;
}

export function riskFromEntries(entries: CommunityOddsInput[]): RiskLevel {
  const values = entries.map((e) => ITEMS[e.itemId]?.value).filter((v): v is number => typeof v === "number" && v > 0);
  if (values.length === 0) return "medium";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const ratio = max / min;
  if (ratio >= 80) return "high";
  if (ratio >= 12) return "medium";
  return "low";
}

/** Same rule as official cases: rarest-by-probability items covering the top ~5% mass. */
export function withGoldTiers(odds: Omit<CaseOddsEntry, "goldTier">[]): CaseOddsEntry[] {
  const sorted = [...odds].sort((a, b) => a.probability - b.probability);
  let cumulative = 0;
  const gold = new Set<string>();
  for (const entry of sorted) {
    cumulative += entry.probability;
    if (cumulative <= 0.05) gold.add(entry.item.id);
  }
  return odds.map((entry) => ({ ...entry, goldTier: gold.has(entry.item.id) }));
}

export function hydrateCommunityCase(rec: CommunityCaseRecord): Case {
  const built: Omit<CaseOddsEntry, "goldTier">[] = [];
  for (const e of rec.entries) {
    const item = ITEMS[e.itemId];
    if (!item) continue;
    const probability = Math.max(0, e.chancePct) / 100;
    built.push({ item, weight: Math.max(0, e.chancePct), probability });
  }
  const odds = withGoldTiers(built);
  const ev = odds.reduce((s, o) => s + o.probability * o.item.value, 0);
  const rtp = rec.price > 0 ? ev / rec.price : 0;
  return {
    id: rec.id,
    name: rec.name,
    price: rec.price,
    blurb: rec.blurb,
    from: rec.from,
    to: rec.to,
    targetRtp: rtp,
    risk: rec.risk,
    raw: rec.entries.map((e) => [e.itemId, e.chancePct] as [string, number]),
    odds,
    ev,
    rtp,
    houseEdge: rec.houseEdge,
    community: true,
    creatorId: rec.creatorId,
    creatorName: rec.creatorName,
    designItemIds: rec.designItemIds,
    commissionRate: rec.commissionRate,
  };
}

export function designItemsFor(rec: Pick<CommunityCaseRecord, "designItemIds" | "entries">, fallbackOdds?: CaseOddsEntry[]): CaseItem[] {
  const fromDesign = rec.designItemIds.map((id) => ITEMS[id]).filter((item): item is CaseItem => Boolean(item));
  if (fromDesign.length > 0) return fromDesign.slice(0, COMMUNITY_MAX_DESIGN_ITEMS);
  if (fallbackOdds && fallbackOdds.length > 0) {
    return [...fallbackOdds]
      .sort((a, b) => b.item.value - a.item.value)
      .slice(0, COMMUNITY_MAX_DESIGN_ITEMS)
      .map((o) => o.item);
  }
  return rec.entries
    .map((e) => ITEMS[e.itemId])
    .filter((item): item is CaseItem => Boolean(item))
    .sort((a, b) => b.value - a.value)
    .slice(0, COMMUNITY_MAX_DESIGN_ITEMS);
}
