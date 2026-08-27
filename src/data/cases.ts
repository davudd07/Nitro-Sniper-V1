import { ITEMS, type CaseItem } from "./items";
import { findHydratedCommunityCase } from "../store/communityCaseStore";
import { isFillerLoot, stampTicketRanges, ticketFromRoll } from "../lib/caseTickets";
import { OFFICIAL_CHEST_COLORS, pileStickers, type ChestSticker } from "../lib/chest";
import { useCatalogModerationStore } from "../store/catalogModerationStore";
import { useAdminViewStore } from "../store/adminViewStore";
import { RANK_CASE_DEFS } from "./rankCases";

export interface CaseOddsEntry {
  item: CaseItem;
  weight: number;
  probability: number;
  tickets: number;
  ticketStart: number;
  ticketEnd: number;
  /** Occupies the top 1% of tickets when prizes are stacked highest-value first. Gold Spin eligible. Never junk filler. */
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
    blurb: "Turtles, horsies, and sabers. Angel Wings sit in the gold-spin pool.",
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
    blurb: "Capes and auras. Flaming Aura sits in the gold-spin pool.",
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
    blurb: "Auras through crowns. Shadow Crown sits in the gold-spin pool.",
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
    blurb: "Ride the comet. Twin Swords sit in the gold-spin pool.",
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
    blurb: "Crowns and twin swords. Guardian Pineapple sits in the gold tickets.",
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
  {
    id: "forge",
    name: "Phoenix Forge",
    price: 12000,
    blurb: "Phoenix steel and ultraviolet loot. Draconic Soul Aura sits in the gold tickets.",
    from: "#fb7185",
    to: "#7f1d1d",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["phoenix_sickles", 36],
      ["ultraviolet_wings", 32],
      ["ultraviolet_sword", 32],
      ["magplant_5000", 24],
      ["weather_machine_pagoda", 20],
      ["draconic_spirit_mount", 16],
      ["ultraviolet_aura", 14],
      ["alaskan_king_crab_crown", 12],
      ["phoenix_sword", 10],
      ["draconic_soul_aura", 8],
      ["dirt", 0],
    ],
  },
  {
    id: "dragons",
    name: "Dragon Yard",
    price: 35000,
    blurb: "Crowns, a dragon of legend, and Space Cat in the gold tickets.",
    from: "#a78bfa",
    to: "#2e1065",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["dancemasters_crown", 28],
      ["phoenix_pacifier", 40],
      ["phoenix_crown", 36],
      ["neptunes_weather_machine_atlantis", 32],
      ["sonic_buster_sword", 28],
      ["dragon_of_legend", 22],
      ["royal_lock", 14],
      ["growscan_9000", 12],
      ["space_cat", 8],
      ["dirt", 0],
    ],
  },
  {
    id: "gilded",
    name: "Gilded Heart",
    price: 80000,
    blurb: "Golden hearts, talaria, and Angel Wings. Crystal is the 110k chase.",
    from: "#fbbf24",
    to: "#78350f",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["sun_blade", 20],
      ["golden_love_bug", 18],
      ["draconic_wings", 18],
      ["golden_sunset_cape", 16],
      ["golden_heartstaff", 14],
      ["golden_pegasus", 14],
      ["golden_sparkling_mallet", 12],
      ["teeny_golden_wings", 12],
      ["golden_talaria", 10],
      ["phoenix_scarf", 10],
      ["heavenly_scythe", 8],
      ["golden_heart_aura", 8],
      ["golden_angel_wings", 6],
      ["golden_air_robinsons", 6],
      ["golden_heart_crystal", 5],
      ["dirt", 0],
    ],
  },
  {
    id: "ruby",
    name: "Ruby Reliquary",
    price: 180000,
    blurb: "Ruby Lock is the usual hit. Legendary Katana sits in the gold-spin pool.",
    from: "#f43f5e",
    to: "#4c0519",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["ruby_lock", 21],
      ["holiday_light_scarf", 18],
      ["legendbot_009", 16],
      ["whip_of_truth", 15],
      ["legendary_katana", 14],
      ["dirt", 0],
    ],
  },
  {
    id: "legend",
    name: "Legend Chamber",
    price: 420000,
    blurb: "Dirt is the miss. Da Vinci Wings sit in the gold-spin pool.",
    from: "#c4b5fd",
    to: "#2e1065",
    targetRtp: 0.96,
    risk: "medium",
    raw: [
      ["neptunes_armor", 18],
      ["emerald_lock", 20],
      ["mothman_wings", 22],
      ["snowglobe_staff", 22],
      ["legendary_title", 20],
      ["morty_the_pink_elephant", 16],
      ["growie_award", 12],
      ["da_vinci_wings", 7],
      ["dirt", 0],
    ],
  },
  {
    id: "tide",
    name: "Neptune's Trove",
    price: 900000,
    blurb: "Dirt is the miss. Neptune's Trident sits in the gold-spin pool.",
    from: "#38bdf8",
    to: "#0c4a6e",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["possessing_scarf", 16],
      ["neptunes_crown", 16],
      ["stethoscope", 18],
      ["legendary_wings", 16],
      ["neptunes_chariot", 14],
      ["phoenix_wings", 10],
      ["ghost_pirate_scimitar", 7],
      ["neptunes_trident", 4],
      ["dirt", 0],
    ],
  },
  {
    id: "abyss",
    name: "Pearl Abyss",
    price: 2400000,
    blurb: "Dirt is the miss. Burning Pearl Spinner sits in the gold-spin pool.",
    from: "#22d3ee",
    to: "#083344",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["curse_of_the_pink_pearl", 14],
      ["giant_eye_head", 14],
      ["mystic_battle_lance", 14],
      ["pearl_treasured_octopus", 12],
      ["oldsocks_old_mate_ricky", 11],
      ["oceanaura", 9],
      ["burning_pearl_spinner", 6],
      ["dirt", 0],
    ],
  },
  {
    id: "nightking",
    name: "Nightking's Cache",
    price: 10000000,
    blurb: "Dirt is the miss. Nightking's Cape is the 20 million WL gold-spin chase.",
    from: "#6366f1",
    to: "#020617",
    targetRtp: 0.96,
    risk: "high",
    raw: [
      ["golden_pickaxe", 14],
      ["morty_the_diamond_elephant", 14],
      ["hellfire_horns_ruby", 14],
      ["radiant_doom_staff", 13],
      ["focused_eyes", 12],
      ["dark_cult_hood", 10],
      ["phonecats_hat", 8],
      ["curse_wand", 5],
      ["nightkings_cape_midnight_blue", 3],
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

  const fillerOdds = odds.filter((o) => isFillerLoot(o.item));
  const prizeOdds = odds.filter((o) => !isFillerLoot(o.item));
  if (odds.some((o) => o.goldTier && isFillerLoot(o.item))) {
    throw new Error(`Case "${def.id}" put junk filler in the gold-spin pool`);
  }
  if (prizeOdds.length > 0) {
    const goldPrizes = prizeOdds.filter((o) => o.goldTier);
    const nonGoldPrizes = prizeOdds.filter((o) => !o.goldTier);
    if (goldPrizes.length > 0 && nonGoldPrizes.length > 0) {
      const minGold = Math.min(...goldPrizes.map((o) => o.item.value));
      const maxNonGold = Math.max(...nonGoldPrizes.map((o) => o.item.value));
      if (maxNonGold > minGold + 1e-9) {
        throw new Error(
          `Case "${def.id}" put a cheaper item in Gold Spin than a more valuable prize (${maxNonGold} WL vs ${minGold} WL)`,
        );
      }
    }
  }
  if (fillerOdds.length > 0 && prizeOdds.length > 0) {
    const rarestPrize = Math.min(...prizeOdds.map((o) => o.probability));
    const fillerShare = fillerOdds.reduce((s, o) => s + o.probability, 0);
    if (fillerShare + 1e-12 < rarestPrize) {
      throw new Error(`Case "${def.id}" makes filler rarer than the chase items`);
    }
  }

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

export function compileCase(def: CaseDef): Case {
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
}

export const CASES: Case[] = CASE_DEFS.map(compileCase);
export const RANK_CASES: Case[] = RANK_CASE_DEFS.map(compileCase);

export function getCase(id: string): Case | undefined {
  return CASES.find((c) => c.id === id) ?? RANK_CASES.find((c) => c.id === id) ?? findHydratedCommunityCase(id);
}

/** Official catalog, minus cases a warden hid. Admin view still sees hidden rows. */
export function listOfficialCases(): Case[] {
  const hidden = new Set(useCatalogModerationStore.getState().hiddenOfficialIds);
  if (hidden.size === 0) return CASES;
  if (useAdminViewStore.getState().active) return CASES;
  return CASES.filter((c) => !hidden.has(c.id));
}

export function isOfficialCaseHidden(id: string): boolean {
  return useCatalogModerationStore.getState().isOfficialHidden(id);
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
