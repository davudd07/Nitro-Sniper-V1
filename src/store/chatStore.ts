import { create } from "zustand";
import { shortId } from "../lib/format";

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  color: string;
  you?: boolean;
  at: number;
}

const SEED: Omit<ChatMessage, "id" | "at">[] = [
  { name: "VaultBot", text: "Play-money only — Shards and Fun Coins have no cash value.", color: "#22d3ee" },
  { name: "PixelPete", text: "Just cashed a mines board. Demo stake, still sweaty.", color: "#fbbf24" },
  { name: "CaseCat", text: "Anyone spinning Vault Cache?", color: "#e879f9" },
  { name: "ReelRex", text: "Jackpot large pot is 100–10k now. Filling up.", color: "#34d399" },
];

interface ChatState {
  messages: ChatMessage[];
  send: (text: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: SEED.map((m, i) => ({
    ...m,
    id: `seed_${i}`,
    at: Date.now() - (SEED.length - i) * 45000,
  })),
  send: (text) => {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: shortId("chat"),
          name: "You",
          text: trimmed,
          color: "#d946ef",
          you: true,
          at: Date.now(),
        },
      ].slice(-80),
    }));
  },
}));
