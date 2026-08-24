import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  affiliateCommission,
  colorForName,
  makeAffiliateCode,
  normalizeAffiliateCode,
  referralStatusAt,
  type AffiliateReferral,
} from "../lib/affiliate";
import { useAuthStore } from "./authStore";
import { useDemoProfileStore } from "./demoProfileStore";
import { useEconomyStore } from "./economyStore";

export interface AffiliateLedger {
  referrals: AffiliateReferral[];
  claimedShards: number;
}

interface AffiliateState {
  attributedCode: string | null;
  ledgers: Record<string, AffiliateLedger>;
  boardCreated: boolean;
  captureRef: (raw: string) => boolean;
  applyCode: (raw: string) => boolean;
  noteReferredWager: (stake: number, houseEdge: number) => number;
  claim: () => number;
  createBoard: () => void;
}

const EMPTY_LEDGER: AffiliateLedger = { referrals: [], claimedShards: 0 };

export function emptyAffiliateLedger(): AffiliateLedger {
  return { referrals: [], claimedShards: 0 };
}

export function currentPlayerName(): string {
  return useAuthStore.getState().session || useDemoProfileStore.getState().displayName;
}

export function currentPlayerCode(): string {
  return makeAffiliateCode(currentPlayerName());
}

export function ledgerFor(ledgers: Record<string, AffiliateLedger>, code: string): AffiliateLedger {
  return ledgers[code] ?? EMPTY_LEDGER;
}

export function ledgerAccrued(ledger: AffiliateLedger): number {
  return ledger.referrals.reduce((sum, row) => sum + row.commission, 0);
}

export function affiliateAvailable(ledger: AffiliateLedger): number {
  return Math.max(0, ledgerAccrued(ledger) - Math.max(0, ledger.claimedShards));
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
      boardCreated: false,
      captureRef: (raw) => {
        const code = normalizeAffiliateCode(raw);
        if (!code) return false;
        if (get().attributedCode) return false;
        set({ attributedCode: code });
        return true;
      },
      applyCode: (raw) => {
        const code = normalizeAffiliateCode(raw);
        if (!code) return false;
        if (get().attributedCode) return false;
        set({ attributedCode: code });
        return true;
      },
      noteReferredWager: (stake, houseEdge) => {
        if (!(stake > 0) || !(houseEdge > 0)) return 0;
        const attributed = get().attributedCode;
        if (!attributed) return 0;
        const playerName = currentPlayerName();
        const myCode = makeAffiliateCode(playerName);
        if (attributed === myCode) return 0;
        const cut = affiliateCommission(stake, houseEdge);
        if (cut <= 0) return 0;
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
        const ledger = ledgerFor(get().ledgers, myCode);
        const available = affiliateAvailable(ledger);
        if (available <= 0) return 0;
        useEconomyStore.getState().creditFun(available);
        set((s) => ({
          ledgers: {
            ...s.ledgers,
            [myCode]: { ...ledger, claimedShards: ledger.claimedShards + available },
          },
        }));
        return available;
      },
      createBoard: () => set({ boardCreated: true }),
    }),
    { name: "prism-vault-affiliate-v2" },
  ),
);

export function awardAffiliateOnWager(stake: number, houseEdge: number): number {
  if (!(stake > 0) || !(houseEdge > 0)) return 0;
  return useAffiliateStore.getState().noteReferredWager(stake, houseEdge);
}
