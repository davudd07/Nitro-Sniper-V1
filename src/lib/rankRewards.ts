import { sortedTiers, type VipTier } from "./loyalty";

export const KEY_BANDS = [
  "silver",
  "gold",
  "diamond",
  "emerald",
  "sapphire",
  "ruby",
  "elite",
  "grandmaster",
  "obsidian",
  "emperor",
] as const;

export type KeyBand = (typeof KEY_BANDS)[number];

export const DAILY_CASE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const KEY_CASE_COOLDOWN_MS = 2 * 60 * 60 * 1000;

export const KEY_BAND_LABEL: Record<KeyBand, string> = {
  silver: "Silver",
  gold: "Gold",
  diamond: "Diamond",
  emerald: "Emerald",
  sapphire: "Sapphire",
  ruby: "Ruby",
  elite: "Elite",
  grandmaster: "Grandmaster",
  obsidian: "Obsidian",
  emperor: "Emperor",
};

export const KEY_BAND_COLOR: Record<KeyBand, string> = {
  silver: "#cbd5e1",
  gold: "#eab308",
  diamond: "#22d3ee",
  emerald: "#34d399",
  sapphire: "#3b82f6",
  ruby: "#f43f5e",
  elite: "#a78bfa",
  grandmaster: "#f97316",
  obsidian: "#2dd4bf",
  emperor: "#fbbf24",
};

export function isKeyBand(value: string): value is KeyBand {
  return (KEY_BANDS as readonly string[]).includes(value);
}

/** Key granted for entering this rank. Unranked has no key. */
export function keyBandForRankId(rankId: string): KeyBand | null {
  if (!rankId || rankId === "unranked") return null;
  if (rankId.startsWith("silver_")) return "silver";
  if (rankId.startsWith("gold_")) return "gold";
  if (rankId.startsWith("diamond_")) return "diamond";
  if (isKeyBand(rankId)) return rankId;
  return null;
}

export function dailyCaseId(rankId: string): string {
  return `daily_${rankId}`;
}

export function keyCaseId(band: KeyBand): string {
  return `key_${band}`;
}

export type RankCaseMeta =
  | { kind: "daily"; rankId: string; caseId: string }
  | { kind: "key"; band: KeyBand; caseId: string };

export function parseRankCaseId(id: string): RankCaseMeta | null {
  if (id.startsWith("daily_")) {
    const rankId = id.slice("daily_".length);
    if (rankId) return { kind: "daily", rankId, caseId: id };
    return null;
  }
  if (id.startsWith("key_")) {
    const band = id.slice("key_".length);
    if (isKeyBand(band)) return { kind: "key", band, caseId: id };
  }
  return null;
}

export function isRankRewardCaseId(id: string): boolean {
  return parseRankCaseId(id) != null;
}

/** One key per rank entered (destination band). Silver 3 → Gold 1 yields a gold key. */
export function keysGrantedBetween(fromRankId: string, toRankId: string, tiers: VipTier[]): KeyBand[] {
  const list = sortedTiers(tiers);
  const prevIdx = list.findIndex((t) => t.id === fromRankId);
  const nextIdx = list.findIndex((t) => t.id === toRankId);
  if (prevIdx < 0 || nextIdx < 0 || nextIdx <= prevIdx) return [];
  const bands: KeyBand[] = [];
  for (let i = prevIdx + 1; i <= nextIdx; i++) {
    const band = keyBandForRankId(list[i]!.id);
    if (band) bands.push(band);
  }
  return bands;
}
