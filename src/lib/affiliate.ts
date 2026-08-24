import { HOUSE_EDGE } from "./rakeback";

/** Affiliate cut of the house-edge slice from referred World Lock wagers. Paid as Shards. */
export const AFFILIATE_SHARE = 0.1;

/** Idle if a referred player has not placed a real stake in this window. */
export const REFERRAL_IDLE_MS = 24 * 60 * 60 * 1000;

export const COMMISSION_EXAMPLE = {
  share: AFFILIATE_SHARE,
  wagerWl: 100_000,
  houseEdge: 0.04,
  payout: 400,
} as const;

export type ReferralStatus = "active" | "idle";

export interface AffiliateReferral {
  id: string;
  name: string;
  color: string;
  wagerWl: number;
  bets: number;
  /** Running Shard commission from theoretical house edge, not player losses. */
  commission: number;
  status: ReferralStatus;
  lastBetAt: number;
}

const NAME_COLORS = ["#22d3ee", "#67e8f9", "#2dd4bf", "#a78bfa", "#34d399", "#38bdf8", "#fb7185", "#fbbf24"];

export function normalizeAffiliateCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 14);
}

export function makeAffiliateCode(name: string): string {
  return normalizeAffiliateCode(name) || "vaultbound";
}

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return NAME_COLORS[hash % NAME_COLORS.length]!;
}

export function affiliateCommission(wagerWl: number, houseEdge: number, share = AFFILIATE_SHARE): number {
  if (!(wagerWl > 0) || !(houseEdge > 0)) return 0;
  return wagerWl * houseEdge * share;
}

export function referralCommission(row: AffiliateReferral): number {
  return row.commission;
}

export function referralStatusAt(row: AffiliateReferral, now = Date.now()): ReferralStatus {
  if (!row.lastBetAt || now - row.lastBetAt >= REFERRAL_IDLE_MS) return "idle";
  return "active";
}

function demoRow(
  id: string,
  color: string,
  wagerWl: number,
  bets: number,
  houseEdge: number,
  status: ReferralStatus,
): AffiliateReferral {
  return {
    id,
    name: id,
    color,
    wagerWl,
    bets,
    commission: affiliateCommission(wagerWl, houseEdge),
    status,
    lastBetAt: status === "active" ? Date.now() : 0,
  };
}

/** Showcase-only sample rows. The personal dashboard table uses live ledgers instead. */
export const DEMO_REFERRALS: AffiliateReferral[] = [
  demoRow("reefpilot", "#22d3ee", 18_400, 142, HOUSE_EDGE.cases, "active"),
  demoRow("frostbyte", "#67e8f9", 9_250, 88, HOUSE_EDGE.mines, "active"),
  demoRow("nightharbor", "#2dd4bf", 6_110, 41, HOUSE_EDGE.jackpot, "idle"),
  demoRow("pixelwager", "#a78bfa", 4_780, 63, HOUSE_EDGE.coinflip, "active"),
  demoRow("mossqueen", "#34d399", 3_320, 29, HOUSE_EDGE.battles, "active"),
  demoRow("tidebox", "#38bdf8", 1_540, 17, HOUSE_EDGE.upgrader, "idle"),
  demoRow("emberlane", "#fb7185", 890, 11, HOUSE_EDGE.keno, "idle"),
];

export const DEMO_COMMISSION_TOTAL = DEMO_REFERRALS.reduce((sum, row) => sum + referralCommission(row), 0);

export const PROGRAM_STATS = {
  referredPlayersAllTime: 18_420,
  earnedAllTimeShards: 26_041.8,
} as const;

export interface AffiliateBoardRow {
  name: string;
  color: string;
  wagerWl: number;
  place: number;
  prizeShards: number;
}

export const DEMO_BOARD: AffiliateBoardRow[] = [
  { name: "reefpilot", color: "#22d3ee", wagerWl: 12_200, place: 1, prizeShards: 250 },
  { name: "frostbyte", color: "#67e8f9", wagerWl: 8_040, place: 2, prizeShards: 120 },
  { name: "mossqueen", color: "#34d399", wagerWl: 5_510, place: 3, prizeShards: 50 },
];

export const AFFILIATE_PAGE_SIZE = 5;
