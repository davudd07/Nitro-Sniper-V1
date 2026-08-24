import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shortId } from "../lib/format";
import { ITEMS } from "../data/items";
import { useAuthStore } from "./authStore";
import { useEconomyStore } from "./economyStore";
import { useLoyaltyStore } from "./loyaltyStore";
import {
  COMMUNITY_COMMISSION_OF_EDGE,
  COMMUNITY_MAX_DESIGN_ITEMS,
  COMMUNITY_MAX_ITEMS,
  canCreateCommunityCase,
  chancesAreHundred,
  communityCasePrice,
  communityCommissionPerOpen,
  communityCreateRequirement,
  communityHouseEdge,
  communityNameIssue,
  hydrateCommunityCase,
  itemEv,
  riskFromEntries,
  type CommunityCaseRecord,
  type CommunityOddsInput,
} from "../lib/communityCases";
import type { Case } from "../data/cases";

export interface CreateCommunityCaseInput {
  name: string;
  from: string;
  to: string;
  designItemIds: string[];
  chestColor?: string;
  chestStickers?: CommunityCaseRecord["chestStickers"];
  entries: CommunityOddsInput[];
}

interface CommunityCasePersisted {
  cases: CommunityCaseRecord[];
  claimableByCreator: Record<string, number>;
  totalEarnedByCreator: Record<string, number>;
  opensByCreator: Record<string, number>;
  favoriteIds: string[];
}

interface CommunityCaseState extends CommunityCasePersisted {
  createCase: (input: CreateCommunityCaseInput) => { ok: true; id: string } | { ok: false; error: string };
  /**
   * Credit creator earnings for paid human opens. `paidOpens` may be fractional
   * (borrow-mode credits on a human seat). Bot opens must not be included.
   */
  accrue: (caseId: string, paidOpens: number) => number;
  /** @deprecated Use `accrue` — same behavior, human paid-opens only. */
  payOpens: (caseId: string, opens: number) => number;
  claimEarnings: (creatorId: string) => number;
  earningsFor: (creatorId: string) => { total: number; claimable: number; opens: number };
  toggleFavorite: (caseId: string) => void;
  isFavorite: (caseId: string) => boolean;
  list: () => CommunityCaseRecord[];
  byId: (id: string) => CommunityCaseRecord | undefined;
}

function sanitizeEntries(entries: CommunityOddsInput[]): CommunityOddsInput[] | string {
  const seen = new Set<string>();
  const out: CommunityOddsInput[] = [];
  for (const e of entries) {
    const item = ITEMS[e.itemId];
    if (!item) return "Items must use website prices from the catalog.";
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const chancePct = Number(e.chancePct);
    if (!Number.isFinite(chancePct) || chancePct < 0) return "Chances must be zero or positive.";
    out.push({ itemId: item.id, chancePct });
  }
  if (out.length === 0) return "Add at least one item.";
  if (out.length > COMMUNITY_MAX_ITEMS) return `At most ${COMMUNITY_MAX_ITEMS} distinct items.`;
  if (!chancesAreHundred(out)) return "Odds must sum to 100%.";
  return out;
}

