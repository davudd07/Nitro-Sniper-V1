import { useSettingsStore } from "../store/settingsStore";

/** Active play ledger: World Locks or Shards. The two never mix in a pot. */
export type PlayCurrency = "wl" | "shards";

/** 10 World Locks wagered credits 1 Shard. */
export const WL_PER_SHARD = 10;

export function playCurrencyFromWallet(headerWallet: "locks" | "shards"): PlayCurrency {
  return headerWallet === "shards" ? "shards" : "wl";
}

export function playCurrency(): PlayCurrency {
  return playCurrencyFromWallet(useSettingsStore.getState().headerWallet);
}

export function usePlayCurrency(): PlayCurrency {
  const headerWallet = useSettingsStore((s) => s.headerWallet);
  return playCurrencyFromWallet(headerWallet);
}

export function battlePlayCurrency(battle: { currency?: PlayCurrency } | null | undefined): PlayCurrency {
  return battle?.currency === "shards" ? "shards" : "wl";
}

export function playCurrencyLabel(currency: PlayCurrency): string {
  return currency === "shards" ? "Shards" : "World Locks";
}
