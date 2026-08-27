import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DAILY_CASE_COOLDOWN_MS,
  KEY_CASE_COOLDOWN_MS,
  KEY_BANDS,
  KEY_BAND_LABEL,
  keysGrantedBetween,
  parseRankCaseId,
  type KeyBand,
} from "../lib/rankRewards";
import { LOCAL_XP_USER, resolveVip, type VipTier } from "../lib/loyalty";
import { useLoyaltyStore } from "./loyaltyStore";
import { useToastStore } from "./toastStore";

type KeyInventory = Record<KeyBand, number>;

interface RankRewardState {
  caughtUp: boolean;
  lastRankId: string;
  keys: KeyInventory;
  dailyClaimedAt: Record<string, number>;
  keyOpenedAt: Record<KeyBand, number>;
  ensureCaughtUp: () => void;
  grantRankUpKeys: (fromRankId: string, toRankId: string, tiers: VipTier[]) => KeyBand[];
  beginOpen: (caseId: string) => { ok: true } | { ok: false; reason: string };
  dailyReadyAt: (rankId: string) => number;
  keyReadyAt: (band: KeyBand) => number;
  keysFor: (band: KeyBand) => number;
}

function emptyKeys(): KeyInventory {
  return Object.fromEntries(KEY_BANDS.map((b) => [b, 0])) as KeyInventory;
}

function emptyKeyOpened(): Record<KeyBand, number> {
  return Object.fromEntries(KEY_BANDS.map((b) => [b, 0])) as Record<KeyBand, number>;
}

function currentRankId(): string {
  const xp = useLoyaltyStore.getState().lifetimeXp(LOCAL_XP_USER);
  const tiers = useLoyaltyStore.getState().config.tiers;
  return resolveVip(xp, tiers).current.id;
}

export const useRankRewardStore = create<RankRewardState>()(
  persist(
    (set, get) => ({
      caughtUp: false,
      lastRankId: "unranked",
      keys: emptyKeys(),
      dailyClaimedAt: {},
      keyOpenedAt: emptyKeyOpened(),
      ensureCaughtUp: () => {
        const rankId = currentRankId();
        const s = get();
        if (!s.caughtUp) {
          set({ caughtUp: true, lastRankId: rankId });
          return;
        }
        if (s.lastRankId !== rankId) {
          get().grantRankUpKeys(s.lastRankId, rankId, useLoyaltyStore.getState().config.tiers);
        }
      },
      grantRankUpKeys: (fromRankId, toRankId, tiers) => {
        const bands = keysGrantedBetween(fromRankId, toRankId, tiers);
        if (bands.length === 0) {
          set({ lastRankId: toRankId, caughtUp: true });
          return [];
        }
        set((s) => {
          const keys = { ...s.keys };
          for (const band of bands) keys[band] = (keys[band] ?? 0) + 1;
          return { keys, lastRankId: toRankId, caughtUp: true };
        });
        const counts = new Map<KeyBand, number>();
        for (const band of bands) counts.set(band, (counts.get(band) ?? 0) + 1);
        const parts = [...counts.entries()].map(
          ([band, n]) => `${n} ${KEY_BAND_LABEL[band]} key${n === 1 ? "" : "s"}`,
        );
        useToastStore.getState().push(`Rank-up keys: ${parts.join(", ")}.`, "success");
        return bands;
      },
      dailyReadyAt: (rankId) => {
        const last = get().dailyClaimedAt[rankId] ?? 0;
        return last + DAILY_CASE_COOLDOWN_MS;
      },
      keyReadyAt: (band) => {
        const last = get().keyOpenedAt[band] ?? 0;
        return last + KEY_CASE_COOLDOWN_MS;
      },
      keysFor: (band) => get().keys[band] ?? 0,
      beginOpen: (caseId) => {
        const meta = parseRankCaseId(caseId);
        if (!meta) return { ok: false, reason: "That is not a rank reward case." };
        const now = Date.now();
        const xp = useLoyaltyStore.getState().lifetimeXp(LOCAL_XP_USER);
        const tiers = useLoyaltyStore.getState().config.tiers;
        if (meta.kind === "daily") {
          const tier = tiers.find((t) => t.id === meta.rankId);
          if (!tier) return { ok: false, reason: "Unknown rank." };
          if (xp < tier.minXp) return { ok: false, reason: "Reach this rank to open its daily case." };
          const readyAt = get().dailyReadyAt(meta.rankId);
          if (now < readyAt) {
            return { ok: false, reason: "This daily case is still on cooldown." };
          }
          set((s) => ({ dailyClaimedAt: { ...s.dailyClaimedAt, [meta.rankId]: now } }));
          return { ok: true };
        }
        const have = get().keys[meta.band] ?? 0;
        if (have < 1) return { ok: false, reason: `You need a ${KEY_BAND_LABEL[meta.band]} key.` };
        const readyAt = get().keyReadyAt(meta.band);
        if (now < readyAt) return { ok: false, reason: "That key case is still on a 2 hour cooldown." };
        set((s) => ({
          keys: { ...s.keys, [meta.band]: Math.max(0, (s.keys[meta.band] ?? 0) - 1) },
          keyOpenedAt: { ...s.keyOpenedAt, [meta.band]: now },
        }));
        return { ok: true };
      },
    }),
    {
      name: "prism-vault-rank-rewards",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RankRewardState>;
        return {
          ...current,
          ...p,
          keys: { ...emptyKeys(), ...p.keys },
          dailyClaimedAt: p.dailyClaimedAt ?? {},
          keyOpenedAt: { ...emptyKeyOpened(), ...p.keyOpenedAt },
        };
      },
    },
  ),
);

export function grantRankUpKeys(fromRankId: string, toRankId: string, tiers: VipTier[]): KeyBand[] {
  return useRankRewardStore.getState().grantRankUpKeys(fromRankId, toRankId, tiers);
}
