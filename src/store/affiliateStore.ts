import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  affiliateCodeIssue,
  affiliateCommission,
  colorForName,
  normalizeAffiliateCode,
  referralStatusAt,
  type AffiliateReferral,
} from "../lib/affiliate";
import { useAuthStore } from "./authStore";
import { useDemoProfileStore } from "./demoProfileStore";
import { useEconomyStore } from "./economyStore";
import { isLocalOwner } from "../lib/owner";

export interface AffiliateLedger {
  referrals: AffiliateReferral[];
  claimedWl: number;
}

export type ApplyAffiliateCodeResult = "ok" | "invalid" | "unknown" | "already";

interface AffiliateState {
  attributedCode: string | null;
  ledgers: Record<string, AffiliateLedger>;
  /** Locked custom codes keyed by lowercase account username. */
  myCodes: Record<string, string>;
  /** Reverse index so each code can be claimed by only one owner. */
  claimedBy: Record<string, string>;
  boardCreated: boolean;
  captureRef: (raw: string) => boolean;
  applyCode: (raw: string) => ApplyAffiliateCodeResult;
  claimCustomCode: (raw: string) => string | null;
  rebindOwner: (oldName: string, nextName: string) => void;
  noteReferredWager: (stake: number, houseEdge: number) => number;
  claim: () => number;
  createBoard: () => void;
}

const EMPTY_LEDGER: AffiliateLedger = { referrals: [], claimedWl: 0 };

export function emptyAffiliateLedger(): AffiliateLedger {
  return { referrals: [], claimedWl: 0 };
}

function migrateLedger(raw: unknown): AffiliateLedger {
  const o = (raw ?? {}) as { referrals?: AffiliateReferral[]; claimedWl?: number; claimedShards?: number };
  return {
    referrals: Array.isArray(o.referrals) ? o.referrals : [],
    claimedWl: Math.max(0, o.claimedWl ?? o.claimedShards ?? 0),
  };
}

export function currentPlayerName(): string {
  return useAuthStore.getState().session || useDemoProfileStore.getState().displayName;
}

export function currentOwnerId(): string | null {
  const session = useAuthStore.getState().session;
  if (!session) return null;
  const id = session.trim().toLowerCase();
  return id || null;
}

export function currentPlayerCode(): string {
  const id = currentOwnerId();
  if (!id) return "";
  return useAffiliateStore.getState().myCodes[id] ?? "";
}

export function ledgerFor(ledgers: Record<string, AffiliateLedger>, code: string): AffiliateLedger {
  return ledgers[code] ?? EMPTY_LEDGER;
}

export function ledgerAccrued(ledger: AffiliateLedger): number {
  return ledger.referrals.reduce((sum, row) => sum + row.commission, 0);
}

export function affiliateAvailable(ledger: AffiliateLedger): number {
  return Math.max(0, ledgerAccrued(ledger) - Math.max(0, ledger.claimedWl));
}

export function affiliateLifetime(ledger: AffiliateLedger): number {
  return ledgerAccrued(ledger);
}

function withStatus(row: AffiliateReferral): AffiliateReferral {
  return { ...row, status: referralStatusAt(row) };
}

