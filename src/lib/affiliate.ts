import { HOUSE_EDGE } from "./rakeback";

/** Affiliate cut of the house-edge slice from referred World Lock wagers. Paid as Shards. */
export const AFFILIATE_SHARE = 0.1;

export type ReferralStatus = "active" | "idle";

export interface AffiliateReferral {
  id: string;
  name: string;
  color: string;
  wagerWl: number;
  bets: number;
  houseEdge: number;
  status: ReferralStatus;
}

export function makeAffiliateCode(name: string): string {
  const slug = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 14);
  return slug || "vaultbound";
}

export function affiliateCommission(wagerWl: number, houseEdge: number, share = AFFILIATE_SHARE): number {
  if (!(wagerWl > 0) || !(houseEdge > 0)) return 0;
  return wagerWl * houseEdge * share;
}

export function referralCommission(row: AffiliateReferral): number {
  return affiliateCommission(row.wagerWl, row.houseEdge);
}

/** Local showcase referrals — not live accounts. */
export const DEMO_REFERRALS: AffiliateReferral[] = [
  {
    id: "reefpilot",
    name: "reefpilot",
    color: "#22d3ee",
    wagerWl: 18_400,
    bets: 142,
    houseEdge: HOUSE_EDGE.cases,
    status: "active",
  },
  {
    id: "frostbyte",
    name: "frostbyte",
    color: "#67e8f9",
    wagerWl: 9_250,
    bets: 88,
    houseEdge: HOUSE_EDGE.mines,
    status: "active",
  },
  {
    id: "nightharbor",
    name: "nightharbor",
    color: "#2dd4bf",
    wagerWl: 6_110,
    bets: 41,
    houseEdge: HOUSE_EDGE.jackpot,
    status: "idle",
  },
  {
    id: "pixelwager",
    name: "pixelwager",
    color: "#a78bfa",
    wagerWl: 4_780,
    bets: 63,
    houseEdge: HOUSE_EDGE.coinflip,
    status: "active",
  },
  {
    id: "mossqueen",
    name: "mossqueen",
    color: "#34d399",
    wagerWl: 3_320,
    bets: 29,
    houseEdge: HOUSE_EDGE.battles,
    status: "active",
  },
  {
    id: "tidebox",
    name: "tidebox",
    color: "#38bdf8",
    wagerWl: 1_540,
    bets: 17,
    houseEdge: HOUSE_EDGE.upgrader,
    status: "idle",
  },
  {
    id: "emberlane",
    name: "emberlane",
    color: "#fb7185",
    wagerWl: 890,
    bets: 11,
    houseEdge: HOUSE_EDGE.keno,
    status: "idle",
  },
];

export const DEMO_COMMISSION_TOTAL = DEMO_REFERRALS.reduce((sum, row) => sum + referralCommission(row), 0);

/** Previously claimed showcase earnings so Total Earnings sits above Available. */
export const DEMO_PRIOR_CLAIMED = 88;

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
