export type LobbyGame = {
  id: string;
  name: string;
  image: string;
  to?: string;
  comingSoon?: boolean;
  isNew?: boolean;
  subtitle: string;
  /** Full painted tile with baked-in title — do not overlay a second name. */
  painted?: boolean;
};

export const LOBBY_GAMES: LobbyGame[] = [
  { id: "battles", name: "Case Battles", image: "/lobby/battles.png", to: "/battles", painted: true, subtitle: "SeedBET Originals" },
  { id: "cases", name: "Cases", image: "/lobby/cases.png", to: "/cases", painted: true, subtitle: "SeedBET Originals" },
  { id: "mines", name: "Mines", image: "/lobby/mines.png", to: "/mines", painted: true, subtitle: "SeedBET Originals" },
  { id: "jackpot", name: "Jackpot", image: "/lobby/jackpot.png", to: "/jackpot", painted: true, subtitle: "SeedBET Originals" },
  { id: "road", name: "Cross the Road", image: "/lobby/road.png", to: "/road", painted: true, isNew: true, subtitle: "SeedBET Originals" },
  { id: "dice", name: "Dice", image: "/lobby/dice.png", to: "/dice", painted: true, isNew: true, subtitle: "SeedBET Originals" },
  { id: "blackjack", name: "Blackjack", image: "/lobby/blackjack.png", to: "/blackjack", painted: true, subtitle: "SeedBET Originals" },
  { id: "coinflip", name: "Coin Flip", image: "/lobby/coinflip.png", to: "/coinflip", painted: true, isNew: true, subtitle: "SeedBET Originals" },
  { id: "upgrader", name: "Upgrader", image: "/lobby/upgrader.png", to: "/upgrader", painted: true, isNew: true, subtitle: "SeedBET Originals" },
  { id: "crash", name: "Crash", image: "/lobby/crash.png", to: "/crash", painted: true, isNew: true, subtitle: "SeedBET Originals" },
  { id: "keno", name: "Keno", image: "/lobby/keno.png", to: "/keno", painted: true, isNew: true, subtitle: "SeedBET Originals" },
  { id: "plinko", name: "Plinko", image: "/lobby/plinko.png", comingSoon: true, painted: true, subtitle: "Coming soon" },
  { id: "roulette", name: "Roulette", image: "/lobby/roulette.png", comingSoon: true, painted: true, subtitle: "Coming soon" },
  { id: "baccarat", name: "Baccarat", image: "/lobby/baccarat.png", comingSoon: true, painted: true, subtitle: "Coming soon" },
];

/** Sprite-sheet tiles shown as the homepage grid (sheet order: 4 + 3). */
export const PAINTED_IDS = ["battles", "cases", "mines", "jackpot", "road", "dice", "blackjack", "coinflip", "upgrader", "crash", "keno"];

export const ORIGINAL_IDS = ["mines", "blackjack", "cases", "battles", "jackpot", "coinflip", "upgrader", "dice", "crash", "road", "keno"];
export const POPULAR_IDS = ["crash", "road", "battles", "dice", "upgrader", "coinflip", "blackjack", "jackpot", "mines", "cases"];
export const MORE_PLAYABLE_IDS = ["coinflip", "upgrader", "crash"];
export const SOON_IDS = ["plinko", "roulette", "baccarat"];

export const PATH_TO_GAME: Record<string, string> = {
  "/mines": "mines",
  "/blackjack": "blackjack",
  "/cases": "cases",
  "/battles": "battles",
  "/jackpot": "jackpot",
  "/coinflip": "coinflip",
  "/upgrader": "upgrader",
  "/dice": "dice",
  "/crash": "crash",
  "/road": "road",
  "/keno": "keno",
};

export function gameById(id: string): LobbyGame | undefined {
  return LOBBY_GAMES.find((g) => g.id === id);
}
