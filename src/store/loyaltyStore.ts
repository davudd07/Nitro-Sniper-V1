import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shortId } from "../lib/format";
import { LOCAL_XP_USER, MAX_XP_LEDGER, activeBoosts, calculateWagerXp, combineBoosts, mergeLoyaltyConfig, rankDropsBetween, resolveVip, roundXp, utcDayKey, type LoyaltyConfig, type LoyaltyMission, type VipTier, type WagerCurrency, type XpBoost, type XpCategory, type XpMode, type XpSource, type XpTransaction } from "../lib/loyalty";
import { useAuthStore } from "./authStore";
import { useToastStore } from "./toastStore";
import { isLocalOwner } from "../lib/owner";

export interface MissionProgress {
  periodKey: string;
  progress: number;
  completed: boolean;
}

interface LoyaltyState {
  config: LoyaltyConfig;
  xpByUser: Record<string, number>;
  ledger: XpTransaction[];
  boosts: XpBoost[];
  missionProgress: Record<string, MissionProgress>;
  setMode: (mode: XpMode) => void;
  setFlatRate: (category: XpCategory, rate: number) => void;
  setCategoryMultiplier: (category: XpCategory, multiplier: number) => void;
  setHouseEdge: (gameType: string, edge: number) => void;
  setTiers: (tiers: VipTier[]) => void;
  setMissions: (missions: LoyaltyMission[]) => void;
  addBoost: (boost: Omit<XpBoost, "id">) => string;
  clearBoost: (id: string) => void;
  awardWagerXp: (input: {
    userId?: string;
    betId: string;
    wagered: number;
    gameType: string;
    currency?: WagerCurrency;
  }) => number;
  grantXp: (userId: string, amount: number, reason: string, source?: XpSource) => number;
  lifetimeXp: (userId?: string) => number;
  historyFor: (userId?: string) => XpTransaction[];
  playerSnapshot: (userId?: string) => {
    userId: string;
    lifetimeXp: number;
    current: VipTier;
    next: VipTier | null;
    into: number;
    needed: number;
    remaining: number;
    ratio: number;
    history: XpTransaction[];
    boosts: XpBoost[];
    missions: { mission: LoyaltyMission; progress: MissionProgress }[];
  };
}

function actorId(explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();
  return useAuthStore.getState().session || LOCAL_XP_USER;
}

function ledgerUser(userId: string): string {
  return userId === "You" ? LOCAL_XP_USER : userId;
}

function pushLedger(ledger: XpTransaction[], row: XpTransaction): XpTransaction[] {
  return [row, ...ledger].slice(0, MAX_XP_LEDGER);
}

