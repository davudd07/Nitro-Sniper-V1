import type { CaseItem } from "./items";

export const GOLD_INDICATOR: CaseItem = {
  id: "__gold_indicator__",
  name: "GOLD SPIN",
  value: 0,
  rarity: "mythic",
  icon: "sparkles",
};

export function isGoldIndicator(item: { id: string }): boolean {
  return item.id === GOLD_INDICATOR.id;
}
