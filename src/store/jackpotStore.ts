import { create } from "zustand";
import { shortId } from "../lib/format";
import { randomBotName } from "../data/botNames";

/** Same hues as battle seats, slightly quieter — jackpot table only. */
export const JACKPOT_COLORS = [
  "#e14b66",
  "#4b7ee8",
  "#2db862",
  "#e8a01c",
  "#9b5ce8",
  "#1aabb8",
  "#e0569a",
  "#7cbe24",
  "#ea7a2a",
  "#1cafa0",
];

export const JACKPOT_HOUSE_EDGE = 0.09;

export const JACKPOT_POTS = [
  { id: "small", label: "Small", min: 5, max: 1000, blurb: "5–1,000 WL" },
  { id: "medium", label: "Medium", min: 1000, max: 10_000, blurb: "1,000–10,000 WL" },
  { id: "large", label: "Large", min: 10_000, max: 50_000, blurb: "10,000–50,000 WL" },
  { id: "unlimited", label: "Unlimited", min: 50_000, max: 1_000_000, blurb: "50,000–1,000,000 WL" },
] as const;

export type JackpotPotId = (typeof JACKPOT_POTS)[number]["id"];

export interface JackpotEntry {
  id: string;
  name: string;
  kind: "you" | "bot";
  amount: number;
  color: string;
}

export type JackpotPhase = "open" | "spinning" | "finished";

export const JACKPOT_COUNTDOWN_MS = 45_000;
export const JACKPOT_MAX_BOTS = 5;

interface JackpotPotState {
  entries: JackpotEntry[];
  phase: JackpotPhase;
  winnerId: string | null;
  spinToken: number;
  countdownEndsAt: number | null;
}

interface JackpotStore {
  pots: Record<JackpotPotId, JackpotPotState>;
  join: (potId: JackpotPotId, amount: number) => boolean;
  callBot: (potId: JackpotPotId) => boolean;
  beginSpin: (potId: JackpotPotId, winnerId: string) => boolean;
  finishSpin: (potId: JackpotPotId) => void;
  resetPot: (potId: JackpotPotId) => void;
}

function emptyPot(): JackpotPotState {
  return { entries: [], phase: "open", winnerId: null, spinToken: 0, countdownEndsAt: null };
}

function withCountdown(pot: JackpotPotState): JackpotPotState {
  if (pot.phase !== "open") return { ...pot, countdownEndsAt: null };
  if (pot.entries.length < 2) return { ...pot, countdownEndsAt: null };
  if (pot.countdownEndsAt != null) return pot;
  return { ...pot, countdownEndsAt: Date.now() + JACKPOT_COUNTDOWN_MS };
}

export function potTotal(entries: JackpotEntry[]): number {
  return entries.reduce((s, e) => s + e.amount, 0);
}

export function youEntry(entries: JackpotEntry[]): JackpotEntry | undefined {
  return entries.find((e) => e.kind === "you");
}

export const useJackpotStore = create<JackpotStore>((set, get) => ({
  pots: {
    small: emptyPot(),
    medium: emptyPot(),
    large: emptyPot(),
    unlimited: emptyPot(),
  },
  join: (potId, amount) => {
    const pot = get().pots[potId];
    if (!pot || pot.phase !== "open") return false;
    if (youEntry(pot.entries)) return false;
    const def = JACKPOT_POTS.find((p) => p.id === potId)!;
    if (amount < def.min || amount > def.max) return false;
    const entry: JackpotEntry = {
      id: shortId("jp"),
      name: "You",
      kind: "you",
      amount,
      color: JACKPOT_COLORS[pot.entries.length % JACKPOT_COLORS.length],
    };
    set((s) => ({
      pots: { ...s.pots, [potId]: withCountdown({ ...pot, entries: [...pot.entries, entry] }) },
    }));
    return true;
  },
  callBot: (potId) => {
    const pot = get().pots[potId];
    if (!pot || pot.phase !== "open") return false;
    const you = youEntry(pot.entries);
    if (!you) return false;
    if (pot.entries.length >= 10) return false;
    const bots = pot.entries.filter((e) => e.kind === "bot").length;
    if (bots >= JACKPOT_MAX_BOTS) return false;
    const used = new Set(pot.entries.map((e) => e.name));
    const entry: JackpotEntry = {
      id: shortId("jp"),
      name: randomBotName(used),
      kind: "bot",
      amount: you.amount,
      color: JACKPOT_COLORS[pot.entries.length % JACKPOT_COLORS.length],
    };
    set((s) => ({
      pots: {
        ...s.pots,
        [potId]: withCountdown({ ...s.pots[potId], entries: [...s.pots[potId].entries, entry] }),
      },
    }));
    return true;
  },
  beginSpin: (potId, winnerId) => {
    const pot = get().pots[potId];
    if (!pot || pot.phase !== "open" || pot.entries.length < 2) return false;
    if (!pot.entries.some((e) => e.id === winnerId)) return false;
    set((s) => ({
      pots: {
        ...s.pots,
        [potId]: { ...pot, phase: "spinning", winnerId, spinToken: pot.spinToken + 1, countdownEndsAt: null },
      },
    }));
    return true;
  },
  finishSpin: (potId) => {
    const pot = get().pots[potId];
    if (!pot || pot.phase !== "spinning") return;
    set((s) => ({ pots: { ...s.pots, [potId]: { ...pot, phase: "finished" } } }));
  },
  resetPot: (potId) => {
    set((s) => ({ pots: { ...s.pots, [potId]: emptyPot() } }));
  },
}));
