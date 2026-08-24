import { ITEMS, type CaseItem } from "./items";
import { findHydratedCommunityCase } from "../store/communityCaseStore";
import { stampTicketRanges, ticketFromRoll } from "../lib/caseTickets";
import { OFFICIAL_CHEST_COLORS, pileStickers, type ChestSticker } from "../lib/chest";

export interface CaseOddsEntry {
  item: CaseItem;
  weight: number;
  probability: number;
  tickets: number;
  ticketStart: number;
  ticketEnd: number;
  /** Rarest 1% of the million-ticket pool (tickets 990,000–1,000,000) — Gold Spin eligible. */
  goldTier: boolean;
}

export type RiskLevel = "low" | "medium" | "high";

export interface CaseDef {
  id: string;
  name: string;
  price: number;
  blurb: string;
  from: string;
  to: string;
  targetRtp: number;
  risk: RiskLevel;
  /** [itemId, relativeWeight][] — the last entry's weight is solved automatically. */
  raw: [string, number][];
}

const CASE_DEFS: CaseDef[] = [
  {
    id: "pocket",
    name: "Pocket Case",
    price: 15,
    blurb: "Pocket change stakes with a tight, low-volatility payout spread.",
    from: "#475569",
    to: "#1e293b",
    targetRtp: 0.96,
    risk: "low",
    raw: [
      ["chipped_coin", 1500],
      ["tarnished_ring", 1500],
      ["faded_medal", 1300],
      ["polished_stone", 900],
      ["bright_trinket", 600],
      ["lucky_charm", 350],
      ["silver_whistle", 150],
      ["golden_button", 70],
      ["mini_treasure", 20],
      ["rusty_washer", 0], // solved filler (most common, lowest value)
    ],
  },
  {
    id: "starter",
    name: "Starter Cache",
    price: 50,
    blurb: "A low-stakes case for warming up the RNG gods.",
    from: "#334155",
    to: "#0f172a",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["copper_coil", 1500],
      ["clay_bead", 1000],
      ["tin_locket", 1500],
      ["jade_sprout", 1300],
      ["azure_shard", 700],
      ["storm_feather", 500],
      ["leafboard", 300],
      ["ember_core", 250],
      ["solar_ingot", 150],
      ["starlit_crown", 100],
      ["pebble_charm", 0],
    ],
  },
  {
    id: "vault",
    name: "Vault Cache",
    price: 150,
    blurb: "A step up in stakes, with a shot at an Epic centerpiece.",
    from: "#0f766e",
    to: "#042f2e",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["silver_fang", 1500],
      ["driftwood_charm", 1000],
      ["moonstone_ring", 1500],
      ["reef_anchor", 1300],
      ["void_compass", 700],
      ["glacier_prism", 500],
      ["phoenix_wing", 250],
      ["kraken_fang", 150],
      ["eternal_orbit", 100],
      ["iron_bolt", 0],
    ],
  },
  {
    id: "chaos",
    name: "Chaos Case",
    price: 600,
    blurb: "High-volatility gamble — mostly scraps, but a shot at 400x.",
    from: "#c2410c",
    to: "#431407",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["feral_coin", 1300],
      ["frenzy_shard", 900],
      ["rift_ember", 500],
      ["wildfire_core", 220],
      ["volt_surge", 80],
      ["rogue_comet", 25],
      ["chaos_engine", 6],
      ["havoc_core", 1.5],
      ["chaos_singularity", 0.35],
      ["maxxx_win", 0.08],
      ["static_spark", 0],
    ],
  },
  {
    id: "prime",
    name: "Prime Cache",
    price: 400,
    blurb: "Mid-tier vault with a deep pool of Rare and Epic pulls.",
    from: "#a16207",
    to: "#422006",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["ranger_arrow", 1500],
      ["dune_shard", 1000],
      ["sunfire_bead", 1500],
      ["wraith_veil", 1300],
      ["aegis_plate", 700],
      ["arcane_wand", 500],
      ["dragon_eye", 250],
      ["phantom_blade", 150],
      ["quantum_atom", 100],
      ["brass_gear", 0],
    ],
  },
  {
    id: "steady",
    name: "Steady Cache",
    price: 800,
    blurb: "Bigger stakes, same tight low-volatility spread as the Pocket Case.",
    from: "#0e7490",
    to: "#083344",
    targetRtp: 0.96,
    risk: "low",
    raw: [
      ["vault_token", 1500],
      ["stable_ingot", 1500],
      ["balanced_orb", 1300],
      ["measured_gem", 900],
      ["even_keel_charm", 600],
      ["anchor_stone", 350],
      ["steady_beacon", 150],
      ["guardian_seal", 70],
      ["fortune_ledger", 20],
      ["ledger_chip", 0],
    ],
  },
  {
    id: "elite",
    name: "Elite Cache",
    price: 1000,
    blurb: "High-roller case — Mythic hits actually mean something here.",
    from: "#6d28d9",
    to: "#2e1065",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["crimson_talon", 1500],
      ["iron_sentinel", 1000],
      ["frostbound_star", 1500],
      ["nova_spark", 1300],
      ["titan_shield", 700],
      ["comet_trail", 500],
      ["royal_diamond", 250],
      ["void_reaper", 150],
      ["infinity_relic", 100],
      ["obsidian_shard", 0],
    ],
  },
  {
    id: "apex",
    name: "Apex Cache",
    price: 2500,
    blurb: "The top of the vault. Biggest swings, biggest Gold Spins.",
    from: "#be123c",
    to: "#4c0519",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["rocket_badge", 1500],
      ["storm_sigil", 1000],
      ["celestial_key", 1500],
      ["abyssal_gem", 1300],
      ["champion_trophy", 700],
      ["solar_crown", 500],
      ["cosmic_phoenix", 250],
      ["void_monarch", 150],
      ["apex_singularity", 100],
      ["maxxx_win", 0.04],
      ["gilded_skull", 0],
    ],
  },
  {
    id: "whale",
    name: "Whale's Vault",
    price: 5000,
    blurb: "The riskiest case in the vault — long odds, legendary upside.",
    from: "#155e75",
    to: "#020617",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["driftnet_charm", 1300],
      ["coral_shard", 900],
      ["deep_current_orb", 500],
      ["abyss_pearl", 220],
      ["leviathan_scale", 80],
      ["kraken_heart", 25],
      ["tidal_monarch", 6],
      ["maelstrom_core", 1.5],
      ["leviathans_crown", 0.35],
      ["maxxx_win", 0.12],
      ["barnacle_coin", 0],
    ],
  },
];

