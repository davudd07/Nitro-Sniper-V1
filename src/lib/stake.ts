import { useEconomyStore } from "../store/economyStore";

/** Stake 0 is a demo round (no SH deducted, no rakeback). Anything above 0 spends SH. */
export function isDemoStake(amount: number): boolean {
  return amount <= 0;
}

export function takeStake(amount: number, houseEdge: number): boolean {
  if (amount <= 0) return true;
  const eco = useEconomyStore.getState();
  if (!eco.spend(amount)) return false;
  eco.awardRakeback(amount, houseEdge);
  return true;
}
