import type { CaseDef } from "./cases";
import { KEY_BANDS, KEY_BAND_LABEL, type KeyBand } from "../lib/rankRewards";

type Prize = [string, number];

function dailyDef(
  rankId: string,
  name: string,
  price: number,
  color: string,
  prizes: Prize[],
): CaseDef {
  return {
    id: `daily_${rankId}`,
    name: `${name} Daily`,
    price,
    blurb: `Free once every 24 hours at ${name}. Junk-heavy — the chase lane is thin on purpose.`,
    from: color,
    to: "#0c1414",
    targetRtp: 0.72,
    risk: price < 12 ? "low" : price < 80 ? "medium" : "high",
    raw: [...prizes, ["dirt", 0]],
  };
}

function keyDef(band: KeyBand, price: number, color: string, prizes: Prize[]): CaseDef {
  const label = KEY_BAND_LABEL[band];
  return {
    id: `key_${band}`,
    name: `${label} Key Case`,
    price,
    blurb: `Opens with a ${label} key from a rank-up. Better than that band’s daily, 2 hour cooldown.`,
    from: color,
    to: "#050808",
    targetRtp: 0.8,
    risk: price < 40 ? "low" : price < 400 ? "medium" : "high",
    raw: [...prizes, ["dirt", 0]],
  };
}

/**
 * Heavy weight on the cheapest prize so dirt stays the common miss.
 * Prices climb slowly — beginner dailies are trash, later ranks are merely less trash.
 */
const DAILY_SPECS: { rankId: string; name: string; price: number; color: string; prizes: Prize[] }[] = [
  {
    rankId: "unranked",
    name: "Unranked",
    price: 2,
    color: "#64748b",
    prizes: [
      ["pet_turtle", 80],
      ["teeny_angel_wings", 12],
    ],
  },
  {
    rankId: "silver_1",
    name: "Silver 1",
    price: 3,
    color: "#94a3b8",
    prizes: [
      ["pet_turtle", 70],
      ["teeny_angel_wings", 18],
      ["skeletal_horsie", 8],
    ],
  },
  {
    rankId: "silver_2",
    name: "Silver 2",
    price: 4,
    color: "#cbd5e1",
    prizes: [
      ["teeny_angel_wings", 70],
      ["skeletal_horsie", 20],
      ["zombie_jammer", 8],
    ],
  },
  {
    rankId: "silver_3",
    name: "Silver 3",
    price: 6,
    color: "#e2e8f0",
    prizes: [
      ["skeletal_horsie", 70],
      ["zombie_jammer", 22],
      ["pegasus", 8],
    ],
  },
  {
    rankId: "gold_1",
    name: "Gold 1",
    price: 8,
    color: "#ca8a04",
    prizes: [
      ["zombie_jammer", 70],
      ["pegasus", 20],
      ["double_growsaber", 8],
    ],
  },
  {
    rankId: "gold_2",
    name: "Gold 2",
    price: 11,
    color: "#eab308",
    prizes: [
      ["pegasus", 70],
      ["double_growsaber", 20],
      ["black_growsaber", 8],
    ],
  },
  {
    rankId: "gold_3",
    name: "Gold 3",
    price: 15,
    color: "#facc15",
    prizes: [
      ["double_growsaber", 70],
      ["black_growsaber", 20],
      ["neon_cape", 8],
    ],
  },
  {
    rankId: "diamond_1",
    name: "Diamond 1",
    price: 20,
    color: "#67e8f9",
    prizes: [
      ["black_growsaber", 70],
      ["neon_cape", 22],
      ["dragon_hand", 8],
    ],
  },
  {
    rankId: "diamond_2",
    name: "Diamond 2",
    price: 28,
    color: "#22d3ee",
    prizes: [
      ["neon_cape", 70],
      ["dragon_hand", 22],
      ["floating_leaf", 8],
    ],
  },
  {
    rankId: "diamond_3",
    name: "Diamond 3",
    price: 38,
    color: "#a5f3fc",
    prizes: [
      ["dragon_hand", 70],
      ["floating_leaf", 22],
      ["angel_wings", 8],
    ],
  },
  {
    rankId: "emerald",
    name: "Emerald",
    price: 50,
    color: "#34d399",
    prizes: [
      ["floating_leaf", 70],
      ["angel_wings", 22],
      ["cosmic_cape", 8],
    ],
  },
  {
    rankId: "sapphire",
    name: "Sapphire",
    price: 70,
    color: "#3b82f6",
    prizes: [
      ["angel_wings", 70],
      ["cosmic_cape", 22],
      ["burning_hands", 8],
    ],
  },
  {
    rankId: "ruby",
    name: "Ruby",
    price: 95,
    color: "#f43f5e",
    prizes: [
      ["cosmic_cape", 70],
      ["burning_hands", 22],
      ["winter_frost_bow", 8],
    ],
  },
  {
    rankId: "elite",
    name: "Elite",
    price: 130,
    color: "#a78bfa",
    prizes: [
      ["burning_hands", 70],
      ["winter_frost_bow", 22],
      ["neon_nerves", 8],
    ],
  },
  {
    rankId: "grandmaster",
    name: "Grandmaster",
    price: 180,
    color: "#f97316",
    prizes: [
      ["winter_frost_bow", 70],
      ["neon_nerves", 22],
      ["flaming_aura", 8],
    ],
  },
  {
    rankId: "obsidian",
    name: "Obsidian",
    price: 240,
    color: "#2dd4bf",
    prizes: [
      ["neon_nerves", 70],
      ["flaming_aura", 22],
      ["riding_comet", 8],
    ],
  },
  {
    rankId: "emperor",
    name: "Emperor",
    price: 320,
    color: "#fbbf24",
    prizes: [
      ["flaming_aura", 70],
      ["riding_comet", 20],
      ["golden_apple", 8],
      ["love_eyes", 4],
    ],
  },
];

