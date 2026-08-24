import type { RarityId } from "./rarities";

// All item names, art direction (icon + gradient) and values below are
// original to this demo — no third-party trademarks, characters or image
// assets are used anywhere in this project. Values shown are in
// "Prism Shards" — a play-money currency with no real-world value.
export type IconKey =
  | "gem" | "sparkles" | "star" | "crown" | "flame" | "snowflake"
  | "shield" | "sword" | "zap" | "rocket" | "trophy" | "diamond"
  | "feather" | "leaf" | "anchor" | "compass" | "key" | "moon"
  | "sun" | "skull" | "ghost" | "wand" | "orbit" | "atom"
  | "clover" | "eye" | "hexagon" | "infinity" | "meteor" | "bird" | "maxxx" | "leafboard";

export interface CaseItem {
  id: string;
  name: string;
  value: number;
  rarity: RarityId;
  icon: IconKey;
}

export const ITEMS: Record<string, CaseItem> = {
  // --- Starter Cache pool ---
  pebble_charm: { id: "pebble_charm", name: "Pebble Charm", value: 8, rarity: "common", icon: "leaf" },
  leafboard: { id: "leafboard", name: "Leafboard", value: 200, rarity: "rare", icon: "leafboard" },
  copper_coil: { id: "copper_coil", name: "Copper Coil", value: 15, rarity: "common", icon: "hexagon" },
  clay_bead: { id: "clay_bead", name: "Clay Bead", value: 21, rarity: "common", icon: "clover" },
  tin_locket: { id: "tin_locket", name: "Tin Locket", value: 30, rarity: "uncommon", icon: "key" },
  jade_sprout: { id: "jade_sprout", name: "Jade Sprout", value: 45, rarity: "uncommon", icon: "sparkles" },
  azure_shard: { id: "azure_shard", name: "Azure Shard", value: 75, rarity: "rare", icon: "gem" },
  storm_feather: { id: "storm_feather", name: "Storm Feather", value: 125, rarity: "rare", icon: "feather" },
  ember_core: { id: "ember_core", name: "Ember Core", value: 250, rarity: "epic", icon: "flame" },
  solar_ingot: { id: "solar_ingot", name: "Solar Ingot", value: 400, rarity: "epic", icon: "sun" },
  starlit_crown: { id: "starlit_crown", name: "Starlit Crown", value: 1000, rarity: "mythic", icon: "crown" },

  // --- Vault Cache pool ---
  iron_bolt: { id: "iron_bolt", name: "Iron Bolt", value: 24, rarity: "common", icon: "hexagon" },
  silver_fang: { id: "silver_fang", name: "Silver Fang", value: 45, rarity: "common", icon: "sword" },
  driftwood_charm: { id: "driftwood_charm", name: "Driftwood Charm", value: 63, rarity: "common", icon: "leaf" },
  moonstone_ring: { id: "moonstone_ring", name: "Moonstone Ring", value: 90, rarity: "uncommon", icon: "moon" },
  reef_anchor: { id: "reef_anchor", name: "Reef Anchor", value: 135, rarity: "uncommon", icon: "anchor" },
  void_compass: { id: "void_compass", name: "Void Compass", value: 225, rarity: "rare", icon: "compass" },
  glacier_prism: { id: "glacier_prism", name: "Glacier Prism", value: 375, rarity: "rare", icon: "snowflake" },
  phoenix_wing: { id: "phoenix_wing", name: "Phoenix Wing", value: 750, rarity: "epic", icon: "bird" },
  kraken_fang: { id: "kraken_fang", name: "Kraken Fang", value: 1200, rarity: "epic", icon: "sword" },
  eternal_orbit: { id: "eternal_orbit", name: "Eternal Orbit", value: 3000, rarity: "mythic", icon: "orbit" },

  // --- Prime Cache pool ---
  brass_gear: { id: "brass_gear", name: "Brass Gear", value: 64, rarity: "common", icon: "hexagon" },
  ranger_arrow: { id: "ranger_arrow", name: "Ranger Arrow", value: 120, rarity: "common", icon: "zap" },
  dune_shard: { id: "dune_shard", name: "Dune Shard", value: 168, rarity: "common", icon: "gem" },
  sunfire_bead: { id: "sunfire_bead", name: "Sunfire Bead", value: 240, rarity: "uncommon", icon: "sun" },
  wraith_veil: { id: "wraith_veil", name: "Wraith Veil", value: 360, rarity: "uncommon", icon: "ghost" },
  aegis_plate: { id: "aegis_plate", name: "Aegis Plate", value: 600, rarity: "rare", icon: "shield" },
  arcane_wand: { id: "arcane_wand", name: "Arcane Wand", value: 1000, rarity: "rare", icon: "wand" },
  dragon_eye: { id: "dragon_eye", name: "Dragon Eye", value: 2000, rarity: "epic", icon: "eye" },
  phantom_blade: { id: "phantom_blade", name: "Phantom Blade", value: 3200, rarity: "epic", icon: "sword" },
  quantum_atom: { id: "quantum_atom", name: "Quantum Atom", value: 8000, rarity: "mythic", icon: "atom" },

  // --- Elite Cache pool ---
  obsidian_shard: { id: "obsidian_shard", name: "Obsidian Shard", value: 160, rarity: "common", icon: "gem" },
  crimson_talon: { id: "crimson_talon", name: "Crimson Talon", value: 300, rarity: "common", icon: "sword" },
  iron_sentinel: { id: "iron_sentinel", name: "Iron Sentinel", value: 420, rarity: "common", icon: "hexagon" },
  frostbound_star: { id: "frostbound_star", name: "Frostbound Star", value: 600, rarity: "uncommon", icon: "star" },
  nova_spark: { id: "nova_spark", name: "Nova Spark", value: 900, rarity: "uncommon", icon: "sparkles" },
  titan_shield: { id: "titan_shield", name: "Titan Shield", value: 1500, rarity: "rare", icon: "shield" },
  comet_trail: { id: "comet_trail", name: "Comet Trail", value: 2500, rarity: "rare", icon: "meteor" },
  royal_diamond: { id: "royal_diamond", name: "Royal Diamond", value: 5000, rarity: "epic", icon: "diamond" },
  void_reaper: { id: "void_reaper", name: "Void Reaper", value: 8000, rarity: "epic", icon: "skull" },
  infinity_relic: { id: "infinity_relic", name: "Infinity Relic", value: 20000, rarity: "mythic", icon: "infinity" },

  // --- Pocket Case pool (low risk / low volatility) ---
  rusty_washer: { id: "rusty_washer", name: "Rusty Washer", value: 7, rarity: "common", icon: "hexagon" },
  chipped_coin: { id: "chipped_coin", name: "Chipped Coin", value: 10, rarity: "common", icon: "gem" },
  tarnished_ring: { id: "tarnished_ring", name: "Tarnished Ring", value: 12, rarity: "common", icon: "moon" },
  faded_medal: { id: "faded_medal", name: "Faded Medal", value: 14, rarity: "uncommon", icon: "star" },
  polished_stone: { id: "polished_stone", name: "Polished Stone", value: 17, rarity: "uncommon", icon: "gem" },
  bright_trinket: { id: "bright_trinket", name: "Bright Trinket", value: 20, rarity: "rare", icon: "sparkles" },
  lucky_charm: { id: "lucky_charm", name: "Lucky Charm", value: 23, rarity: "rare", icon: "clover" },
  silver_whistle: { id: "silver_whistle", name: "Silver Whistle", value: 28, rarity: "epic", icon: "zap" },
  golden_button: { id: "golden_button", name: "Golden Button", value: 33, rarity: "epic", icon: "sun" },
  mini_treasure: { id: "mini_treasure", name: "Mini Treasure", value: 39, rarity: "mythic", icon: "trophy" },

  // --- Steady Cache pool (low risk / low volatility) ---
  ledger_chip: { id: "ledger_chip", name: "Ledger Chip", value: 400, rarity: "common", icon: "hexagon" },
  vault_token: { id: "vault_token", name: "Vault Token", value: 520, rarity: "common", icon: "key" },
  stable_ingot: { id: "stable_ingot", name: "Stable Ingot", value: 640, rarity: "common", icon: "gem" },
  balanced_orb: { id: "balanced_orb", name: "Balanced Orb", value: 760, rarity: "uncommon", icon: "orbit" },
  measured_gem: { id: "measured_gem", name: "Measured Gem", value: 880, rarity: "uncommon", icon: "gem" },
  even_keel_charm: { id: "even_keel_charm", name: "Even Keel Charm", value: 1040, rarity: "rare", icon: "anchor" },
  anchor_stone: { id: "anchor_stone", name: "Anchor Stone", value: 1240, rarity: "rare", icon: "shield" },
  steady_beacon: { id: "steady_beacon", name: "Steady Beacon", value: 1480, rarity: "epic", icon: "sun" },
  guardian_seal: { id: "guardian_seal", name: "Guardian Seal", value: 1760, rarity: "epic", icon: "shield" },
  fortune_ledger: { id: "fortune_ledger", name: "Fortune Ledger", value: 2080, rarity: "mythic", icon: "trophy" },

  // --- Chaos Case pool (high risk / high volatility) ---
  static_spark: { id: "static_spark", name: "Static Spark", value: 24, rarity: "common", icon: "zap" },
  feral_coin: { id: "feral_coin", name: "Feral Coin", value: 90, rarity: "common", icon: "gem" },
  frenzy_shard: { id: "frenzy_shard", name: "Frenzy Shard", value: 240, rarity: "uncommon", icon: "flame" },
  rift_ember: { id: "rift_ember", name: "Rift Ember", value: 600, rarity: "uncommon", icon: "flame" },
  wildfire_core: { id: "wildfire_core", name: "Wildfire Core", value: 1800, rarity: "rare", icon: "flame" },
  volt_surge: { id: "volt_surge", name: "Volt Surge", value: 4800, rarity: "rare", icon: "zap" },
  rogue_comet: { id: "rogue_comet", name: "Rogue Comet", value: 12000, rarity: "epic", icon: "meteor" },
  chaos_engine: { id: "chaos_engine", name: "Chaos Engine", value: 36000, rarity: "epic", icon: "atom" },
  havoc_core: { id: "havoc_core", name: "Havoc Core", value: 90000, rarity: "mythic", icon: "skull" },
  chaos_singularity: { id: "chaos_singularity", name: "Chaos Singularity", value: 240000, rarity: "mythic", icon: "infinity" },

  // --- Whale's Vault pool (high risk / high volatility) ---
  barnacle_coin: { id: "barnacle_coin", name: "Barnacle Coin", value: 200, rarity: "common", icon: "gem" },
  driftnet_charm: { id: "driftnet_charm", name: "Driftnet Charm", value: 750, rarity: "common", icon: "anchor" },
  coral_shard: { id: "coral_shard", name: "Coral Shard", value: 2000, rarity: "uncommon", icon: "gem" },
  deep_current_orb: { id: "deep_current_orb", name: "Deep Current Orb", value: 5000, rarity: "uncommon", icon: "orbit" },
  abyss_pearl: { id: "abyss_pearl", name: "Abyss Pearl", value: 15000, rarity: "rare", icon: "gem" },
  leviathan_scale: { id: "leviathan_scale", name: "Leviathan Scale", value: 40000, rarity: "rare", icon: "shield" },
  kraken_heart: { id: "kraken_heart", name: "Kraken Heart", value: 100000, rarity: "epic", icon: "flame" },
  tidal_monarch: { id: "tidal_monarch", name: "Tidal Monarch", value: 300000, rarity: "epic", icon: "crown" },
  maelstrom_core: { id: "maelstrom_core", name: "Maelstrom Core", value: 360000, rarity: "mythic", icon: "atom" },
  leviathans_crown: { id: "leviathans_crown", name: "Leviathan's Crown", value: 420000, rarity: "mythic", icon: "crown" },
  maxxx_win: { id: "maxxx_win", name: "MAXXX WIN", value: 500000, rarity: "mythic", icon: "maxxx" },

  // --- Apex Cache pool ---
  gilded_skull: { id: "gilded_skull", name: "Gilded Skull", value: 400, rarity: "common", icon: "skull" },
  rocket_badge: { id: "rocket_badge", name: "Rocket Badge", value: 750, rarity: "common", icon: "rocket" },
  storm_sigil: { id: "storm_sigil", name: "Storm Sigil", value: 1050, rarity: "common", icon: "zap" },
  celestial_key: { id: "celestial_key", name: "Celestial Key", value: 1500, rarity: "uncommon", icon: "key" },
  abyssal_gem: { id: "abyssal_gem", name: "Abyssal Gem", value: 2250, rarity: "uncommon", icon: "gem" },
  champion_trophy: { id: "champion_trophy", name: "Champion Trophy", value: 3750, rarity: "rare", icon: "trophy" },
  solar_crown: { id: "solar_crown", name: "Solar Crown", value: 6250, rarity: "rare", icon: "crown" },
  cosmic_phoenix: { id: "cosmic_phoenix", name: "Cosmic Phoenix", value: 12500, rarity: "epic", icon: "bird" },
  void_monarch: { id: "void_monarch", name: "Void Monarch", value: 20000, rarity: "epic", icon: "eye" },
  apex_singularity: { id: "apex_singularity", name: "Apex Singularity", value: 50000, rarity: "mythic", icon: "atom" },
};

/** Every catalog item, website prices only. */
export const ITEM_LIST: CaseItem[] = Object.values(ITEMS);

export const MAXXX_WIN = ITEMS.maxxx_win!;

export function isMaxxxWin(item: { id: string }): boolean {
  return item.id === "maxxx_win";
}

export function iconImageSrc(icon: IconKey): string {
  if (icon === "maxxx") return "/images/items/maxxx.png";
  if (icon === "leafboard") return "/images/items/leafboard.png";
  return `/images/items/${icon}.webp`;
}

export function itemImageSrc(item: { id: string; icon: IconKey }): string {
  if (item.id === "maxxx_win" || item.icon === "maxxx") return "/images/items/maxxx.png";
  if (item.id === "__gold_indicator__") return "/images/items/gold-spin.png";
  return iconImageSrc(item.icon);
}
