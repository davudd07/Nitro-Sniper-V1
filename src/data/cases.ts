import { ITEMS, type CaseItem } from "./items";

export interface CaseOddsEntry {
  item: CaseItem;
  weight: number;
  probability: number;
  /** Top ~5% rarest-by-probability items in the case — eligible for a Gold Spin. */
  goldTier: boolean;
}

export interface CaseDef {
  id: string;
  name: string;
  price: number;
  blurb: string;
  from: string;
  to: string;
  targetRtp: number;
  /** [itemId, relativeWeight][] — the last entry's weight is solved automatically. */
  raw: [string, number][];
}

const CASE_DEFS: CaseDef[] = [
  {
    id: "starter",
    name: "Starter Cache",
    price: 50,
    blurb: "A low-stakes case for warming up the RNG gods.",
    from: "#334155",
    to: "#0f172a",
    targetRtp: 0.93,
    raw: [
      ["copper_coil", 1500],
      ["clay_bead", 1000],
      ["tin_locket", 1500],
      ["jade_sprout", 1300],
      ["azure_shard", 700],
      ["storm_feather", 500],
      ["ember_core", 250],
      ["solar_ingot", 150],
      ["starlit_crown", 100],
      ["pebble_charm", 0], // solved filler (most common, lowest value)
    ],
  },
  {
    id: "vault",
    name: "Vault Cache",
    price: 150,
    blurb: "A step up in stakes, with a shot at an Epic centerpiece.",
    from: "#0f766e",
    to: "#042f2e",
    targetRtp: 0.92,
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
    id: "prime",
    name: "Prime Cache",
    price: 400,
    blurb: "Mid-tier vault with a deep pool of Rare and Epic pulls.",
    from: "#a16207",
    to: "#422006",
    targetRtp: 0.92,
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
    id: "elite",
    name: "Elite Cache",
    price: 1000,
    blurb: "High-roller case — Mythic hits actually mean something here.",
    from: "#6d28d9",
    to: "#2e1065",
    targetRtp: 0.91,
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
    targetRtp: 0.9,
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
      ["gilded_skull", 0],
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

  let cumulative = 0;
  const odds: CaseOddsEntry[] = withProbability.map((entry) => {
    cumulative += entry.probability;
    return { ...entry, goldTier: cumulative <= 0.05 };
  });

  const ev = odds.reduce((s, o) => s + o.probability * o.item.value, 0);
  return { odds, ev, rtp: ev / def.price };
}

export interface Case extends CaseDef {
  odds: CaseOddsEntry[];
  ev: number;
  rtp: number;
  houseEdge: number;
}

export const CASES: Case[] = CASE_DEFS.map((def) => {
  const { odds, ev, rtp } = buildCase(def);
  return { ...def, odds, ev, rtp, houseEdge: 1 - rtp };
});

export function getCase(id: string): Case | undefined {
  return CASES.find((c) => c.id === id);
}

/** Rolls a single item id from a case's odds table given a uniform float in [0,1). */
export function rollCaseItem(c: Case, roll: number): CaseOddsEntry {
  let acc = 0;
  for (const entry of c.odds) {
    acc += entry.probability;
    if (roll < acc) return entry;
  }
  return c.odds[c.odds.length - 1];
}

/** Highest-probability-first ordering, handy for building the visual reel strip. */
export function reelOrder(c: Case): CaseOddsEntry[] {
  return [...c.odds].sort((a, b) => b.probability - a.probability);
}
