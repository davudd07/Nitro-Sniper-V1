import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shortId } from "../lib/format";
import type { PlayCurrency } from "../lib/playWallet";

export const LEDGER_KINDS = [
  "wager",
  "payout",
  "credit",
  "debit",
  "tip_sent",
  "tip_received",
  "tip_unlocked",
  "rakeback",
  "grant",
  "topup",
  "prize",
  "affiliate",
  "rain",
] as const;

export type LedgerKind = (typeof LEDGER_KINDS)[number];

export const LEDGER_KIND_LABEL: Record<LedgerKind, string> = {
  wager: "Wager",
  payout: "Game payout",
  credit: "Credit",
  debit: "Debit",
  tip_sent: "Tip sent",
  tip_received: "Tip received",
  tip_unlocked: "Tip unlocked",
  rakeback: "Rakeback",
  grant: "Warden grant",
  topup: "Auto top-up",
  prize: "Prize",
  affiliate: "Affiliate",
  rain: "Chat rain",
};

export interface BalanceLedgerEntry {
  id: string;
  at: number;
  name: string;
  kind: LedgerKind;
  amount: number;
  currency: PlayCurrency;
  balanceAfter?: number;
  note?: string;
}

const MAX_ENTRIES = 800;

interface BalanceLedgerState {
  entries: BalanceLedgerEntry[];
  push: (entry: Omit<BalanceLedgerEntry, "id" | "at"> & { id?: string; at?: number }) => void;
  entriesFor: (name: string) => BalanceLedgerEntry[];
}

function samePlayer(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (x === y) return true;
  if ((x === "you" || x === "local") && (y === "you" || y === "local")) return true;
  return false;
}

export const useBalanceLedgerStore = create<BalanceLedgerState>()(
  persist(
    (set, get) => ({
      entries: [],
      push: (entry) => {
        if (!entry.name || !Number.isFinite(entry.amount) || entry.amount === 0) return;
        const rec: BalanceLedgerEntry = {
          id: entry.id || shortId("bal"),
          at: entry.at ?? Date.now(),
          name: entry.name,
          kind: entry.kind,
          amount: entry.amount,
          currency: entry.currency ?? "wl",
          balanceAfter: entry.balanceAfter,
          note: entry.note,
        };
        set((s) => ({ entries: [rec, ...s.entries].slice(0, MAX_ENTRIES) }));
      },
      entriesFor: (name) => get().entries.filter((row) => samePlayer(row.name, name)),
    }),
    { name: "prism-vault-balance-ledger" },
  ),
);

export function appendBalanceLedger(entry: Omit<BalanceLedgerEntry, "id" | "at"> & { id?: string; at?: number }): void {
  useBalanceLedgerStore.getState().push(entry);
}
