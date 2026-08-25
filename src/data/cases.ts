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
    name: "Dirt Pile",
    price: 10,
    blurb: "Cheap blocks and pets. Neon Cape is the chase.",
    from: "#78716c",
    to: "#1c1917",
    targetRtp: 0.96,
    risk: "low",
    raw: [
      ["pet_turtle", 50],
      ["teeny_angel_wings", 40],
      ["skeletal_horsie", 40],
      ["zombie_jammer", 30],
      ["pegasus", 90],
      ["double_growsaber", 50],
      ["black_growsaber", 24],
      ["neon_cape", 12],
      ["dragon_hand", 5],
      ["dirt", 0],
    ],
  },
  {
    id: "starter",
    name: "Farm Cache",
    price: 25,
    blurb: "Turtles, horsies, and sabers with a shot at a floating leaf.",
    from: "#4d7c0f",
    to: "#14532d",
    targetRtp: 0.96,
    risk: "low",
    raw: [
      ["zombie_jammer", 30],
      ["pegasus", 70],
      ["double_growsaber", 60],
      ["black_growsaber", 48],
      ["neon_cape", 28],
      ["dragon_hand", 16],
      ["floating_leaf", 8],
      ["angel_wings", 30],
      ["firework", 0],
    ],
  },
  {
    id: "vault",
    name: "Saber Crate",
    price: 50,
    blurb: "Growsabers and dragon hands, with capes in the rare tickets.",
    from: "#0369a1",
    to: "#0c4a6e",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["double_growsaber", 50],
      ["black_growsaber", 60],
      ["neon_cape", 55],
      ["dragon_hand", 48],
      ["floating_leaf", 28],
      ["angel_wings", 16],
      ["cosmic_cape", 10],
      ["burning_hands", 36],
      ["dirt", 0],
    ],
  },
  {
    id: "angel",
    name: "Angel Armory",
    price: 80,
    blurb: "Wings from teeny to full Angel, plus a frost-bow chase.",
    from: "#f8fafc",
    to: "#334155",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["angel_wings", 80],
      ["floating_leaf", 40],
      ["cosmic_cape", 32],
      ["neon_cape", 24],
      ["burning_hands", 16],
      ["winter_frost_bow", 8],
      ["neon_nerves", 7.23],
      ["dirt", 0],
    ],
  },
  {
    id: "prime",
    name: "Cape Cache",
    price: 120,
    blurb: "Capes and auras. Neon Nerves sits in the gold-spin pool.",
    from: "#7c3aed",
    to: "#4c1d95",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["floating_leaf", 36],
      ["angel_wings", 44],
      ["cosmic_cape", 50],
      ["burning_hands", 30],
      ["winter_frost_bow", 16],
      ["neon_nerves", 8],
      ["flaming_aura", 9.98],
      ["dirt", 0],
    ],
  },
  {
    id: "chaos",
    name: "Neon Vault",
    price: 150,
    blurb: "Mostly dirt — long-shot Phoenix Hair and Party Blaster.",
    from: "#22d3ee",
    to: "#164e63",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["cosmic_cape", 18],
      ["burning_hands", 12],
      ["neon_nerves", 7],
      ["flaming_aura", 3.5],
      ["diamond_flash_axe", 2],
      ["riding_comet", 1],
      ["golden_apple", 0.45],
      ["phoenix_hair", 0.12],
      ["party_blaster", 0.599],
      ["dirt", 0],
    ],
  },
  {
    id: "steady",
    name: "Frost Armory",
    price: 400,
    blurb: "Tight frost and neon spread around the case price.",
    from: "#38bdf8",
    to: "#0c4a6e",
    targetRtp: 0.96,
    risk: "low",
    raw: [
      ["burning_hands", 36],
      ["winter_frost_bow", 90],
      ["neon_nerves", 80],
      ["flaming_aura", 48],
      ["diamond_flash_axe", 24],
      ["riding_comet", 12],
      ["golden_apple", 8],
      ["dirt", 0],
    ],
  },
  {
    id: "elite",
    name: "Aura Chamber",
    price: 800,
    blurb: "Auras through Shadow Crown in the rarest tickets.",
    from: "#f97316",
    to: "#7c2d12",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["winter_frost_bow", 24],
      ["neon_nerves", 48],
      ["flaming_aura", 70],
      ["diamond_flash_axe", 55],
      ["riding_comet", 40],
      ["golden_apple", 22],
      ["love_eyes", 12],
      ["shadow_crown", 55],
      ["dirt", 0],
    ],
  },
  {
    id: "comet",
    name: "Comet Trail",
    price: 1200,
    blurb: "Ride the comet. Crowns sit in the rarest 1%.",
    from: "#fbbf24",
    to: "#9a3412",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["flaming_aura", 20],
      ["diamond_flash_axe", 36],
      ["riding_comet", 80],
      ["golden_apple", 60],
      ["love_eyes", 32],
      ["shadow_crown", 16],
      ["draconic_crown", 10],
      ["twin_swords", 68],
      ["dirt", 0],
    ],
  },
  {
    id: "apex",
    name: "Crown Vault",
    price: 2000,
    blurb: "Crowns and twin swords. Diamond Dragon is the spike.",
    from: "#e11d48",
    to: "#4c0519",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["love_eyes", 40],
      ["shadow_crown", 70],
      ["draconic_crown", 60],
      ["twin_swords", 44],
      ["thingamabob", 20],
      ["guardian_pineapple", 10],
      ["diamond_dragon", 31],
      ["dirt", 0],
    ],
  },
  {
    id: "party",
    name: "Party Vault",
    price: 2500,
    blurb: "High-vol whale box. Party Blaster is the 4× chase.",
    from: "#ec4899",
    to: "#831843",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["guardian_pineapple", 24],
      ["diamond_dragon", 18],
      ["phoenix_hair", 7],
      ["party_blaster", 14.28],
      ["dirt", 0],
    ],
  },
  {
    id: "whale",
    name: "Dragon Hoard",
    price: 3000,
    blurb: "Dragon loot with Phoenix Hair and Party Blaster in the tail.",
    from: "#155e75",
    to: "#020617",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["twin_swords", 40],
      ["thingamabob", 48],
      ["guardian_pineapple", 36],
      ["diamond_dragon", 22],
      ["phoenix_hair", 8],
      ["party_blaster", 18.18],
      ["dirt", 0],
    ],
  },
  {
    id: "phoenix",
    name: "Phoenix Nest",
    price: 4000,
    blurb: "Phoenix Hair is the namesake chase. Party Blaster still hides here.",
    from: "#f43f5e",
    to: "#7f1d1d",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["thingamabob", 30],
      ["guardian_pineapple", 40],
      ["diamond_dragon", 36],
      ["phoenix_hair", 16],
      ["party_blaster", 43],
      ["dirt", 0],
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
  const fixed = def.raw.filter(([, w]) => w > 0).map(([id, w]) => {
    const item = ITEMS[id];
    if (!item) throw new Error(`Case "${def.id}" references unknown item "${id}"`);
    return { item, weight: w };
  });
  const fillerRow = def.raw.find(([, w]) => w === 0);
  if (!fillerRow) throw new Error(`Case "${def.id}" needs a weight-0 filler item`);
  const fillerItem = ITEMS[fillerRow[0]];
  if (!fillerItem) throw new Error(`Case "${def.id}" filler "${fillerRow[0]}" is missing`);

  const fixedWeightSum = fixed.reduce((s, i) => s + i.weight, 0);
  const fixedValueSum = fixed.reduce((s, i) => s + i.weight * i.item.value, 0);

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
  /** Paid human opens. Bots never increment this. */
  opens?: number;
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