const KEY_SPECS: Record<KeyBand, { price: number; color: string; prizes: Prize[] }> = {
  silver: {
    price: 14,
    color: "#cbd5e1",
    prizes: [
      ["zombie_jammer", 70],
      ["pegasus", 22],
      ["double_growsaber", 10],
      ["neon_cape", 4],
    ],
  },
  gold: {
    price: 32,
    color: "#eab308",
    prizes: [
      ["black_growsaber", 70],
      ["neon_cape", 22],
      ["dragon_hand", 10],
      ["angel_wings", 4],
    ],
  },
  diamond: {
    price: 70,
    color: "#22d3ee",
    prizes: [
      ["floating_leaf", 70],
      ["angel_wings", 22],
      ["cosmic_cape", 10],
      ["burning_hands", 4],
    ],
  },
  emerald: {
    price: 110,
    color: "#34d399",
    prizes: [
      ["angel_wings", 70],
      ["cosmic_cape", 22],
      ["burning_hands", 10],
      ["winter_frost_bow", 4],
    ],
  },
  sapphire: {
    price: 160,
    color: "#3b82f6",
    prizes: [
      ["cosmic_cape", 70],
      ["burning_hands", 22],
      ["winter_frost_bow", 10],
      ["neon_nerves", 4],
    ],
  },
  ruby: {
    price: 230,
    color: "#f43f5e",
    prizes: [
      ["burning_hands", 70],
      ["winter_frost_bow", 22],
      ["neon_nerves", 10],
      ["flaming_aura", 4],
    ],
  },
  elite: {
    price: 320,
    color: "#a78bfa",
    prizes: [
      ["winter_frost_bow", 70],
      ["neon_nerves", 22],
      ["flaming_aura", 10],
      ["riding_comet", 4],
    ],
  },
  grandmaster: {
    price: 450,
    color: "#f97316",
    prizes: [
      ["neon_nerves", 70],
      ["flaming_aura", 22],
      ["riding_comet", 10],
      ["love_eyes", 4],
    ],
  },
  obsidian: {
    price: 650,
    color: "#2dd4bf",
    prizes: [
      ["flaming_aura", 70],
      ["riding_comet", 22],
      ["golden_apple", 10],
      ["shadow_crown", 4],
    ],
  },
  emperor: {
    price: 900,
    color: "#fbbf24",
    prizes: [
      ["riding_comet", 70],
      ["golden_apple", 20],
      ["love_eyes", 10],
      ["twin_swords", 5],
      ["phoenix_hair", 2],
    ],
  },
};

export const RANK_CASE_DEFS: CaseDef[] = [
  ...DAILY_SPECS.map((s) => dailyDef(s.rankId, s.name, s.price, s.color, s.prizes)),
  ...KEY_BANDS.map((band) => {
    const spec = KEY_SPECS[band];
    return keyDef(band, spec.price, spec.color, spec.prizes);
  }),
];
