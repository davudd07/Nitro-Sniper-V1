export type RarityId = "common" | "uncommon" | "rare" | "epic" | "mythic";

export interface Rarity {
  id: RarityId;
  label: string;
  text: string;
  from: string;
  to: string;
  ring: string;
}

export const RARITIES: Record<RarityId, Rarity> = {
  common: { id: "common", label: "Common", text: "#cbd5e1", from: "#64748b", to: "#1e293b", ring: "#64748b" },
  uncommon: { id: "uncommon", label: "Uncommon", text: "#6ee7b7", from: "#10b981", to: "#064e3b", ring: "#10b981" },
  rare: { id: "rare", label: "Rare", text: "#7dd3fc", from: "#0ea5e9", to: "#0c4a6e", ring: "#0ea5e9" },
  epic: { id: "epic", label: "Epic", text: "#e9a6ff", from: "#c026d3", to: "#4a044e", ring: "#c026d3" },
  mythic: { id: "mythic", label: "Mythic", text: "#fde68a", from: "#f59e0b", to: "#78350f", ring: "#f59e0b" },
};

export const RARITY_ORDER: RarityId[] = ["common", "uncommon", "rare", "epic", "mythic"];