/**
 * Solves the weight of the filler (last / weight-0) entry so that the
 * case's expected value lands exactly at `price * targetRtp`. This is what
 * guarantees every case keeps a real house edge — it's derived from price,
 * never the other way around.
 */
function buildCase(def: CaseDef): { odds: CaseOddsEntry[]; ev: number; rtp: number } {
  const targetEv = def.price * def.targetRtp;
  const fixed = def.raw.filter(([, w]) => w > 0).map(([id, w]) => ({ item: ITEMS[id], weight: w }));
  const [fillerId] = def.raw.find(([, w]) => w === 0)!;
  const fillerItem = ITEMS[fillerId];

  const fixedWeightSum = fixed.reduce((s, i) => s + i.weight, 0);
  const fixedValueSum = fixed.reduce((s, i) => s + i.weight * i.item.value, 0);

  // targetEv = (fixedValueSum + w0*value0) / (fixedWeightSum + w0)  =>  solve for w0
  const w0 = (targetEv * fixedWeightSum - fixedValueSum) / (fillerItem.value - targetEv);
  if (!isFinite(w0) || w0 <= 0) {
    throw new Error(`Case "${def.id}" cannot hit target RTP with given weights (w0=${w0})`);
  }

  const all = [...fixed, { item: fillerItem, weight: w0 }];
  const totalWeight = all.reduce((s, i) => s + i.weight, 0);

  const withProbability = all
    .map((i) => ({ item: i.item, weight: i.weight, probability: i.weight / totalWeight }))
    .sort((a, b) => a.probability - b.probability);

  const odds: CaseOddsEntry[] = stampTicketRanges(withProbability);

  const ev = odds.reduce((s, o) => s + o.probability * o.item.value, 0);
  return { odds, ev, rtp: ev / def.price };
}

export interface Case extends CaseDef {
  odds: CaseOddsEntry[];
  ev: number;
  rtp: number;
  houseEdge: number;
  community?: boolean;
  creatorId?: string;
  creatorName?: string;
  designItemIds?: string[];
  commissionRate?: number;
  chestColor?: string;
  chestStickers?: ChestSticker[];
}

export const CASES: Case[] = CASE_DEFS.map((def) => {
  const { odds, ev, rtp } = buildCase(def);
  const topIds = [...odds]
    .sort((a, b) => b.item.value - a.item.value)
    .slice(0, 4)
    .map((o) => o.item.id);
  return {
    ...def,
    odds,
    ev,
    rtp,
    houseEdge: 1 - rtp,
    chestColor: OFFICIAL_CHEST_COLORS[def.id] ?? def.from,
    chestStickers: pileStickers(topIds),
    designItemIds: topIds,
  };
});

export function getCase(id: string): Case | undefined {
  return CASES.find((c) => c.id === id) ?? findHydratedCommunityCase(id);
}

/** Rolls a single item from a case's million-ticket table given a uniform float in [0,1). */
export function rollCaseItem(c: Case, roll: number): CaseOddsEntry {
  const ticket = ticketFromRoll(roll);
  for (const entry of c.odds) {
    if (ticket >= entry.ticketStart && ticket <= entry.ticketEnd) return entry;
  }
  return c.odds[c.odds.length - 1];
}

/** Highest-probability-first ordering, handy for building the visual reel strip. */
export function reelOrder(c: Case): CaseOddsEntry[] {
  return [...c.odds].sort((a, b) => b.probability - a.probability);
}
