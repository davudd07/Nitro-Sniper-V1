import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isFillerLoot, type TicketLootRef } from "../lib/caseTickets";

export interface GoldSpinOverride {
  extra: string[];
  removed: string[];
}

interface GoldSpinState {
  revision: number;
  overrides: Record<string, GoldSpinOverride>;
  overrideFor: (caseId: string) => GoldSpinOverride | undefined;
  /** `baseGold` is the compiled ticket gold flag, before overrides. */
  setGold: (caseId: string, itemId: string, item: TicketLootRef, baseGold: boolean, on: boolean) => { ok: true } | { ok: false; reason: string };
}

function clean(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))];
}

function emptyOverride(): GoldSpinOverride {
  return { extra: [], removed: [] };
}

export function resolveGoldTier(
  baseGold: boolean,
  override: GoldSpinOverride | undefined,
  item: TicketLootRef,
): boolean {
  if (isFillerLoot(item)) return false;
  if (!override) return baseGold;
  if (override.removed.includes(item.id)) return false;
  if (override.extra.includes(item.id)) return true;
  return baseGold;
}

export const useGoldSpinStore = create<GoldSpinState>()(
  persist(
    (set, get) => ({
      revision: 0,
      overrides: {},
      overrideFor: (caseId) => get().overrides[caseId],
      setGold: (caseId, itemId, item, baseGold, on) => {
        if (isFillerLoot(item)) {
          return { ok: false, reason: "Junk filler (dirt / fireworks / 0–1 WL) cannot be Gold Spin." };
        }
        const prev = get().overrides[caseId] ?? emptyOverride();
        let extra = prev.extra.filter((id) => id !== itemId);
        let removed = prev.removed.filter((id) => id !== itemId);
        if (on && !baseGold) extra = clean([...extra, itemId]);
        if (!on && baseGold) removed = clean([...removed, itemId]);
        const next = { ...get().overrides };
        if (extra.length === 0 && removed.length === 0) delete next[caseId];
        else next[caseId] = { extra, removed };
        set({ overrides: next, revision: get().revision + 1 });
        return { ok: true };
      },
    }),
    {
      name: "prism-vault-gold-spin",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<GoldSpinState, "overrides">>;
        const overrides: Record<string, GoldSpinOverride> = {};
        for (const [caseId, row] of Object.entries(p.overrides ?? {})) {
          if (!row) continue;
          overrides[caseId] = {
            extra: clean(Array.isArray(row.extra) ? row.extra.map(String) : []),
            removed: clean(Array.isArray(row.removed) ? row.removed.map(String) : []),
          };
        }
        return {
          ...current,
          overrides,
          // Bump so subscribers re-read getCase() after localStorage hydrates.
          revision: current.revision + 1,
        };
      },
      partialize: (s) => ({ overrides: s.overrides }),
      onRehydrateStorage: () => () => {
        useGoldSpinStore.setState((s) => ({ revision: s.revision + 1 }));
      },
    },
  ),
);

export function withGoldSpin<T extends { id: string; odds: { goldTier: boolean; item: TicketLootRef }[] }>(c: T): T {
  const override = useGoldSpinStore.getState().overrides[c.id];
  if (!override || (override.extra.length === 0 && override.removed.length === 0)) return c;
  return {
    ...c,
    odds: c.odds.map((entry) => ({
      ...entry,
      goldTier: resolveGoldTier(entry.goldTier, override, entry.item),
    })),
  };
}