export const useAffiliateStore = create<AffiliateState>()(
  persist(
    (set, get) => ({
      attributedCode: null,
      ledgers: {},
      myCodes: {},
      claimedBy: {},
      boardCreated: false,
      captureRef: (raw) => {
        const code = normalizeAffiliateCode(raw);
        if (!code) return false;
        if (!get().claimedBy[code]) return false;
        if (get().attributedCode) return false;
        set({ attributedCode: code });
        return true;
      },
      applyCode: (raw) => {
        const code = normalizeAffiliateCode(raw);
        if (!code || affiliateCodeIssue(raw)) return "invalid";
        if (get().attributedCode) return "already";
        if (!get().claimedBy[code]) return "unknown";
        set({ attributedCode: code });
        return "ok";
      },
      claimCustomCode: (raw) => {
        const ownerId = currentOwnerId();
        if (!ownerId) return "Sign in to pick your affiliate code.";
        const issue = affiliateCodeIssue(raw);
        if (issue) return issue;
        const code = normalizeAffiliateCode(raw);
        const mine = get().myCodes[ownerId];
        if (mine) return "Your affiliate code is already locked.";
        const owned = Object.entries(get().claimedBy).find(([, owner]) => owner === ownerId);
        if (owned) return "Your affiliate code is already locked.";
        const takenBy = get().claimedBy[code];
        if (takenBy) return "That code is already taken.";
        set((s) => ({
          myCodes: { ...s.myCodes, [ownerId]: code },
          claimedBy: { ...s.claimedBy, [code]: ownerId },
        }));
        return null;
      },
      rebindOwner: (oldName, nextName) => {
        const from = oldName.trim().toLowerCase();
        const to = nextName.trim().toLowerCase();
        if (!from || !to || from === to) return;
        set((s) => {
          const code = s.myCodes[from];
          if (!code) return s;
          const myCodes = { ...s.myCodes };
          delete myCodes[from];
          myCodes[to] = code;
          return { myCodes, claimedBy: { ...s.claimedBy, [code]: to } };
        });
      },
      noteReferredWager: (stake, houseEdge) => {
        if (!(stake > 0) || !(houseEdge > 0)) return 0;
        if (isLocalOwner()) return 0;
        const attributed = get().attributedCode;
        if (!attributed) return 0;
        if (!get().claimedBy[attributed]) return 0;
        const myCode = currentPlayerCode();
        if (myCode && attributed === myCode) return 0;
        const cut = affiliateCommission(stake, houseEdge);
        if (cut <= 0) return 0;
        const playerName = currentPlayerName();
        const playerId = playerName.trim().toLowerCase() || "player";
        const now = Date.now();
        set((s) => {
          const prev = s.ledgers[attributed] ?? emptyAffiliateLedger();
          const existing = prev.referrals.find((row) => row.id === playerId);
          const nextRow: AffiliateReferral = existing
            ? {
                ...existing,
                name: playerName,
                wagerWl: existing.wagerWl + stake,
                bets: existing.bets + 1,
                commission: existing.commission + cut,
                status: "active",
                lastBetAt: now,
              }
            : {
                id: playerId,
                name: playerName,
                color: colorForName(playerName),
                wagerWl: stake,
                bets: 1,
                commission: cut,
                status: "active",
                lastBetAt: now,
              };
          const referrals = existing
            ? prev.referrals.map((row) => (row.id === playerId ? nextRow : withStatus(row)))
            : [...prev.referrals.map(withStatus), nextRow];
          return {
            ledgers: {
              ...s.ledgers,
              [attributed]: { ...prev, referrals },
            },
          };
        });
        return cut;
      },
      claim: () => {
        const myCode = currentPlayerCode();
        if (!myCode) return 0;
        const ledger = ledgerFor(get().ledgers, myCode);
        const available = affiliateAvailable(ledger);
        if (available <= 0) return 0;
        useEconomyStore.getState().credit(available);
        void import("./balanceLedgerStore").then(({ appendBalanceLedger }) => {
          appendBalanceLedger({
            name: "You",
            kind: "affiliate",
            amount: available,
            currency: "wl",
            note: "Affiliate claim",
          });
        });
        set((s) => ({
          ledgers: {
            ...s.ledgers,
            [myCode]: { ...ledger, claimedWl: ledger.claimedWl + available },
          },
        }));
        return available;
      },
      createBoard: () => set({ boardCreated: true }),
    }),
    {
      name: "prism-vault-affiliate-v3",
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AffiliateState> & {
          ledgers?: Record<string, unknown>;
        };
        const ledgers: Record<string, AffiliateLedger> = {};
        for (const [k, v] of Object.entries(p.ledgers ?? {})) {
          ledgers[k] = migrateLedger(v);
        }
        return {
          ...current,
          ...p,
          ledgers,
          myCodes: p.myCodes ?? {},
          claimedBy: p.claimedBy ?? {},
        };
      },
    },
  ),
);

export function rebindAffiliateOwner(oldName: string, nextName: string): void {
  useAffiliateStore.getState().rebindOwner(oldName, nextName);
}

export function awardAffiliateOnWager(stake: number, houseEdge: number): number {
  if (!(stake > 0) || !(houseEdge > 0)) return 0;
  return useAffiliateStore.getState().noteReferredWager(stake, houseEdge);
}
