import { publicPlayerName } from "./publicName";
import type { Case } from "../data/cases";
import { useCaseStatsStore } from "../store/caseStatsStore";
import { useCommunityCaseStore } from "../store/communityCaseStore";

export const OFFICIAL_CREATOR = "SeedBET";

export function caseCreatorLabel(c: Pick<Case, "community" | "creatorName">): string {
  if (!c.community) return OFFICIAL_CREATOR;
  return publicPlayerName(c.creatorName || "Unknown");
}

export function caseOpenCount(c: Pick<Case, "id" | "community" | "opens">): number {
  if (c.community) {
    const rec = useCommunityCaseStore.getState().byId(c.id);
    return rec?.opens ?? c.opens ?? 0;
  }
  return useCaseStatsStore.getState().opensFor(c.id);
}

export function formatOpenCount(n: number): string {
  const v = Math.max(0, Math.round(n));
  return `${v.toLocaleString()} ${v === 1 ? "open" : "opens"}`;
}
