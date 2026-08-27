import { useEconomyStore } from "../store/economyStore";
import { awardAffiliateOnWager } from "../store/affiliateStore";
import { LOCAL_PLAYER, useModerationStore } from "../store/moderationStore";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { playCurrency, playCurrencyLabel, type PlayCurrency } from "./playWallet";

/** Stake 0 is a demo round (no ledger deducted, no rakeback). */
export function isDemoStake(amount: number): boolean {
  return amount <= 0;
}

export function requireAccount(): boolean {
  if (useAuthStore.getState().requireAccount()) return true;
  useToastStore.getState().push("Create a username before placing a demo or World Lock bet.", "info");
  return false;
}

function takeStakeOn(amount: number, houseEdge: number, currency: PlayCurrency): boolean {
  if (!requireAccount()) return false;
  if (useModerationStore.getState().isBanned(LOCAL_PLAYER)) {
    useToastStore.getState().push("This demo account is banned from staking.", "danger");
    return false;
  }
  if (amount <= 0) return true;
  const eco = useEconomyStore.getState();
  if (!eco.spendLedger(amount, currency)) return false;
  if (currency === "wl") {
    eco.awardRakeback(amount, houseEdge);
    awardAffiliateOnWager(amount, houseEdge);
    eco.awardShardsFromWlWager(amount);
  }
  return true;
}

/** Stake from the wallet currently selected in the header. */
export function takeStake(amount: number, houseEdge: number): boolean {
  return takeStakeOn(amount, houseEdge, playCurrency());
}

/** Stake a specific ledger — battles/jackpot pots never mix Shards with World Locks. */
export function takeStakeFor(amount: number, houseEdge: number, currency: PlayCurrency): boolean {
  return takeStakeOn(amount, houseEdge, currency);
}

export function stakeNeedMessage(amount: number, currency: PlayCurrency = playCurrency()): string {
  return `You need ${amount.toLocaleString("en-US")} ${playCurrencyLabel(currency)} for that.`;
}
