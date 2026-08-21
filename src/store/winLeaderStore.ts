import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ACTIVITY_GAMES, type ActivityGame } from "./activityStore";
import { useAuthStore } from "./authStore";
import { useDemoProfileStore } from "./demoProfileStore";

export type WinLeaderGame = ActivityGame;

export interface WinLeaderRecord {
  name: string;
  multiplier: number;
  at: number;
  /** Finished battle id so the lobby trophy can open replay. */
  battleId?: string;
}

interface WinLeaderState {
  records: Partial<Record<WinLeaderGame, WinLeaderRecord>>;
  consider: (
    game: WinLeaderGame,
    input: { name: string; multiplier: number; isYou?: boolean; battleId?: string },
  ) => boolean;
  leaderFor: (game: WinLeaderGame) => WinLeaderRecord | undefined;
}

const SEED_AT = 1_704_067_200_000;

function seedRecords(): Partial<Record<WinLeaderGame, WinLeaderRecord>> {
  return {
    mines: { name: "PixelFox", multiplier: 12.48, at: SEED_AT },
    blackjack: { name: "NovaByte", multiplier: 2, at: SEED_AT },
    cases: { name: "VaultRaider", multiplier: 18.4, at: SEED_AT },
    battles: { name: "LuckyComet", multiplier: 4.82, at: SEED_AT, battleId: "hist_whale" },
    jackpot: { name: "EmberDrift", multiplier: 6.12, at: SEED_AT },
    coinflip: { name: "GlassWolf", multiplier: 30.72, at: SEED_AT },
    keno: { name: "NeonWisp", multiplier: 70, at: SEED_AT },
  };
}

export function localWinName(): string {
  const session = useAuthStore.getState().session;
  if (session) return session;
  const demo = useDemoProfileStore.getState().displayName?.trim();
  return demo || "You";
}

export function resolveWinName(name: string, isYou = false): string {
  if (isYou || name === "You" || name === "you") return localWinName();
  const trimmed = name.trim();
  return trimmed || "Unknown";
}

export function formatWinMulti(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return `${Math.round(n)}×`;
  if (n >= 10) return `${n.toFixed(1)}×`;
  return `${n.toFixed(2)}×`;
}

export function winLeaderGameFromPath(pathname: string): WinLeaderGame | null {
  if (pathname === "/mines" || pathname.startsWith("/mines/")) return "mines";
  if (pathname === "/blackjack" || pathname.startsWith("/blackjack/")) return "blackjack";
  if (pathname === "/jackpot" || pathname.startsWith("/jackpot/")) return "jackpot";
  if (pathname === "/coinflip" || pathname.startsWith("/coinflip/")) return "coinflip";
  if (pathname === "/keno" || pathname.startsWith("/keno/")) return "keno";
  if (pathname.startsWith("/cases")) return "cases";
  if (pathname.startsWith("/battles")) return "battles";
  return null;
}

export function isBattlesLobbyPath(pathname: string): boolean {
  return pathname === "/battles" || pathname === "/battles/";
}

function isWinLeaderGame(value: string): value is WinLeaderGame {
  return (ACTIVITY_GAMES as readonly string[]).includes(value);
}

export const useWinLeaderStore = create<WinLeaderState>()(
  persist(
    (set, get) => ({
      records: seedRecords(),
      consider: (game, input) => {
        const multiplier = input.multiplier;
        if (!Number.isFinite(multiplier) || multiplier <= 1) return false;
        const name = resolveWinName(input.name, input.isYou);
        if (!name) return false;
        const current = get().records[game];
        if (current && current.multiplier >= multiplier) return false;
        const next: WinLeaderRecord = {
          name,
          multiplier,
          at: Date.now(),
          ...(input.battleId ? { battleId: input.battleId } : {}),
        };
        set((s) => ({ records: { ...s.records, [game]: next } }));
        return true;
      },
      leaderFor: (game) => get().records[game],
    }),
    {
      name: "prism-vault-win-leaders",
      merge: (persisted, current) => {
        const p = persisted as { records?: Partial<Record<string, WinLeaderRecord>> } | undefined;
        const incoming = p?.records ?? {};
        const records: Partial<Record<WinLeaderGame, WinLeaderRecord>> = { ...current.records };
        for (const [key, rec] of Object.entries(incoming)) {
          if (!isWinLeaderGame(key) || !rec) continue;
          if (typeof rec.name !== "string" || !Number.isFinite(rec.multiplier)) continue;
          records[key] = rec;
        }
        return { ...current, records };
      },
    },
  ),
);

export function considerWinLeader(
  game: WinLeaderGame,
  input: { name: string; multiplier: number; isYou?: boolean; battleId?: string },
): boolean {
  return useWinLeaderStore.getState().consider(game, input);
}

export function considerBattleLeaders(opts: {
  battleId: string;
  costPerPlayer: number;
  winners: { name: string; kind?: string; share: number }[];
}): void {
  const cost = opts.costPerPlayer;
  if (!(cost > 0) || !opts.battleId) return;
  for (const w of opts.winners) {
    considerWinLeader("battles", {
      name: w.name,
      isYou: w.kind === "you",
      multiplier: w.share / cost,
      battleId: opts.battleId,
    });
  }
}
