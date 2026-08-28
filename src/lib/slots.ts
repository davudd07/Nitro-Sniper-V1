/** Real provider slots. Fun/demo play only — no World Lock or Shard stake. */

export type SlotProviderId = "pragmatic";

export interface ProviderSlot {
  id: string;
  name: string;
  provider: "Pragmatic Play";
  providerId: SlotProviderId;
  symbol: string;
}

export const PROVIDER_SLOTS: ProviderSlot[] = [
  {
    id: "gates-of-olympus",
    name: "Gates of Olympus",
    provider: "Pragmatic Play",
    providerId: "pragmatic",
    symbol: "vs20olympgate",
  },
  {
    id: "sweet-bonanza",
    name: "Sweet Bonanza",
    provider: "Pragmatic Play",
    providerId: "pragmatic",
    symbol: "vs20fruitsw",
  },
  {
    id: "sugar-rush",
    name: "Sugar Rush",
    provider: "Pragmatic Play",
    providerId: "pragmatic",
    symbol: "vs20sugarrush",
  },
  {
    id: "starlight-princess",
    name: "Starlight Princess",
    provider: "Pragmatic Play",
    providerId: "pragmatic",
    symbol: "vs20starlight",
  },
];

export function providerSlotById(id: string): ProviderSlot | undefined {
  return PROVIDER_SLOTS.find((s) => s.id === id);
}

export function providerSlotThumb(symbol: string): string {
  return `https://common-static.ppgames.net/game_pic/square/200/${symbol}.png`;
}

/** Pragmatic Play’s public fun/demo launcher. Credits stay inside the game. */
export function pragmaticDemoUrl(symbol: string): string {
  const website =
    typeof window !== "undefined" ? window.location.origin : "https://demogamesfree.pragmaticplay.net";
  const params = new URLSearchParams({
    gameSymbol: symbol,
    lang: "en",
    cur: "USD",
    jurisdiction: "99",
    websiteUrl: website,
  });
  return `https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?${params.toString()}`;
}

export function providerLaunchUrl(slot: ProviderSlot): string {
  if (slot.providerId === "pragmatic") return pragmaticDemoUrl(slot.symbol);
  return pragmaticDemoUrl(slot.symbol);
}
