/** Real provider slots. Fun play uses studio credits; Locks / Shards stake the wallet here. */

export type SlotProviderId = "pragmatic";
export type SlotPlayMode = "fun" | "wl" | "shards";

/** Wallet spins settle on SeedBET (~96% RTP). Studio reels keep their own demo credits. */
export const SLOT_RTP = 0.96;

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

/**
 * Cumulative bands → multiplier. EV ≈ SLOT_RTP.
 * 0.20×0.5 + 0.10×1.5 + 0.05×3 + 0.03×6 + 0.012×12 + 0.006×20 + 0.0015×50 + 0.0005×80
 */
const SLOT_WALLET_BANDS: ReadonlyArray<{ upto: number; multi: number }> = [
  { upto: 0.6, multi: 0 },
  { upto: 0.8, multi: 0.5 },
  { upto: 0.9, multi: 1.5 },
  { upto: 0.95, multi: 3 },
  { upto: 0.98, multi: 6 },
  { upto: 0.992, multi: 12 },
  { upto: 0.998, multi: 20 },
  { upto: 0.9995, multi: 50 },
  { upto: 1, multi: 80 },
];

export function slotWalletMultiplier(roll: number): number {
  const t = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0;
  for (const band of SLOT_WALLET_BANDS) {
    if (t < band.upto) return band.multi;
  }
  return SLOT_WALLET_BANDS[SLOT_WALLET_BANDS.length - 1]!.multi;
}

export function slotWalletPayout(stake: number, multi: number): number {
  if (!(stake > 0) || !(multi > 0)) return 0;
  return Math.round(stake * multi);
}