export const useCommunityCaseStore = create<CommunityCaseState>()(
  persist(
    (set, get) => ({
      cases: [],
      claimableByCreator: {},
      totalEarnedByCreator: {},
      opensByCreator: {},
      favoriteIds: [],
      list: () => get().cases,
      byId: (id) => get().cases.find((c) => c.id === id),
      isFavorite: (caseId) => get().favoriteIds.includes(caseId),
      toggleFavorite: (caseId) => {
        if (!caseId) return;
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(caseId)
            ? s.favoriteIds.filter((id) => id !== caseId)
            : [...s.favoriteIds, caseId],
        }));
      },
      earningsFor: (creatorId) => ({
        total: get().totalEarnedByCreator[creatorId] ?? 0,
        claimable: get().claimableByCreator[creatorId] ?? 0,
        opens: get().opensByCreator[creatorId] ?? 0,
      }),
      claimEarnings: (creatorId) => {
        if (!creatorId) return 0;
        const amount = get().claimableByCreator[creatorId] ?? 0;
        if (!(amount > 0)) return 0;
        set((s) => ({
          claimableByCreator: { ...s.claimableByCreator, [creatorId]: 0 },
        }));
        useEconomyStore.getState().credit(amount);
        return amount;
      },
      accrue: (caseId, paidOpens) => {
        if (!(paidOpens > 0)) return 0;
        const rec = get().cases.find((c) => c.id === caseId);
        if (!rec) return 0;
        const amount = communityCommissionPerOpen(rec.price, rec.houseEdge, rec.commissionRate, paidOpens);
        if (!(amount > 0)) return 0;
        set((s) => ({
          claimableByCreator: {
            ...s.claimableByCreator,
            [rec.creatorId]: (s.claimableByCreator[rec.creatorId] ?? 0) + amount,
          },
          totalEarnedByCreator: {
            ...s.totalEarnedByCreator,
            [rec.creatorId]: (s.totalEarnedByCreator[rec.creatorId] ?? 0) + amount,
          },
          opensByCreator: {
            ...s.opensByCreator,
            [rec.creatorId]: (s.opensByCreator[rec.creatorId] ?? 0) + paidOpens,
          },
        }));
        return amount;
      },
      payOpens: (caseId, opens) => get().accrue(caseId, opens),
      createCase: (input) => {
        const session = useAuthStore.getState().session;
        if (!session) return { ok: false, error: "Create a username before publishing a community case." };
        const loyalty = useLoyaltyStore.getState();
        const xp = loyalty.lifetimeXp();
        if (!canCreateCommunityCase(xp, loyalty.config.tiers)) {
          const req = communityCreateRequirement(loyalty.config.tiers);
          return {
            ok: false,
            error: `Level ${req.rank} (${req.tier.name} VIP, ${req.minXp.toLocaleString()} XP) required to create a community case.`,
          };
        }
        const nameIssue = communityNameIssue(input.name);
        if (nameIssue) return { ok: false, error: nameIssue };
        const entries = sanitizeEntries(input.entries);
        if (typeof entries === "string") return { ok: false, error: entries };
        const houseEdge = communityHouseEdge(loyalty.config.houseEdges);
        const ev = itemEv(entries);
        const price = communityCasePrice(ev, houseEdge);
        if (price <= 0 || ev >= price) {
          return { ok: false, error: "Case EV must stay below price after the house edge. +EV cases are not allowed." };
        }
        const selectedIds = new Set(entries.map((e) => e.itemId));
        const stickers = (input.chestStickers ?? [])
          .filter((s) => selectedIds.has(s.itemId) && ITEMS[s.itemId])
          .slice(0, COMMUNITY_MAX_DESIGN_ITEMS);
        const designItemIds = (stickers.length > 0 ? stickers.map((s) => s.itemId) : input.designItemIds)
          .filter((id) => selectedIds.has(id) && ITEMS[id])
          .filter((id, i, arr) => arr.indexOf(id) === i)
          .slice(0, COMMUNITY_MAX_DESIGN_ITEMS);
        const name = input.name.trim().replace(/\s+/g, " ");
        const rec: CommunityCaseRecord = {
          id: shortId("cc"),
          name,
          price,
          ev,
          houseEdge,
          commissionRate: COMMUNITY_COMMISSION_OF_EDGE,
          risk: riskFromEntries(entries),
          blurb: `Community case by ${session}.`,
          from: input.from,
          to: input.to,
          creatorId: session,
          creatorName: session,
          createdAt: Date.now(),
          designItemIds,
          chestColor: input.chestColor ?? input.from,
          chestStickers: stickers,
          entries,
        };
        set((s) => ({ cases: [rec, ...s.cases] }));
        return { ok: true, id: rec.id };
      },
    }),
    {
      name: "prism-vault-community-cases",
      version: 2,
      partialize: (s) => ({
        cases: s.cases,
        claimableByCreator: s.claimableByCreator,
        totalEarnedByCreator: s.totalEarnedByCreator,
        opensByCreator: s.opensByCreator,
        favoriteIds: s.favoriteIds,
      }),
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const cases = Array.isArray(p.cases) ? (p.cases as CommunityCaseRecord[]) : [];
        const oldEarn =
          (p.totalEarnedByCreator as Record<string, number> | undefined) ??
          (p.earningsByCreator as Record<string, number> | undefined) ??
          {};
        return {
          cases,
          claimableByCreator: (p.claimableByCreator as Record<string, number> | undefined) ?? {},
          totalEarnedByCreator: oldEarn,
          opensByCreator: (p.opensByCreator as Record<string, number> | undefined) ?? {},
          favoriteIds: Array.isArray(p.favoriteIds) ? (p.favoriteIds as string[]) : [],
        } satisfies CommunityCasePersisted;
      },
    },
  ),
);

export function findHydratedCommunityCase(id: string): Case | undefined {
  const rec = useCommunityCaseStore.getState().byId(id);
  return rec ? hydrateCommunityCase(rec) : undefined;
}

export function listHydratedCommunityCases(): Case[] {
  return useCommunityCaseStore.getState().cases.map(hydrateCommunityCase);
}

export function useCommunityCasesHydrated(): boolean {
  const [ready, setReady] = useState(() => useCommunityCaseStore.persist.hasHydrated());
  useEffect(() => {
    if (useCommunityCaseStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    return useCommunityCaseStore.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}
