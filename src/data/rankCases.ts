import type { CaseDef, RiskLevel } from "./cases";
import {
  DAILY_VOLATILITIES,
  KEY_BANDS,
  KEY_BAND_LABEL,
  dailyCaseId,
  type DailyVolatility,
  type KeyBand,
} from "../lib/rankRewards";

type Prize = [string, number];

const VOL_RTP: Record<DailyVolatility, number> = {
  low: 0.78,
  medium: 0.72,
  high: 0.62,
};

const VOL_BLURB: Record<DailyVolatility, string> = {
  low: "Low vol — frequent small hits, capped tops.",
  medium: "Medium vol — balanced table.",
  high: "High vol — mostly dead, rare chase.",
};

function dailyDef(
  rankId: string,
  name: string,
  volatility: DailyVolatility,
  price: number,
  color: string,
  prizes: Prize[],
): CaseDef {
  const volTag = volatility === "medium" ? "" : ` · ${volatility[0]!.toUpperCase()}${volatility.slice(1)}`;
  return {
    id: dailyCaseId(rankId, volatility),
    name: `${name} Daily${volTag}`,
    price,
    blurb: `${VOL_BLURB[volatility]} Free once every 24 hours at ${name}.`,
    from: color,
    to: "#0c1414",
    targetRtp: VOL_RTP[volatility],
    risk: volatility as RiskLevel,
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

function volPrice(price: number, vol: DailyVolatility): number {
  if (vol === "low") return Math.max(2, Math.round(price * 0.82));
  if (vol === "high") return Math.max(2, Math.round(price * 1.06));
  return price;
}

/** Low: drop the top chase, pad commons. High: thin the cheap lane, keep/add a rare top. */
function prizesForVol(prizes: Prize[], vol: DailyVolatility, highChase?: Prize): Prize[] {
  if (vol === "medium") return prizes.map(([id, w]) => [id, w]);
  if (vol === "low") {
    const body = prizes.length > 2 ? prizes.slice(0, -1) : prizes;
    return body.map(([id, w], i) => {
      const last = i === body.length - 1;
      const scale = last ? 0.9 : 1.9 - i * 0.15;
      return [id, Math.max(last ? 4 : 12, Math.round(w * scale))] as Prize;
    });
  }
  const next: Prize[] = prizes.map(([id, w], i) => {
    const last = i === prizes.length - 1;
    const scale = last ? 0.28 : Math.max(0.1, 0.38 - i * 0.06);
    return [id, Math.max(1, Math.round(w * scale))] as Prize;
  });
  if (highChase && !next.some(([id]) => id === highChase[0])) next.push([highChase[0], Math.max(1, highChase[1])]);
  return next;
}

interface DailyRankSpec {
  rankId: string;
  name: string;
  price: number;
  color: string;
  prizes: Prize[];
  highChase?: Prize;
}

/**
 * Medium tables are the source of truth. Lower ranks stay junk-heavy; Sapphire+
 * jump several tiers; Elite+ uses the high-WL catalog (100k–20M).
 */
const DAILY_SPECS: DailyRankSpec[] = [
  {
    rankId: "unranked",
    name: "Unranked",
    price: 2,
    color: "#64748b",
    prizes: [
      ["pet_turtle", 80],
      ["teeny_angel_wings", 12],
    ],
    highChase: ["skeletal_horsie", 2],
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
    highChase: ["zombie_jammer", 2],
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
    highChase: ["pegasus", 2],
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
    highChase: ["double_growsaber", 2],
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
    highChase: ["black_growsaber", 2],
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
    highChase: ["neon_cape", 2],
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
    highChase: ["dragon_hand", 2],
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
    highChase: ["floating_leaf", 2],
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
    highChase: ["angel_wings", 2],
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
    highChase: ["cosmic_cape", 2],
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
    highChase: ["burning_hands", 2],
  },
  {
    rankId: "sapphire",
    name: "Sapphire",
    price: 400,
    color: "#3b82f6",
    prizes: [
      ["burning_hands", 40],
      ["winter_frost_bow", 24],
      ["neon_nerves", 12],
      ["flaming_aura", 5],
      ["riding_comet", 2],
    ],
    highChase: ["phoenix_hair", 1],
  },
  {
    rankId: "ruby",
    name: "Ruby",
    price: 650,
    color: "#f43f5e",
    prizes: [
      ["winter_frost_bow", 36],
      ["neon_nerves", 20],
      ["flaming_aura", 10],
      ["riding_comet", 5],
      ["golden_apple", 2],
      ["phoenix_hair", 1],
    ],
    highChase: ["party_blaster", 1],
  },
  {
    rankId: "elite",
    name: "Elite",
    price: 150_000,
    color: "#a78bfa",
    prizes: [
      ["phoenix_crown", 36],
      ["heavenly_scythe", 18],
      ["golden_angel_wings", 10],
      ["legendary_wings", 4],
      ["phoenix_wings", 2],
      ["golden_pickaxe", 1],
    ],
    highChase: ["dark_cult_hood", 1],
  },
  {
    rankId: "grandmaster",
    name: "Grandmaster",
    price: 450_000,
    color: "#f97316",
    prizes: [
      ["heavenly_scythe", 28],
      ["golden_angel_wings", 16],
      ["legendary_wings", 8],
      ["phoenix_wings", 5],
      ["golden_pickaxe", 2],
      ["dark_cult_hood", 1],
    ],
    highChase: ["focused_eyes", 1],
  },
  {
    rankId: "obsidian",
    name: "Obsidian",
    price: 1_800_000,
    color: "#2dd4bf",
    prizes: [
      ["legendary_wings", 24],
      ["phoenix_wings", 14],
      ["golden_pickaxe", 6],
      ["dark_cult_hood", 3],
      ["focused_eyes", 2],
      ["phonecats_hat", 1],
    ],
    highChase: ["curse_wand", 1],
  },
  {
    rankId: "emperor",
    name: "Emperor",
    price: 6_000_000,
    color: "#fbbf24",
    prizes: [
      ["golden_pickaxe", 18],
      ["dark_cult_hood", 10],
      ["focused_eyes", 6],
      ["phonecats_hat", 3],
      ["curse_wand", 2],
    ],
    highChase: ["nightkings_cape_midnight_blue", 1],
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
    price: 1100,
    color: "#3b82f6",
    prizes: [
      ["neon_nerves", 30],
      ["flaming_aura", 16],
      ["riding_comet", 8],
      ["golden_apple", 4],
      ["phoenix_hair", 2],
    ],
  },
  ruby: {
    price: 1900,
    color: "#f43f5e",
    prizes: [
      ["flaming_aura", 28],
      ["riding_comet", 14],
      ["twin_swords", 6],
      ["phoenix_hair", 3],
      ["party_blaster", 1],
    ],
  },
  elite: {
    price: 400_000,
    color: "#a78bfa",
    prizes: [
      ["heavenly_scythe", 24],
      ["golden_angel_wings", 12],
      ["legendary_wings", 6],
      ["phoenix_wings", 3],
      ["golden_pickaxe", 2],
      ["dark_cult_hood", 1],
    ],
  },
  grandmaster: {
    price: 1_200_000,
    color: "#f97316",
    prizes: [
      ["legendary_wings", 16],
      ["phoenix_wings", 10],
      ["golden_pickaxe", 5],
      ["dark_cult_hood", 3],
      ["focused_eyes", 2],
      ["phonecats_hat", 1],
    ],
  },
  obsidian: {
    price: 4_500_000,
    color: "#2dd4bf",
    prizes: [
      ["phoenix_wings", 12],
      ["golden_pickaxe", 8],
      ["dark_cult_hood", 5],
      ["focused_eyes", 3],
      ["phonecats_hat", 2],
      ["curse_wand", 1],
    ],
  },
  emperor: {
    price: 12_000_000,
    color: "#fbbf24",
    prizes: [
      ["golden_pickaxe", 10],
      ["dark_cult_hood", 8],
      ["focused_eyes", 6],
      ["phonecats_hat", 4],
      ["curse_wand", 3],
      ["nightkings_cape_midnight_blue", 2],
    ],
  },
};

export const RANK_CASE_DEFS: CaseDef[] = [
  ...DAILY_SPECS.flatMap((s) =>
    DAILY_VOLATILITIES.map((vol) =>
      dailyDef(s.rankId, s.name, vol, volPrice(s.price, vol), s.color, prizesForVol(s.prizes, vol, s.highChase)),
    ),
  ),
  ...KEY_BANDS.map((band) => {
    const spec = KEY_SPECS[band];
    return keyDef(band, spec.price, spec.color, spec.prizes);
  }),
];
