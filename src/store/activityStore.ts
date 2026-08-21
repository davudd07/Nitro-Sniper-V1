import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BOT_NAMES } from "../data/botNames";
import { shortId } from "../lib/format";

export const ACTIVITY_GAMES = [
  "mines",
  "blackjack",
  "cases",
  "battles",
  "jackpot",
  "coinflip",
  "keno",
] as const;

export type ActivityGame = (typeof ACTIVITY_GAMES)[number];

export const ACTIVITY_GAME_LABELS: Record<ActivityGame, string> = {
  mines: "Mines",
  blackjack: "Blackjack",
  cases: "Cases",
  battles: "Case Battles",
  jackpot: "Jackpot",
  coinflip: "Coin Flip",
  keno: "Keno",
};

export interface PlayRecord {
  id: string;
  at: number;
  name: string;
  game: ActivityGame;
  wagered: number;
  won: number;
}

const MAX_PLAYS = 400;

interface ActivityState {
  plays: PlayRecord[];
  logPlay: (entry: Omit<PlayRecord, "id" | "at"> & { id?: string; at?: number }) => void;
  playsFor: (name: string, game?: ActivityGame | "all") => PlayRecord[];
  totalsFor: (name: string) => { wagered: number; won: number; profit: number; rounds: number };
}

function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number) {
  let s = seed || 1;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedBotPlays(): PlayRecord[] {
  const now = Date.now();
  const plays: PlayRecord[] = [];
  for (const name of BOT_NAMES) {
    const rnd = mulberry(hashName(name) ^ 0x51eed);
    const count = 8 + Math.floor(rnd() * 8);
    for (let i = 0; i < count; i++) {
      const game = ACTIVITY_GAMES[Math.floor(rnd() * ACTIVITY_GAMES.length)]!;
      const wagered = Math.round(20 + rnd() * 1800);
      const win = rnd() > 0.52;
      const won = win ? Math.round(wagered * (0.4 + rnd() * 2.2)) : 0;
      plays.push({
        id: `seed_${name}_${i}`,
        at: now - Math.round((i + 1) * (8 + rnd() * 40) * 60_000),
        name,
        game,
        wagered,
        won,
      });
    }
  }
  return plays.sort((a, b) => b.at - a.at).slice(0, MAX_PLAYS);
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      plays: seedBotPlays(),
      logPlay: (entry) => {
        if (entry.wagered <= 0 && entry.won <= 0) return;
        const rec: PlayRecord = {
          id: entry.id || shortId("play"),
          at: entry.at ?? Date.now(),
          name: entry.name,
          game: entry.game,
          wagered: entry.wagered,
          won: entry.won,
        };
        set((s) => ({ plays: [rec, ...s.plays].slice(0, MAX_PLAYS) }));
      },
      playsFor: (name, game = "all") => {
        const q = name.trim().toLowerCase();
        return get().plays.filter((p) => {
          if (p.name.toLowerCase() !== q) return false;
          if (game && game !== "all" && p.game !== game) return false;
          return true;
        });
      },
      totalsFor: (name) => {
        const rows = get().playsFor(name, "all");
        const wagered = rows.reduce((s, p) => s + p.wagered, 0);
        const won = rows.reduce((s, p) => s + p.won, 0);
        return { wagered, won, profit: won - wagered, rounds: rows.length };
      },
    }),
    {
      name: "prism-vault-activity",
      merge: (persisted, current) => {
        const p = persisted as { plays?: PlayRecord[] } | undefined;
        if (p?.plays && p.plays.length > 0) return { ...current, ...p };
        return current;
      },
    },
  ),
);

export function logPlay(entry: Omit<PlayRecord, "id" | "at"> & { id?: string; at?: number }) {
  useActivityStore.getState().logPlay(entry);
}
