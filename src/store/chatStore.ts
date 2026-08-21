import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shortId } from "../lib/format";
import { BOT_NAMES } from "../data/botNames";

export const CHAT_RAIN_MS = 30 * 60 * 1000;
export const CHAT_RAIN_JOIN_MS = 60_000;
export const CHAT_RAIN_BASE_POT = 25;
export const CHAT_RAIN_WINNERS = 5;
const CHAT_RAIN_JOIN_CAP = 12;

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  color: string;
  you?: boolean;
  rain?: boolean;
  tip?: boolean;
  at: number;
}

const SEED: Omit<ChatMessage, "id" | "at">[] = [
  { name: "VaultBot", text: "Play-money only. Set bet to 0 for a demo round — anything above 0 spends Shards.", color: "#22d3ee" },
  { name: "PixelPete", text: "Chat rain starts at 25 SH. Tip the pot — and tip players from their message. They have to wager the tip to unlock it.", color: "#fbbf24" },
  { name: "CaseCat", text: "Anyone spinning Vault Cache?", color: "#e879f9" },
  { name: "ReelRex", text: "Rakeback lands as Shards on the Rewards tab.", color: "#34d399" },
  { name: "NovaByte", text: "Hit a blackjack streak then dumped it on mines. Classic.", color: "#f472b6" },
  { name: "ShardHunter", text: "Need a refund on that jackpot spin? Kidding. House edge is printed.", color: "#38bdf8" },
  { name: "LuckyComet", text: "Who else is hopping into 2v2 battles tonight?", color: "#a3e635" },
];

interface ChatState {
  messages: ChatMessage[];
  nextRainAt: number;
  lastRainWinners: string[];
  joinedRain: string[];
  rainPot: number;
  send: (text: string) => void;
  post: (msg: Omit<ChatMessage, "id" | "at">) => void;
  joinRain: () => boolean;
  tipRain: (amount: number) => boolean;
  maybeFillJoins: (now: number) => void;
  maybeRain: (now: number) => { winners: string[]; youWon: boolean; prizeEach: number; pot: number } | null;
}

function inJoinWindow(now: number, nextRainAt: number): boolean {
  const remain = nextRainAt - now;
  return remain > 0 && remain <= CHAT_RAIN_JOIN_MS;
}

function pickWinnersFrom(pool: string[]): string[] {
  const remaining = [...pool];
  const winners: string[] = [];
  const n = Math.min(CHAT_RAIN_WINNERS, remaining.length);
  while (winners.length < n && remaining.length) {
    const i = Math.floor(Math.random() * remaining.length);
    winners.push(remaining.splice(i, 1)[0]!);
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
      joinedRain: [],
      rainPot: CHAT_RAIN_BASE_POT,
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
      joinRain: () => {
        const { nextRainAt, joinedRain } = get();
        const joined = joinedRain ?? [];
        if (!inJoinWindow(Date.now(), nextRainAt)) return false;
        if (joined.includes("You")) return false;
        set({ joinedRain: [...joined, "You"] });
        return true;
      },
      tipRain: (amount) => {
        const n = Math.floor(amount);
        if (n <= 0) return false;
        set((s) => ({ rainPot: (s.rainPot ?? CHAT_RAIN_BASE_POT) + n }));
        get().post({
          name: "You",
          you: true,
          tip: true,
          color: "#d946ef",
          text: `Tipped the chat rain ${n} SH.`,
        });
        return true;
      },
      maybeFillJoins: (now) => {
        const { nextRainAt, joinedRain } = get();
        if (!nextRainAt || !inJoinWindow(now, nextRainAt)) return;
        const joined = joinedRain ?? [];
        if (joined.length >= CHAT_RAIN_JOIN_CAP) return;

        const remain = nextRainAt - now;
        const elapsed = CHAT_RAIN_JOIN_MS - remain;
        // Trickle toward ~12 names over the 60s window; extra random join keeps it lively.
        const desired = Math.min(CHAT_RAIN_JOIN_CAP, 2 + Math.floor(elapsed / 5000));
        if (joined.length >= desired && Math.random() > 0.18) return;

        const used = new Set(joined);
        const candidates = BOT_NAMES.filter((n) => !used.has(n));
        if (!candidates.length) return;
        const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
        set({ joinedRain: [...joined, pick] });
      },
      maybeRain: (now) => {
        let { nextRainAt } = get();
        if (!nextRainAt) {
          nextRainAt = now + CHAT_RAIN_MS;
          set({ nextRainAt });
          return null;
        }
        if (now < nextRainAt) return null;

        const pool = get().joinedRain ?? [];
        const winners = pickWinnersFrom(pool);
        const youWon = winners.includes("You");
        const pot = Math.max(0, Math.round(get().rainPot ?? CHAT_RAIN_BASE_POT));
        const prizeEach = winners.length > 0 ? Math.floor(pot / winners.length) : 0;

        if (winners.length === 0) {
          get().post({
            name: "VaultBot",
            color: "#facc15",
            rain: true,
            text: "Chat rain — nobody joined this round.",
          });
        } else {
          get().post({
            name: "VaultBot",
            color: "#facc15",
            rain: true,
            text: `Chat rain! Pot ${pot} SH → ${winners.length} ${winners.length === 1 ? "winner" : "winners"} get ${prizeEach} SH each: ${winners.join(", ")}.`,
          });
        }

        set({
          nextRainAt: now + CHAT_RAIN_MS,
          lastRainWinners: winners,
          joinedRain: [],
          rainPot: CHAT_RAIN_BASE_POT,
        });
        return { winners, youWon, prizeEach, pot };
      },
    }),
    { name: "prism-vault-chat" },
  ),
);
