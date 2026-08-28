import { create } from "zustand";
import { shortId } from "../lib/format";
import { randomBotName } from "../data/botNames";
import { playCurrency, type PlayCurrency } from "../lib/playWallet";

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
  { id: "unlimited", label: "Unlimited", min: 50_000, max: Number.POSITIVE_INFINITY, blurb: "50,000+ WL" },
] as const;

export type JackpotPotId = (typeof JACKPOT_POTS)[number]["id"];

export function potIsUnbounded(id: JackpotPotId): boolean {
  const def = JACKPOT_POTS.find((p) => p.id === id);
  return def != null && !Number.isFinite(def.max);
}

export function potRangeLabel(id: JackpotPotId, unit: string): string {
  if (id === "small") return `5–1,000 ${unit}`;
  if (id === "medium") return `1,000–10,000 ${unit}`;
  if (id === "large") return `10,000–50,000 ${unit}`;
  return `50,000+ ${unit}`;
}

export function clampJackpotBet(amount: number, potId: JackpotPotId): number {
  const def = JACKPOT_POTS.find((p) => p.id === potId);
  if (!def) return 0;
  const n = Math.round(amount);
  if (!Number.isFinite(n) || n < def.min) return def.min;
  if (Number.isFinite(def.max) && n > def.max) return def.max;
  return n;
}

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

type PotTable = Record<JackpotPotId, JackpotPotState>;

interface JackpotStore {
  tables: Record<PlayCurrency, PotTable>;
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
  if (jackpotPlayerCount(pot.entries) < 2) return { ...pot, countdownEndsAt: null };
  if (pot.countdownEndsAt != null) return pot;
  return { ...pot, countdownEndsAt: Date.now() + JACKPOT_COUNTDOWN_MS };
}

function emptyTable(): PotTable {
  return {
    small: emptyPot(),
    medium: emptyPot(),
    large: emptyPot(),
    unlimited: emptyPot(),
  };
}

function patchPot(
  tables: Record<PlayCurrency, PotTable>,
  ledger: PlayCurrency,
  potId: JackpotPotId,
  next: JackpotPotState,
): Record<PlayCurrency, PotTable> {
  return {
    ...tables,
    [ledger]: { ...tables[ledger], [potId]: next },
  };
}

export function potTotal(entries: JackpotEntry[]): number {
  return entries.reduce((s, e) => s + e.amount, 0);
}

/** One player may hold this many separate tickets in a pot. */
export const YOU_TICKET_MAX = 3;

export function youEntries(entries: JackpotEntry[]): JackpotEntry[] {
  return entries.filter((e) => e.kind === "you");
}

export function youEntry(entries: JackpotEntry[]): JackpotEntry | undefined {
  return youEntries(entries)[0];
}

export function youStake(entries: JackpotEntry[]): number {
  return youEntries(entries).reduce((s, e) => s + e.amount, 0);
}

/** Distinct people in the pot — extra "You" tickets still count as one player. */
export function jackpotPlayerCount(entries: JackpotEntry[]): number {
  return new Set(entries.map((e) => (e.kind === "you" ? "you" : e.id))).size;
}

export const useJackpotStore = create<JackpotStore>((set, get) => ({
  tables: { wl: emptyTable(), shards: emptyTable() },
  join: (potId, amount) => {
    const ledger = playCurrency();
    const pot = get().tables[ledger][potId];
    if (!pot || pot.phase !== "open") return false;
    const yours = youEntries(pot.entries);
    if (yours.length >= YOU_TICKET_MAX) return false;
    if (pot.entries.length >= 10) return false;
    const def = JACKPOT_POTS.find((p) => p.id === potId)!;
    if (!Number.isFinite(amount) || amount < def.min) return false;
    if (Number.isFinite(def.max) && amount > def.max) return false;
    const entry: JackpotEntry = {
      id: shortId("jp"),
      name: "You",
      kind: "you",
      amount,
      color: yours[0]?.color ?? JACKPOT_COLORS[pot.entries.length % JACKPOT_COLORS.length],
    };
    set((s) => ({
      tables: patchPot(s.tables, ledger, potId, withCountdown({ ...pot, entries: [...pot.entries, entry] })),
    }));
    return true;
  },
  callBot: (potId) => {
    const ledger = playCurrency();
    const pot = get().tables[ledger][potId];
    if (!pot || pot.phase !== "open") return false;
    const yours = youEntries(pot.entries);
    const you = yours[yours.length - 1];
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
    set((s) => {
      const cur = s.tables[ledger][potId];
      return {
        tables: patchPot(s.tables, ledger, potId, withCountdown({ ...cur, entries: [...cur.entries, entry] })),
      };
    });
    return true;
  },
  beginSpin: (potId, winnerId) => {
    const ledger = playCurrency();
    const pot = get().tables[ledger][potId];
    if (!pot || pot.phase !== "open" || jackpotPlayerCount(pot.entries) < 2) return false;
    if (!pot.entries.some((e) => e.id === winnerId)) return false;
    set((s) => ({
      tables: patchPot(s.tables, ledger, potId, {
        ...pot,
        phase: "spinning",
        winnerId,
        spinToken: pot.spinToken + 1,
        countdownEndsAt: null,
      }),
    }));
    return true;
  },
  finishSpin: (potId) => {
    const ledger = playCurrency();
    const pot = get().tables[ledger][potId];
    if (!pot || pot.phase !== "spinning") return;
    set((s) => ({ tables: patchPot(s.tables, ledger, potId, { ...pot, phase: "finished" }) }));
  },
  resetPot: (potId) => {
    const ledger = playCurrency();
    set((s) => ({ tables: patchPot(s.tables, ledger, potId, emptyPot()) }));
  },
}));