export const useLoyaltyStore = create<LoyaltyState>()(
  persist(
    (set, get) => ({
      config: mergeLoyaltyConfig(),
      xpByUser: {},
      ledger: [],
      boosts: [],
      missionProgress: {},
      setMode: (mode) => set((s) => ({ config: { ...s.config, mode } })),
      setFlatRate: (category, rate) =>
        set((s) => ({
          config: { ...s.config, flatRates: { ...s.config.flatRates, [category]: Math.max(0, rate) } },
        })),
      setCategoryMultiplier: (category, multiplier) =>
        set((s) => ({
          config: {
            ...s.config,
            categoryMultipliers: { ...s.config.categoryMultipliers, [category]: Math.max(0, multiplier) },
          },
        })),
      setHouseEdge: (gameType, edge) =>
        set((s) => ({
          config: { ...s.config, houseEdges: { ...s.config.houseEdges, [gameType]: Math.max(0, edge) } },
        })),
      setTiers: (tiers) =>
        set((s) => ({
          config: { ...s.config, tiers: [...tiers.map((t) => ({ ...t }))].sort((a, b) => a.minXp - b.minXp) },
        })),
      setMissions: (missions) => set((s) => ({ config: { ...s.config, missions } })),
      addBoost: (boost) => {
        const id = shortId("boost");
        set((s) => ({ boosts: [...s.boosts, { ...boost, id }] }));
        return id;
      },
      clearBoost: (id) => set((s) => ({ boosts: s.boosts.filter((b) => b.id !== id) })),
      lifetimeXp: (userId) => {
        const id = ledgerUser(actorId(userId));
        return get().xpByUser[id] ?? 0;
      },
      historyFor: (userId) => {
        const id = ledgerUser(actorId(userId));
        return get().ledger.filter((row) => ledgerUser(row.userId) === id);
      },
      playerSnapshot: (userId) => {
        const id = ledgerUser(actorId(userId));
        const { config, xpByUser, ledger, boosts, missionProgress } = get();
        const lifetime = xpByUser[id] ?? 0;
        const vip = resolveVip(lifetime, config.tiers);
        const now = Date.now();
        const day = utcDayKey(now);
        return {
          userId: id,
          lifetimeXp: lifetime,
          ...vip,
          history: ledger.filter((row) => ledgerUser(row.userId) === id),
          boosts: activeBoosts(boosts, id, now),
          missions: config.missions.map((mission) => {
            const key = `${id}:${mission.id}`;
            const row = missionProgress[key];
            const fresh =
              row && row.periodKey === day
                ? row
                : { periodKey: day, progress: 0, completed: false };
            return { mission, progress: fresh };
          }),
        };
      },
      grantXp: (userId, amount, reason, source = "admin") => {
        const xp = roundXp(amount);
        if (xp <= 0) return 0;
        const id = ledgerUser(userId);
        const before = get().xpByUser[id] ?? 0;
        const row: XpTransaction = {
          id: shortId("xp"),
          userId: id,
          betId: "",
          amountWagered: 0,
          gameType: "",
          category: "originals",
          mode: get().config.mode,
          houseEdge: 0,
          categoryMultiplier: 1,
          flatRate: 0,
          boostMultiplier: 1,
          calculatedXp: xp,
          source,
          reason,
          timestamp: Date.now(),
        };
        set((s) => ({
          xpByUser: { ...s.xpByUser, [id]: (s.xpByUser[id] ?? 0) + xp },
          ledger: pushLedger(s.ledger, row),
        }));
        maybeRankUp(before, before + xp, get().config.tiers, id);
        return xp;
      },
      awardWagerXp: (input) => {
        if ((input.currency ?? "shard") !== "shard") return 0;
        if (input.wagered <= 0) return 0;
        const userId = ledgerUser(actorId(input.userId));
        const { config, boosts, xpByUser, missionProgress } = get();
        const now = Date.now();
        const liveBoosts = activeBoosts(boosts, userId, now);
        const { multiplier, extraXpPerWager } = combineBoosts(liveBoosts);
        const calc = calculateWagerXp({
          wagered: input.wagered,
          gameType: input.gameType,
          config,
          boostMultiplier: multiplier,
          extraXpPerWager,
        });
        if (calc.xp <= 0) return 0;

        const before = xpByUser[userId] ?? 0;
        const row: XpTransaction = {
          id: shortId("xp"),
          userId,
          betId: input.betId,
          amountWagered: input.wagered,
          gameType: input.gameType,
          category: calc.category,
          mode: config.mode,
          houseEdge: calc.houseEdge,
          categoryMultiplier: calc.categoryMultiplier,
          flatRate: calc.flatRate,
          boostMultiplier: calc.boostMultiplier,
          calculatedXp: calc.xp,
          source: "wager",
          reason: liveBoosts.length ? liveBoosts.map((b) => b.reason).join(" · ") : "Settled shard wager",
          timestamp: now,
        };

        const nextXp = { ...xpByUser, [userId]: before + calc.xp };
        const nextLedger = pushLedger(get().ledger, row);
        const nextMissions = { ...missionProgress };
        const extraRows: XpTransaction[] = [];

        for (const mission of config.missions) {
          if (mission.kind !== "wager_sh" || mission.period !== "daily") continue;
          const key = `${userId}:${mission.id}`;
          const day = utcDayKey(now);
          const prev = nextMissions[key];
          const cur =
            prev && prev.periodKey === day ? prev : { periodKey: day, progress: 0, completed: false };
          if (cur.completed) continue;
          const progress = cur.progress + input.wagered;
          const completed = progress >= mission.target;
          nextMissions[key] = { periodKey: day, progress, completed };
          if (completed) {
            const bonus = roundXp(mission.bonusXp);
            if (bonus > 0) {
              nextXp[userId] = (nextXp[userId] ?? 0) + bonus;
              extraRows.push({
                id: shortId("xp"),
                userId,
                betId: input.betId,
                amountWagered: 0,
                gameType: input.gameType,
                category: calc.category,
                mode: config.mode,
                houseEdge: 0,
                categoryMultiplier: 1,
                flatRate: 0,
                boostMultiplier: 1,
                calculatedXp: bonus,
                source: "mission",
                reason: mission.title,
                timestamp: now,
              });
            }
          }
        }

        let ledger = nextLedger;
        for (const extra of extraRows) ledger = pushLedger(ledger, extra);

        set({
          xpByUser: nextXp,
          ledger,
          missionProgress: nextMissions,
        });

        const after = nextXp[userId] ?? before;
        maybeRankUp(before, after, config.tiers, userId);
        if (extraRows.length) {
          useToastStore.getState().push(`Daily mission complete · +${extraRows[0]!.calculatedXp} XP`, "success");
        }
        return calc.xp;
      },
    }),
    {
      name: "prism-vault-loyalty",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LoyaltyState>;
        return {
          ...current,
          ...p,
          config: mergeLoyaltyConfig(p.config),
          xpByUser: p.xpByUser ?? {},
          ledger: p.ledger ?? [],
          boosts: p.boosts ?? [],
          missionProgress: p.missionProgress ?? {},
        };
      },
    },
  ),
);

function maybeRankUp(before: number, after: number, tiers: VipTier[], userId: string) {
  if (userId !== LOCAL_XP_USER && userId !== useAuthStore.getState().session) return;
  const prev = resolveVip(before, tiers).current;
  const next = resolveVip(after, tiers).current;
  if (prev.id === next.id) return;
  const drops = rankDropsBetween(before, after, tiers);
  if (drops.amount > 0 && !isLocalOwner()) {
    void import("./economyStore").then(({ useEconomyStore }) => {
      useEconomyStore.getState().credit(drops.amount);
    });
  }
  const extra = drops.amount > 0 && !isLocalOwner() ? ` · +${drops.amount} SH rank drop` : "";
  useToastStore.getState().push(`VIP ${next.name} reached.${extra}`, "success");
  if (!isLocalOwner()) {
    void import("./rankRewardStore").then(({ grantRankUpKeys }) => {
      grantRankUpKeys(prev.id, next.id, tiers);
    });
  }
}

export function awardWagerXp(input: {
  userId?: string;
  betId: string;
  wagered: number;
  gameType: string;
  currency?: WagerCurrency;
}): number {
  return useLoyaltyStore.getState().awardWagerXp(input);
}
