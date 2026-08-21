import { useEconomyStore } from "../store/economyStore";
import { LOCAL_PLAYER, useModerationStore } from "../store/moderationStore";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";

/** Stake 0 is a demo round (no SH deducted, no rakeback). Anything above 0 spends SH. */
export function isDemoStake(amount: number): boolean {
  return amount <= 0;
}

export function requireAccount(): boolean {
  if (useAuthStore.getState().requireAccount()) return true;
  useToastStore.getState().push("Create a username before placing a demo or Shard bet.", "info");
  return false;
}

export function takeStake(amount: number, houseEdge: number): boolean {
  if (!requireAccount()) return false;
  if (useModerationStore.getState().isBanned(LOCAL_PLAYER)) {
    useToastStore.getState().push("This demo account is banned from staking.", "danger");
    return false;
  }
  if (amount <= 0) return true;
  const eco = useEconomyStore.getState();
  if (!eco.spend(amount)) return false;
  eco.awardRakeback(amount, houseEdge);
  return true;
}
