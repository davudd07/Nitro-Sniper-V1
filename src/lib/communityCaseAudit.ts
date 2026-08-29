import { ITEMS, type CaseItem } from "../data/items";
import type { CommunityCaseRecord, CommunityOddsInput } from "./communityCases";

export const MISSING_ITEM_PREFIX = "missing:";

export function isMissingCatalogItem(item: { id: string }): boolean {
  return item.id.startsWith(MISSING_ITEM_PREFIX);
}

/** Placeholder so deleted catalog rows keep their original chance instead of renormalizing. */
export function missingCatalogItem(itemId: string): CaseItem {
  const short = itemId.replace(/^missing:/, "");
  return {
    id: `${MISSING_ITEM_PREFIX}${short}`,
    name: `Removed (${short})`,
    value: 0,
    rarity: "common",
    icon: "removed",
  };
}

export function catalogItemOrMissing(itemId: string): CaseItem {
  return ITEMS[itemId] ?? missingCatalogItem(itemId);
}

export interface CommunityCaseCatalogIssue {
  caseId: string;
  name: string;
  price: number;
  storedEv: number;
  missingItemIds: string[];
  missingChancePct: number;
  remainingChancePct: number;
  /** EV if missing rows are dropped and leftover chance is stretched to 100%. */
  evIfRenormalized: number;
  /** EV if missing rows stay in the table as 0-value fillers. */
  evIfHeld: number;
  /** True when dropping missing items would make the case +EV vs its stored price. */
  plusEvIfRenormalized: boolean;
}

function chanceOf(e: CommunityOddsInput): number {
  const n = Number(e.chancePct);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function renormalizedEntries(keep: CommunityOddsInput[]): CommunityOddsInput[] {
  const keepSum = keep.reduce((s, e) => s + chanceOf(e), 0);
  if (!(keepSum > 0)) return keep;
  return keep.map((e) => ({ ...e, chancePct: (chanceOf(e) / keepSum) * 100 }));
}

export function auditCommunityCaseCatalog(
  rec: Pick<CommunityCaseRecord, "id" | "name" | "price" | "ev" | "entries">,
  catalog: Record<string, CaseItem> = ITEMS,
): CommunityCaseCatalogIssue | null {
  const missing = rec.entries.filter((e) => !catalog[e.itemId]);
  if (missing.length === 0) return null;
  const present = rec.entries.filter((e) => catalog[e.itemId]);
  const missingChancePct = missing.reduce((s, e) => s + chanceOf(e), 0);
  const remainingChancePct = present.reduce((s, e) => s + chanceOf(e), 0);
  const evIfHeldActual = present.reduce((s, e) => {
    const item = catalog[e.itemId];
    return s + (item ? item.value * (chanceOf(e) / 100) : 0);
  }, 0);
  const renormalized = renormalizedEntries(present);
  const evIfRenormalized = renormalized.reduce((s, e) => {
    const item = catalog[e.itemId];
    return s + (item ? item.value * (chanceOf(e) / 100) : 0);
  }, 0);
  return {
    caseId: rec.id,
    name: rec.name,
    price: rec.price,
    storedEv: rec.ev,
    missingItemIds: missing.map((e) => e.itemId),
    missingChancePct,
    remainingChancePct,
    evIfRenormalized,
    evIfHeld: evIfHeldActual,
    plusEvIfRenormalized: rec.price > 0 && evIfRenormalized >= rec.price,
  };
}

export function auditCommunityCases(
  cases: Pick<CommunityCaseRecord, "id" | "name" | "price" | "ev" | "entries">[],
): CommunityCaseCatalogIssue[] {
  return cases.map((c) => auditCommunityCaseCatalog(c)).filter((x): x is CommunityCaseCatalogIssue => Boolean(x));
}

type CaseLike = Pick<CommunityCaseRecord, "id" | "name" | "price" | "ev" | "entries">;

function asCaseList(value: unknown): CaseLike[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is CaseLike => {
    if (!row || typeof row !== "object") return false;
    const rec = row as Record<string, unknown>;
    return Array.isArray(rec.entries);
  });
}

/**
 * Pull community-case records out of a dump: a bare array, `{ cases }`,
 * Zustand persist `{ state: { cases } }`, or `{ state: { community-cases: { cases } } }`.
 */
export function parseCommunityCaseDump(raw: unknown): CaseLike[] {
  if (Array.isArray(raw)) return asCaseList(raw);
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const direct = asCaseList(obj.cases);
  if (direct.length > 0) return direct;
  const state = obj.state;
  if (state && typeof state === "object") {
    const st = state as Record<string, unknown>;
    const fromState = asCaseList(st.cases);
    if (fromState.length > 0) return fromState;
    for (const nested of Object.values(st)) {
      if (nested && typeof nested === "object" && Array.isArray((nested as { cases?: unknown }).cases)) {
        const inner = asCaseList((nested as { cases: unknown }).cases);
        if (inner.length > 0) return inner;
      }
    }
  }
  return [];
}
