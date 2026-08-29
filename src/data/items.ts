import type { RarityId } from "./rarities";
import { HIGH_TIER_ITEMS, type HighTierItemId } from "./highTierItems";

export type IconKey =
  | "maxxx"
  | "sparkles"
  | "removed"
  | "dirt"
  | "firework"
  | "teeny_angel_wings"
  | "pet_turtle"
  | "pegasus"
  | "skeletal_horsie"
  | "double_growsaber"
  | "dragon_hand"
  | "black_growsaber"
  | "floating_leaf"
  | "cosmic_cape"
  | "angel_wings"
  | "neon_nerves"
  | "neon_cape"
  | "burning_hands"
  | "winter_frost_bow"
  | "flaming_aura"
  | "diamond_flash_axe"
  | "riding_comet"
  | "golden_apple"
  | "love_eyes"
  | "shadow_crown"
  | "twin_swords"
  | "draconic_crown"
  | "thingamabob"
  | "guardian_pineapple"
  | "zombie_jammer"
  | "phoenix_hair"
  | "diamond_dragon"
  | "party_blaster"
  | HighTierItemId;

export interface CaseItem {
  id: string;
  name: string;
  value: number;
  rarity: RarityId;
  icon: IconKey;
}

function rarityForValue(value: number): RarityId {
  if (value <= 8) return "common";
  if (value <= 50) return "uncommon";
  if (value <= 200) return "rare";
  if (value <= 1200) return "epic";
  return "mythic";
}

function item(id: Exclude<IconKey, "maxxx" | "sparkles" | "removed">, name: string, value: number): CaseItem {
  return { id, name, value, rarity: rarityForValue(value), icon: id };
}

export const ITEMS: Record<string, CaseItem> = {
  dirt: item("dirt", "Dirt", 1),
  firework: item("firework", "Firework", 1),
  pet_turtle: item("pet_turtle", "Pet Turtle", 4),
  teeny_angel_wings: item("teeny_angel_wings", "Teeny Angel Wings", 5),
  skeletal_horsie: item("skeletal_horsie", "Skeletal Horsie", 5),
  zombie_jammer: item("zombie_jammer", "Zombie Jammer", 8),
  pegasus: item("pegasus", "Pegasus", 15),
  double_growsaber: item("double_growsaber", "Double Growsaber", 20),
  black_growsaber: item("black_growsaber", "Black Growsaber", 30),
  neon_cape: item("neon_cape", "Neon Cape", 45),
  dragon_hand: item("dragon_hand", "Dragon Hand", 50),
  floating_leaf: item("floating_leaf", "Floating Leaf", 70),
  angel_wings: item("angel_wings", "Angel Wings", 90),
  cosmic_cape: item("cosmic_cape", "Cosmic Cape", 100),
  burning_hands: item("burning_hands", "Burning Hands", 200),
  winter_frost_bow: item("winter_frost_bow", "Winter Frost Bow", 300),
  neon_nerves: item("neon_nerves", "Neon Nerves", 500),
  flaming_aura: item("flaming_aura", "Flaming Aura", 750),
  diamond_flash_axe: item("diamond_flash_axe", "Diamond Flash Axe", 900),
  riding_comet: item("riding_comet", "Riding Comet", 1000),
  golden_apple: item("golden_apple", "Golden Apple", 1200),
  love_eyes: item("love_eyes", "Love Eyes", 1500),
  shadow_crown: item("shadow_crown", "Shadow Crown", 2000),
  draconic_crown: item("draconic_crown", "Draconic Crown", 2250),
  twin_swords: item("twin_swords", "Twin Swords", 2700),
  thingamabob: item("thingamabob", "Thingamabob", 3500),
  guardian_pineapple: item("guardian_pineapple", "Guardian Pineapple", 4000),
  diamond_dragon: item("diamond_dragon", "Diamond Dragon", 5000),
  phoenix_hair: item("phoenix_hair", "Phoenix Hair", 9000),
  party_blaster: item("party_blaster", "Party Blaster", 10000),
  maxxx_win: { id: "maxxx_win", name: "MAXXX WIN", value: 500000, rarity: "mythic", icon: "maxxx" },
  ...Object.fromEntries(HIGH_TIER_ITEMS.map((row) => [row.id, item(row.id, row.name, row.value)])),
};

/** Every catalog item, website prices only. MAXXX WIN is overlay-only and is omitted. */
export const ITEM_LIST: CaseItem[] = Object.values(ITEMS).filter((it) => it.id !== "maxxx_win");

export const MAXXX_WIN = ITEMS.maxxx_win!;

export function isMaxxxWin(item: { id: string }): boolean {
  return item.id === "maxxx_win";
}

export function isPixelItem(item: { id: string; icon: IconKey }): boolean {
  return item.icon !== "sparkles" && item.icon !== "removed";
}

export function iconImageSrc(icon: IconKey): string {
  if (icon === "maxxx") return "/images/items/maxxx.png";
  if (icon === "sparkles") return "/images/items/gold-spin.png";
  if (icon === "removed") return "/images/items/removed.svg";
  return `/images/items/${icon}.png`;
}

export function itemImageSrc(item: { id: string; icon: IconKey }): string {
  if (item.id === "maxxx_win" || item.icon === "maxxx") return "/images/items/maxxx.png";
  if (item.id === "__gold_indicator__") return "/images/items/gold-spin.png";
  return iconImageSrc(item.icon);
}
