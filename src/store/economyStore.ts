import { create } from "zustand";
import { persist } from "zustand/middleware";

export const STARTING_BALANCE = 10000;
export const LOW_BALANCE_THRESHOLD = 100;
export const TOP_UP_AMOUNT = 10000;

interface EconomyState {
  balance: number;
  totalWagered: number;
  totalWon: number;
  roundsPlayed: number;
  spend: (amount: number) => boolean;
  credit: (amount: number) => void;
  recordRound: (wagered: number, won: number) => void;
  reset: () => void;
  maybeTopUp: () => boolean;
}

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      totalWagered: 0,
      totalWon: 0,
      roundsPlayed: 0,
      spend: (amount) => {
        const { balance } = get();
        if (amount <= 0) return true;
        if (balance < amount) return false;
        set({ balance: balance - amount });
        return true;
      },
      credit: (amount) => set((s) => ({ balance: s.balance + amount })),
      recordRound: (wagered, won) =>
        set((s) => ({
          totalWagered: s.totalWagered + wagered,
          totalWon: s.totalWon + won,
          roundsPlayed: s.roundsPlayed + 1,
        })),
      reset: () => set({ balance: STARTING_BALANCE, totalWagered: 0, totalWon: 0, roundsPlayed: 0 }),
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
