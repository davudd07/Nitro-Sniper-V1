import { create } from "zustand";
import { persist } from "zustand/middleware";
import { rakebackAmount } from "../lib/rakeback";
import { logPlay, type ActivityGame } from "./activityStore";
import { considerWinLeader, localWinName } from "./winLeaderStore";
import { awardWagerXp, useLoyaltyStore } from "./loyaltyStore";
import { LOCAL_XP_USER, resolveVip } from "../lib/loyalty";
import { shortId } from "../lib/format";

export const STARTING_BALANCE = 10000;
export const LOW_BALANCE_THRESHOLD = 100;
export const TOP_UP_AMOUNT = 10000;
export const RAKEBACK_EARLY_PCT = 0.7;
export const RAKEBACK_MATURE_MS = 24 * 60 * 60 * 1000;

interface EconomyState {
  balance: number;
  funCoins: number;
  totalWagered: number;
  totalWon: number;
  totalRakeback: number;
  pendingRakeback: number;
  rakebackMatureAt: number;
  lockedTips: number;
  tipWagerLeft: number;
  roundsPlayed: number;
  spend: (amount: number) => boolean;
  credit: (amount: number) => void;
  creditFun: (amount: number) => void;
  awardRakeback: (stake: number, houseEdge: number) => number;
  grantPendingRakeback: (amount: number) => void;
  claimRakeback: () => number;
  claimEarlyRakeback: () => number;
  receiveTip: (amount: number) => void;
  applyTipWager: (wagered: number) => void;
  recordRound: (wagered: number, won: number, game?: ActivityGame) => void;
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
      rakebackMatureAt: 0,
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
        const base = rakebackAmount(stake, houseEdge);
        if (base <= 0) return 0;
        const loyalty = useLoyaltyStore.getState();
        const vip = resolveVip(loyalty.xpByUser[LOCAL_XP_USER] ?? 0, loyalty.config.tiers);
        const amt = base * (1 + (vip.current.rakebackBonusPct || 0));
        set((s) => ({
          pendingRakeback: (s.pendingRakeback ?? 0) + amt,
          rakebackMatureAt:
            (s.pendingRakeback ?? 0) <= 0 && !(s.rakebackMatureAt ?? 0)
              ? Date.now() + RAKEBACK_MATURE_MS
              : s.rakebackMatureAt ?? 0,
        }));
        return amt;
      },
      grantPendingRakeback: (amount) => {
        if (amount <= 0) return;
        set((s) => ({
          pendingRakeback: (s.pendingRakeback ?? 0) + amount,
          rakebackMatureAt:
            (s.pendingRakeback ?? 0) <= 0 && !(s.rakebackMatureAt ?? 0)
              ? Date.now() + RAKEBACK_MATURE_MS
              : s.rakebackMatureAt ?? 0,
        }));
      },
      claimRakeback: () => {
        const amt = get().pendingRakeback ?? 0;
        if (amt <= 0) return 0;
        const matureAt = get().rakebackMatureAt ?? 0;
        if (matureAt > Date.now()) return 0;
        set((s) => ({
          pendingRakeback: 0,
          rakebackMatureAt: 0,
          balance: s.balance + amt,
          totalRakeback: s.totalRakeback + amt,
        }));
        return amt;
      },
      claimEarlyRakeback: () => {
        const full = get().pendingRakeback ?? 0;
        if (full <= 0) return 0;
        const matureAt = get().rakebackMatureAt ?? 0;
        if (matureAt > 0 && matureAt <= Date.now()) return 0;
        const paid = full * RAKEBACK_EARLY_PCT;
        set((s) => ({
          pendingRakeback: 0,
          rakebackMatureAt: 0,
          balance: s.balance + paid,
          totalRakeback: s.totalRakeback + paid,
        }));
        return paid;
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
      recordRound: (wagered, won, game) => {
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
        });
        if (game && (wagered > 0 || won > 0)) {
          const playId = shortId("play");
          logPlay({ id: playId, name: "You", game, wagered, won });
          if (wagered > 0) {
            awardWagerXp({ betId: playId, wagered, gameType: game, currency: "shard" });
          }
          if (game !== "battles" && wagered > 0 && won > 0) {
            considerWinLeader(game, { name: localWinName(), multiplier: won / wagered, isYou: true });
          }
        }
      },
      reset: () =>
        set({
          balance: STARTING_BALANCE,
          funCoins: 0,
          totalWagered: 0,
          totalWon: 0,
          totalRakeback: 0,
          pendingRakeback: 0,
          rakebackMatureAt: 0,
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
