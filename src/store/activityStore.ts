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
  "upgrader",
  "dice",
  "keno",
  "crash",
  "road",
] as const;

export type ActivityGame = (typeof ACTIVITY_GAMES)[number];

export const ACTIVITY_GAME_LABELS: Record<ActivityGame, string> = {
  mines: "Mines",
  blackjack: "Blackjack",
  cases: "Cases",
  battles: "Case Battles",
  jackpot: "Jackpot",
  coinflip: "Coin Flip",
  upgrader: "Upgrader",
  dice: "Dice",
  keno: "Keno",
  crash: "Crash",
  road: "Cross the Road",
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
  injectLivePlays: () => void;
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

function fakePlay(rnd: () => number, at: number, name: string): PlayRecord {
  const game = ACTIVITY_GAMES[Math.floor(rnd() * ACTIVITY_GAMES.length)]!;
  const roll = rnd();
  let wagered: number;
  if (roll > 0.94) wagered = Math.round(100_000 + rnd() * 900_000);
  else if (roll > 0.8) wagered = Math.round(2_000 + rnd() * 40_000);
  else wagered = Math.round(20 + rnd() * 1800);
  const lucky = rnd() > 0.88;
  const win = lucky || rnd() > 0.48;
  const won = win ? Math.round(wagered * (lucky ? 10 + rnd() * 70 : 0.4 + rnd() * 2.4)) : 0;
  return {
    id: shortId("live"),
    at,
    name,
    game,
    wagered,
    won,
  };
}

function seedBotPlays(): PlayRecord[] {
  const now = Date.now();
  const plays: PlayRecord[] = [];
  for (const name of BOT_NAMES) {
    const rnd = mulberry(hashName(name) ^ 0x51eed);
    const count = 8 + Math.floor(rnd() * 8);
    for (let i = 0; i < count; i++) {
      plays.push(fakePlay(rnd, now - Math.round((i + 1) * (4 + rnd() * 50) * 1_000), name));
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
      injectLivePlays: () => {
        const rnd = mulberry((Date.now() ^ (get().plays.length * 7919)) >>> 0);
        const n = 2 + Math.floor(rnd() * 3);
        const now = Date.now();
        const extra: PlayRecord[] = [];
        for (let i = 0; i < n; i++) {
          const name = BOT_NAMES[Math.floor(rnd() * BOT_NAMES.length)]!;
          extra.push(fakePlay(rnd, now - i * 400, name));
        }
        set((s) => ({ plays: [...extra, ...s.plays].slice(0, MAX_PLAYS) }));
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
      name: "prism-vault-activity-v2",
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
