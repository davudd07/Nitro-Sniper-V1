import { create } from "zustand";
import { persist } from "zustand/middleware";
import { rakebackAmount } from "../lib/rakeback";

export const STARTING_BALANCE = 10000;
export const LOW_BALANCE_THRESHOLD = 100;
export const TOP_UP_AMOUNT = 10000;

interface EconomyState {
  balance: number;
  funCoins: number;
  totalWagered: number;
  totalWon: number;
  totalRakeback: number;
  pendingRakeback: number;
  lockedTips: number;
  tipWagerLeft: number;
  roundsPlayed: number;
  spend: (amount: number) => boolean;
  credit: (amount: number) => void;
  creditFun: (amount: number) => void;
  awardRakeback: (stake: number, houseEdge: number) => number;
  grantPendingRakeback: (amount: number) => void;
  claimRakeback: () => number;
  receiveTip: (amount: number) => void;
  applyTipWager: (wagered: number) => void;
  recordRound: (wagered: number, won: number) => void;
  reset: () => void;
  maybeTopUp: () => boolean;
}

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      funCoins: 0,
      totalWagered: 0,
      totalWon: 0,
      totalRakeback: 0,
      pendingRakeback: 0,
      lockedTips: 0,
      tipWagerLeft: 0,
      roundsPlayed: 0,
      spend: (amount) => {
        const { balance } = get();
        if (amount <= 0) return true;
        if (balance < amount) return false;
        set({ balance: balance - amount });
        return true;
      },
      credit: (amount) => set((s) => ({ balance: s.balance + amount })),
      creditFun: (amount) => {
        if (amount <= 0) return;
        set((s) => ({ funCoins: s.funCoins + amount }));
      },
      awardRakeback: (stake, houseEdge) => {
        const amt = rakebackAmount(stake, houseEdge);
        if (amt <= 0) return 0;
        set((s) => ({ pendingRakeback: (s.pendingRakeback ?? 0) + amt }));
        return amt;
      },
      grantPendingRakeback: (amount) => {
        if (amount <= 0) return;
        set((s) => ({ pendingRakeback: (s.pendingRakeback ?? 0) + amount }));
      },
      claimRakeback: () => {
        const amt = get().pendingRakeback ?? 0;
        if (amt <= 0) return 0;
        set((s) => ({
          pendingRakeback: 0,
          balance: s.balance + amt,
          totalRakeback: s.totalRakeback + amt,
        }));
        return amt;
      },
      receiveTip: (amount) => {
        if (amount <= 0) return;
        set((s) => ({
          lockedTips: (s.lockedTips ?? 0) + amount,
          tipWagerLeft: (s.tipWagerLeft ?? 0) + amount,
        }));
      },
      applyTipWager: (wagered) => {
        if (wagered <= 0) return;
        const left = get().tipWagerLeft ?? 0;
        const locked = get().lockedTips ?? 0;
        if (left <= 0 || locked <= 0) return;
        const nextLeft = Math.max(0, left - wagered);
        if (nextLeft > 0) {
          set({ tipWagerLeft: nextLeft });
          return;
        }
        set((s) => ({
          tipWagerLeft: 0,
          lockedTips: 0,
          balance: s.balance + locked,
        }));
      },
      recordRound: (wagered, won) =>
        set((s) => {
          const left = s.tipWagerLeft ?? 0;
          const locked = s.lockedTips ?? 0;
          let tipWagerLeft = left;
          let lockedTips = locked;
          let balance = s.balance;
          if (wagered > 0 && left > 0 && locked > 0) {
            tipWagerLeft = Math.max(0, left - wagered);
            if (tipWagerLeft === 0) {
              lockedTips = 0;
              balance += locked;
            }
          }
          return {
            totalWagered: s.totalWagered + wagered,
            totalWon: s.totalWon + won,
            roundsPlayed: s.roundsPlayed + 1,
            tipWagerLeft,
            lockedTips,
            balance,
          };
        }),
      reset: () =>
        set({
          balance: STARTING_BALANCE,
          funCoins: 0,
          totalWagered: 0,
          totalWon: 0,
          totalRakeback: 0,
          pendingRakeback: 0,
          lockedTips: 0,
          tipWagerLeft: 0,
          roundsPlayed: 0,
        }),
      maybeTopUp: () => {
        const { balance } = get();
        if (balance < LOW_BALANCE_THRESHOLD) {
          set({ balance: balance + TOP_UP_AMOUNT });
          return true;
        }
        return false;
      },
    }),
    { name: "prism-vault-economy" },
  ),
);
