import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shortId } from "../lib/format";
import { BOT_NAMES } from "../data/botNames";

export const CHAT_RAIN_MS = 30 * 60 * 1000;
export const CHAT_RAIN_PRIZE = 25;
export const CHAT_RAIN_WINNERS = 5;

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  color: string;
  you?: boolean;
  rain?: boolean;
  at: number;
}

const SEED: Omit<ChatMessage, "id" | "at">[] = [
  { name: "VaultBot", text: "Play-money only. Set bet to 0 for a demo round — anything above 0 spends Shards.", color: "#22d3ee" },
  { name: "PixelPete", text: "Chat rain drops every 30 minutes. Five people, 25 SH each.", color: "#fbbf24" },
  { name: "CaseCat", text: "Anyone spinning Vault Cache?", color: "#e879f9" },
  { name: "ReelRex", text: "Rakeback lands as Shards on the Rewards tab.", color: "#34d399" },
];

const RAIN_POOL = ["You", ...BOT_NAMES];

interface ChatState {
  messages: ChatMessage[];
  nextRainAt: number;
  lastRainWinners: string[];
  send: (text: string) => void;
  post: (msg: Omit<ChatMessage, "id" | "at">) => void;
  maybeRain: (now: number) => { winners: string[]; youWon: boolean } | null;
}

function pickWinners(): string[] {
  const pool = [...RAIN_POOL];
  const winners: string[] = [];
  while (winners.length < CHAT_RAIN_WINNERS && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(i, 1)[0]!);
  }
  return winners;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: SEED.map((m, i) => ({
        ...m,
        id: `seed_${i}`,
        at: Date.now() - (SEED.length - i) * 45000,
      })),
      nextRainAt: Date.now() + CHAT_RAIN_MS,
      lastRainWinners: [],
      send: (text) => {
        const trimmed = text.trim().slice(0, 200);
        if (!trimmed) return;
        get().post({ name: "You", text: trimmed, color: "#d946ef", you: true });
      },
      post: (msg) => {
        set((s) => ({
          messages: [
            ...s.messages,
            { ...msg, id: shortId("chat"), at: Date.now() },
          ].slice(-80),
        }));
      },
      maybeRain: (now) => {
        let { nextRainAt } = get();
        if (!nextRainAt) {
          nextRainAt = now + CHAT_RAIN_MS;
          set({ nextRainAt });
          return null;
        }
        if (now < nextRainAt) return null;
        const winners = pickWinners();
        const youWon = winners.includes("You");
        get().post({
          name: "VaultBot",
          color: "#facc15",
          rain: true,
          text: `Chat rain! ${CHAT_RAIN_WINNERS} players win ${CHAT_RAIN_PRIZE} SH each: ${winners.join(", ")}.`,
        });
        set({
          nextRainAt: now + CHAT_RAIN_MS,
          lastRainWinners: winners,
        });
        return { winners, youWon };
      },
    }),
    { name: "prism-vault-chat" },
  ),
);
