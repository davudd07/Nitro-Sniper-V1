export type LobbyGame = {
  id: string;
  name: string;
  image: string;
  to?: string;
  comingSoon?: boolean;
  isNew?: boolean;
  subtitle: string;
};

export const LOBBY_GAMES: LobbyGame[] = [
  { id: "mines", name: "Mines", image: "/lobby/mines.webp", to: "/mines", subtitle: "Prism Vault Originals" },
  { id: "blackjack", name: "Blackjack", image: "/lobby/blackjack.webp", to: "/blackjack", subtitle: "Prism Vault Originals" },
  { id: "cases", name: "Cases", image: "/lobby/cases.webp", to: "/cases", subtitle: "Prism Vault Originals" },
  { id: "battles", name: "Case Battles", image: "/lobby/battles.webp", to: "/battles", subtitle: "Prism Vault Originals" },
  { id: "jackpot", name: "Jackpot", image: "/lobby/jackpot.webp", to: "/jackpot", subtitle: "Prism Vault Originals" },
  { id: "coinflip", name: "Coin Flip", image: "/lobby/coinflip.webp", to: "/coinflip", isNew: true, subtitle: "Prism Vault Originals" },
  { id: "keno", name: "Keno", image: "/lobby/keno.webp", comingSoon: true, isNew: true, subtitle: "Prism Vault Originals" },
  { id: "plinko", name: "Plinko", image: "/lobby/plinko.webp", comingSoon: true, subtitle: "Coming soon" },
  { id: "dice", name: "Dice", image: "/lobby/dice.webp", comingSoon: true, subtitle: "Coming soon" },
  { id: "roulette", name: "Roulette", image: "/lobby/roulette.webp", comingSoon: true, subtitle: "Coming soon" },
  { id: "baccarat", name: "Baccarat", image: "/lobby/baccarat.webp", comingSoon: true, subtitle: "Coming soon" },
];

export const ORIGINAL_IDS = ["mines", "blackjack", "cases", "battles", "jackpot", "coinflip", "keno"];
export const POPULAR_IDS = ["battles", "coinflip", "blackjack", "jackpot", "mines", "cases"];
export const SOON_IDS = ["keno", "plinko", "dice", "roulette", "baccarat"];

export const PATH_TO_GAME: Record<string, string> = {
  "/mines": "mines",
  "/blackjack": "blackjack",
  "/cases": "cases",
  "/battles": "battles",
  "/jackpot": "jackpot",
  "/coinflip": "coinflip",
};

export function gameById(id: string): LobbyGame | undefined {
  return LOBBY_GAMES.find((g) => g.id === id);
}
