import { create } from "zustand";
import { shortId } from "../lib/format";
import { PLAYER_COLORS } from "../data/battleModes";
import { randomBotName } from "../data/botNames";

export const JACKPOT_HOUSE_EDGE = 0.09;

export const JACKPOT_POTS = [
  { id: "small", label: "Small", min: 5, max: 100, blurb: "5–100 SH" },
  { id: "large", label: "Large", min: 100, max: 1000, blurb: "100–1,000 SH" },
  { id: "unlimited", label: "Unlimited", min: 1000, max: 100_000, blurb: "1,000–100,000 SH" },
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
      color: PLAYER_COLORS[pot.entries.length % PLAYER_COLORS.length],
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
      color: PLAYER_COLORS[pot.entries.length % PLAYER_COLORS.length],
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
