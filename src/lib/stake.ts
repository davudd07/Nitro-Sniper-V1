import { useEconomyStore } from "../store/economyStore";
import { awardAffiliateOnWager } from "../store/affiliateStore";
import { LOCAL_PLAYER, useModerationStore } from "../store/moderationStore";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { playCurrency, playCurrencyLabel, type PlayCurrency } from "./playWallet";
import { isLocalOwner } from "./owner";
import { appendBalanceLedger } from "../store/balanceLedgerStore";

/** Stake 0 is a demo round (no ledger deducted, no rakeback). */
export function isDemoStake(amount: number): boolean {
  return amount <= 0;
}

export function requireAccount(): boolean {
  if (useAuthStore.getState().requireAccount()) return true;
  useToastStore.getState().push("Create a username first.", "info");
  return false;
}

function takeStakeOn(amount: number, houseEdge: number, currency: PlayCurrency): boolean {
  if (!requireAccount()) return false;
  const mod = useModerationStore.getState();
  if (mod.isBanned(LOCAL_PLAYER)) {
    useToastStore.getState().push("This demo account is banned from staking.", "danger");
    return false;
  }
  if (mod.isLocked(LOCAL_PLAYER)) {
    useToastStore.getState().push("This account is locked. Balance cannot be wagered, tipped, or spent.", "danger");
    return false;
  }
  if (amount <= 0) return true;
  const eco = useEconomyStore.getState();
  if (!eco.spendLedger(amount, currency)) return false;
  const after = useEconomyStore.getState();
  appendBalanceLedger({
    name: LOCAL_PLAYER,
    kind: "wager",
    amount: -amount,
    currency,
    balanceAfter: currency === "shards" ? after.funCoins : after.balance,
    note: "Stake",
  });
  if (currency === "wl" && !isLocalOwner()) {
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

/** Blocks locked/banned accounts from spending, tipping, or claiming. */
export function assertBalanceUsable(action = "use your balance"): boolean {
  if (!requireAccount()) return false;
  const mod = useModerationStore.getState();
  if (mod.isBanned(LOCAL_PLAYER)) {
    useToastStore.getState().push("This demo account is banned from staking.", "danger");
    return false;
  }
  if (mod.isLocked(LOCAL_PLAYER)) {
    useToastStore.getState().push(`This account is locked. You can't ${action}.`, "danger");
    return false;
  }
  return true;
}
