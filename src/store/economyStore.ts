import { create } from "zustand";
import { persist } from "zustand/middleware";
import { rakebackAmount } from "../lib/rakeback";
import { logPlay, type ActivityGame } from "./activityStore";
import { maybeShoutBigWin } from "../lib/bigWinChat";
import { considerWinLeader, localWinName } from "./winLeaderStore";
import { awardWagerXp, useLoyaltyStore } from "./loyaltyStore";
import { LOCAL_XP_USER, resolveVip } from "../lib/loyalty";
import { shortId } from "../lib/format";
import { playCurrency, WL_PER_SHARD, type PlayCurrency } from "../lib/playWallet";
import { isLocalOwner } from "../lib/owner";
import { trackSettledWlWager } from "../lib/wagerTrack";
import { appendBalanceLedger } from "./balanceLedgerStore";

export const STARTING_BALANCE = 10000;
export const LOW_BALANCE_THRESHOLD = 100;
export const TOP_UP_AMOUNT = 10000;
/** Daily rakeback only — Instant Drop is claimable as soon as it accrues. */
export const DAILY_RAKEBACK_MS = 24 * 60 * 60 * 1000;

interface EconomyState {
  balance: number;
  funCoins: number;
  /** World Locks toward the next Shard (10 WL wagered = 1 Shard). */
  shardWagerResidue: number;
  totalWagered: number;
  totalWon: number;
  totalRakeback: number;
  pendingRakeback: number;
  rakebackMatureAt: number;
  pendingDailyRakeback: number;
  dailyMatureAt: number;
  lockedTips: number;
  tipWagerLeft: number;
  roundsPlayed: number;
  spend: (amount: number) => boolean;
  spendFun: (amount: number) => boolean;
  spendLedger: (amount: number, currency: PlayCurrency) => boolean;
  credit: (amount: number) => void;
  creditFun: (amount: number) => void;
  creditLedger: (amount: number, currency: PlayCurrency) => void;
  /** Credit a game payout into the wallet you are currently playing. */
  payout: (amount: number, currency?: PlayCurrency) => void;
  awardShardsFromWlWager: (wagered: number) => number;
  awardRakeback: (stake: number, houseEdge: number) => number;
  grantPendingRakeback: (amount: number) => void;
  claimRakeback: () => number;
  claimDailyRakeback: () => number;
  receiveTip: (amount: number) => void;
  applyTipWager: (wagered: number) => void;
  recordRound: (wagered: number, won: number, game?: ActivityGame, currency?: PlayCurrency) => void;
  reset: () => void;
  maybeTopUp: () => boolean;
}

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      funCoins: 0,
      shardWagerResidue: 0,
      totalWagered: 0,
      totalWon: 0,
      totalRakeback: 0,
      pendingRakeback: 0,
      rakebackMatureAt: 0,
      pendingDailyRakeback: 0,
      dailyMatureAt: 0,
      lockedTips: 0,
      tipWagerLeft: 0,
      roundsPlayed: 0,
      // `amount` is always World Locks. Never pass Diamond / Blue Gem Lock display units.
      spend: (amount) => {
        const { balance } = get();
        if (amount <= 0) return true;
        if (balance < amount) return false;
        set({ balance: balance - amount });
        return true;
      },
      spendFun: (amount) => {
        const { funCoins } = get();
        if (amount <= 0) return true;
        if (funCoins < amount) return false;
        set({ funCoins: funCoins - amount });
        return true;
      },
      spendLedger: (amount, currency) => {
        if (currency === "shards") return get().spendFun(amount);
        return get().spend(amount);
      },
      credit: (amount) => {
        if (!(amount > 0)) return;
        set((s) => ({ balance: s.balance + amount }));
      },
      creditFun: (amount) => {
        if (amount <= 0) return;
        set((s) => ({ funCoins: s.funCoins + amount }));
      },
      creditLedger: (amount, currency) => {
        if (amount <= 0) return;
        if (currency === "shards") get().creditFun(amount);
        else get().credit(amount);
        appendBalanceLedger({
          name: "You",
          kind: "payout",
          amount,
          currency,
          balanceAfter: currency === "shards" ? get().funCoins : get().balance,
          note: "Wallet credit",
        });
      },
      payout: (amount, currency) => {
        get().creditLedger(amount, currency ?? playCurrency());
      },
      awardShardsFromWlWager: (wagered) => {
        if (!(wagered > 0)) return 0;
        const total = (get().shardWagerResidue ?? 0) + wagered;
        const granted = Math.floor(total / WL_PER_SHARD);
        const residue = total % WL_PER_SHARD;
        if (granted > 0) {
          set((s) => ({
            funCoins: s.funCoins + granted,
            shardWagerResidue: residue,
          }));
        } else {
          set({ shardWagerResidue: residue });
        }
        return granted;
      },
      awardRakeback: (stake, houseEdge) => {
        const base = rakebackAmount(stake, houseEdge);
        if (base <= 0) return 0;
        const loyalty = useLoyaltyStore.getState();
        const vip = resolveVip(loyalty.xpByUser[LOCAL_XP_USER] ?? 0, loyalty.config.tiers);
        const amt = base * (1 + (vip.current.rakebackBonusPct || 0));
        const now = Date.now();
        set((s) => {
          const instantPending = s.pendingRakeback ?? 0;
          const dailyPending = s.pendingDailyRakeback ?? 0;
          return {
            pendingRakeback: instantPending + amt,
            rakebackMatureAt: 0,
            pendingDailyRakeback: dailyPending + amt,
            dailyMatureAt:
              dailyPending <= 0 && !(s.dailyMatureAt ?? 0) ? now + DAILY_RAKEBACK_MS : s.dailyMatureAt ?? 0,
          };
        });
        return amt;
      },
      grantPendingRakeback: (amount) => {
        if (amount <= 0) return;
        set((s) => ({
          pendingRakeback: (s.pendingRakeback ?? 0) + amount,
          rakebackMatureAt: 0,
        }));
      },
      claimRakeback: () => {
        const amt = get().pendingRakeback ?? 0;
        if (amt <= 0) return 0;
        set((s) => ({
          pendingRakeback: 0,
          rakebackMatureAt: 0,
          balance: s.balance + amt,
          totalRakeback: s.totalRakeback + amt,
        }));
        appendBalanceLedger({
          name: "You",
          kind: "rakeback",
          amount: amt,
          currency: "wl",
          balanceAfter: get().balance,
          note: "Instant rakeback",
        });
        return amt;
      },
      claimDailyRakeback: () => {
        const amt = get().pendingDailyRakeback ?? 0;
        if (amt <= 0) return 0;
        const matureAt = get().dailyMatureAt ?? 0;
        if (matureAt > Date.now()) return 0;
        set((s) => ({
          pendingDailyRakeback: 0,
          dailyMatureAt: 0,
          balance: s.balance + amt,
          totalRakeback: s.totalRakeback + amt,
        }));
        appendBalanceLedger({
          name: "You",
          kind: "rakeback",
          amount: amt,
          currency: "wl",
          balanceAfter: get().balance,
          note: "Daily rakeback",
        });
        return amt;
      },
      receiveTip: (amount) => {
        if (amount <= 0) return;
        set((s) => ({
          lockedTips: (s.lockedTips ?? 0) + amount,
          tipWagerLeft: (s.tipWagerLeft ?? 0) + amount,
        }));
        appendBalanceLedger({
          name: "You",
          kind: "tip_received",
          amount,
          currency: "wl",
          note: "Locked until you wager this amount",
        });
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
        appendBalanceLedger({
          name: "You",
          kind: "tip_unlocked",
          amount: locked,
          currency: "wl",
          balanceAfter: get().balance,
          note: "Wager requirement met",
        });
      },
      recordRound: (wagered, won, game, currency) => {
        const ledger = currency ?? playCurrency();
        const owner = isLocalOwner();
        const left = get().tipWagerLeft ?? 0;
        const locked = get().lockedTips ?? 0;
        let unlocked = 0;
        set((s) => {
          let tipWagerLeft = left;
          let lockedTips = locked;
          let balance = s.balance;
          if (wagered > 0 && ledger !== "shards" && left > 0 && locked > 0) {
            tipWagerLeft = Math.max(0, left - wagered);
            if (tipWagerLeft === 0) {
              lockedTips = 0;
              balance += locked;
              unlocked = locked;
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
        if (unlocked > 0) {
          appendBalanceLedger({
            name: "You",
            kind: "tip_unlocked",
            amount: unlocked,
            currency: "wl",
            balanceAfter: get().balance,
            note: "Wager requirement met",
          });
        }
        if (game && (wagered > 0 || won > 0)) {
          const playId = shortId("play");
          logPlay({ id: playId, name: "You", game, wagered, won, currency: ledger });
          if (wagered > 0 && ledger !== "shards" && !owner) {
            awardWagerXp({ betId: playId, wagered, gameType: game, currency: "shard" });
            trackSettledWlWager(wagered);
          }
          if (!owner && game !== "battles" && wagered > 0 && won > 0) {
            considerWinLeader(game, { name: localWinName(), multiplier: won / wagered, isYou: true });
          }
          maybeShoutBigWin(localWinName(), wagered, won, game);
        }
      },
      reset: () =>
        set({
          balance: STARTING_BALANCE,
          funCoins: 0,
          shardWagerResidue: 0,
          totalWagered: 0,
          totalWon: 0,
          totalRakeback: 0,
          pendingRakeback: 0,
          rakebackMatureAt: 0,
          pendingDailyRakeback: 0,
          dailyMatureAt: 0,
          lockedTips: 0,
          tipWagerLeft: 0,
          roundsPlayed: 0,
        }),
      maybeTopUp: () => {
        const { balance } = get();
        if (balance < LOW_BALANCE_THRESHOLD) {
          set({ balance: balance + TOP_UP_AMOUNT });
          appendBalanceLedger({
            name: "You",
            kind: "topup",
            amount: TOP_UP_AMOUNT,
            currency: "wl",
            balanceAfter: get().balance,
            note: "Low-balance auto top-up",
          });
          return true;
        }
        return false;
      },
    }),
    { name: "prism-vault-economy" },
  ),
);
