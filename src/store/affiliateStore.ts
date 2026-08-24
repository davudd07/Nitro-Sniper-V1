import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_COMMISSION_TOTAL, DEMO_PRIOR_CLAIMED } from "../lib/affiliate";
import { useEconomyStore } from "./economyStore";

interface AffiliateState {
  claimedShards: number;
  boardCreated: boolean;
  claim: () => number;
  createBoard: () => void;
}

export function affiliateAvailable(claimedShards: number): number {
  return Math.max(0, DEMO_COMMISSION_TOTAL - Math.max(0, claimedShards));
}

export function affiliateLifetime(): number {
  return DEMO_PRIOR_CLAIMED + DEMO_COMMISSION_TOTAL;
}

export const useAffiliateStore = create<AffiliateState>()(
  persist(
    (set, get) => ({
      claimedShards: 0,
      boardCreated: false,
      claim: () => {
        const available = affiliateAvailable(get().claimedShards);
        if (available <= 0) return 0;
        useEconomyStore.getState().creditFun(available);
        set({ claimedShards: DEMO_COMMISSION_TOTAL });
        return available;
      },
      createBoard: () => set({ boardCreated: true }),
    }),
    { name: "prism-vault-affiliate" },
  ),
);
