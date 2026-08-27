import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  HIDDEN_LEADERBOARD_NAME,
  LEADERBOARD_PRIZES,
  LOCAL_LEADERBOARD_ID,
  leaderboardKeys,
  prizeForPlace,
  type LeaderboardKeys,
  type LeaderboardPeriod,
} from "../lib/leaderboard";
import { localWinName } from "./winLeaderStore";
import { useDemoProfileStore } from "./demoProfileStore";
import { isLocalOwner } from "../lib/owner";

export interface LeaderboardBot {
  id: string;
  name: string;
  hidden: boolean;
}

export interface LeaderboardAmounts {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  hidden: boolean;
  isYou: boolean;
  wagered: number;
  place: number;
  prize: number;
}

interface LeaderboardState {
  keys: LeaderboardKeys;
  paid: LeaderboardKeys;
  you: LeaderboardAmounts;
  bots: Record<string, LeaderboardAmounts>;
  botMeta: LeaderboardBot[];
  lastBotTick: number;
  tick: (now?: number) => void;
  recordWlWager: (amount: number) => void;
}

const BOT_META: LeaderboardBot[] = [
  { id: "bot_pixelfox", name: "PixelFox", hidden: false },
  { id: "bot_novabyte", name: "NovaByte", hidden: true },
  { id: "bot_vaultraider", name: "VaultRaider", hidden: false },
  { id: "bot_luckycomet", name: "LuckyComet", hidden: false },
  { id: "bot_emberdrift", name: "EmberDrift", hidden: true },
  { id: "bot_glasswolf", name: "GlassWolf", hidden: false },
  { id: "bot_prismkite", name: "PrismKite", hidden: false },
  { id: "bot_rollmint", name: "RollMint", hidden: false },
  { id: "bot_neonwisp", name: "NeonWisp", hidden: true },
  { id: "bot_orbitjester", name: "OrbitJester", hidden: false },
  { id: "bot_tidalgleam", name: "TidalGleam", hidden: false },
  { id: "bot_ashharbor", name: "AshHarbor", hidden: false },
];

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedBotAmounts(bot: LeaderboardBot, periodSalt: string): LeaderboardAmounts {
  const rng = mulberry(hashSeed(`${bot.id}:${periodSalt}`));
  const daily = Math.round(40 + rng() * 720);
  const weekly = Math.round(daily * (4 + rng() * 8) + rng() * 2_400);
  const monthly = Math.round(weekly * (3 + rng() * 5) + rng() * 8_000);
  return { daily, weekly, monthly };
}

function seedAllBots(keys: LeaderboardKeys): Record<string, LeaderboardAmounts> {
  return Object.fromEntries(BOT_META.map((bot) => [bot.id, seedBotAmounts(bot, keys.weekly)]));
}

const ZERO: LeaderboardAmounts = { daily: 0, weekly: 0, monthly: 0 };

interface SnapshotEntry {
  id: string;
  wagered: number;
  isYou: boolean;
  hidden: boolean;
  name: string;
}

function snapshot(period: LeaderboardPeriod, state: LeaderboardState): SnapshotEntry[] {
  const youName = localWinName();
  const youHidden = useDemoProfileStore.getState().anonymous;
  const rows: SnapshotEntry[] = [
    ...state.botMeta.map((bot) => ({
      id: bot.id,
      wagered: state.bots[bot.id]?.[period] ?? 0,
      isYou: false,
      hidden: bot.hidden,
      name: bot.name,
    })),
  ];
  if (!isLocalOwner()) {
    rows.push({
      id: LOCAL_LEADERBOARD_ID,
      wagered: state.you[period],
      isYou: true,
      hidden: youHidden,
      name: youName,
    });
  }
  rows.sort((a, b) => b.wagered - a.wagered || a.id.localeCompare(b.id));
  return rows;
}

function payPeriod(period: LeaderboardPeriod, state: LeaderboardState): number {
  if (isLocalOwner()) return 0;
  const ranked = snapshot(period, state);
  const youIdx = ranked.findIndex((r) => r.isYou);
  if (youIdx < 0 || youIdx > 4) return 0;
  const prize = prizeForPlace(period, youIdx + 1);
  if (prize <= 0) return 0;
  void import("./economyStore").then(({ useEconomyStore }) => {
    useEconomyStore.getState().credit(prize);
  });
  void import("./balanceLedgerStore").then(({ appendBalanceLedger }) => {
    appendBalanceLedger({
      name: "You",
      kind: "prize",
      amount: prize,
      currency: "wl",
      note: `${period} leaderboard prize`,
    });
  });
  void import("./toastStore").then(({ useToastStore }) => {
    const place = youIdx + 1;
    useToastStore.getState().push(
      `${period[0]!.toUpperCase()}${period.slice(1)} leaderboard #${place} — ${prize} WL credited.`,
      "success",
    );
  });
  return prize;
}

export function displayLeaderboardName(row: { hidden: boolean; isYou: boolean; name: string }): string {
  if (row.hidden) return HIDDEN_LEADERBOARD_NAME;
  if (row.isYou && useDemoProfileStore.getState().anonymous) return HIDDEN_LEADERBOARD_NAME;
  return row.name;
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set, get) => {
      const keys = leaderboardKeys();
      return {
        keys,
        paid: { daily: "", weekly: "", monthly: "" },
        you: { ...ZERO },
        bots: seedAllBots(keys),
        botMeta: BOT_META,
        lastBotTick: 0,
        recordWlWager: (amount) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          if (isLocalOwner()) return;
          get().tick(Date.now());
          set((s) => ({
            you: {
              daily: s.you.daily + amount,
              weekly: s.you.weekly + amount,
              monthly: s.you.monthly + amount,
            },
          }));
        },
        tick: (now = Date.now()) => {
          const nextKeys = leaderboardKeys(now);
          const s = get();
          let keys = s.keys;
          let paid = s.paid;
          let you = s.you;
          let bots = s.bots;
          let changed = false;

          if (keys.daily !== nextKeys.daily) {
            if (paid.daily !== keys.daily) payPeriod("daily", { ...s, you, bots });
            paid = { ...paid, daily: keys.daily };
            you = { ...you, daily: 0 };
            bots = Object.fromEntries(
              Object.entries(bots).map(([id, amt]) => {
                const meta = BOT_META.find((b) => b.id === id);
                const seeded = meta ? seedBotAmounts(meta, nextKeys.daily).daily : Math.round(40 + Math.random() * 400);
                return [id, { ...amt, daily: seeded }];
              }),
            );
            keys = { ...keys, daily: nextKeys.daily };
            changed = true;
          }
          if (keys.weekly !== nextKeys.weekly) {
            if (paid.weekly !== keys.weekly) payPeriod("weekly", { ...get(), you, bots, keys });
            paid = { ...paid, weekly: keys.weekly };
            you = { ...you, weekly: 0 };
            bots = Object.fromEntries(
              Object.entries(bots).map(([id, amt]) => {
                const meta = BOT_META.find((b) => b.id === id);
                const seeded = meta ? seedBotAmounts(meta, nextKeys.weekly) : amt;
                return [id, { ...amt, weekly: seeded.weekly }];
              }),
            );
            keys = { ...keys, weekly: nextKeys.weekly };
            changed = true;
          }
          if (keys.monthly !== nextKeys.monthly) {
            if (paid.monthly !== keys.monthly) payPeriod("monthly", { ...get(), you, bots, keys });
            paid = { ...paid, monthly: keys.monthly };
            you = { ...you, monthly: 0 };
            bots = Object.fromEntries(
              Object.entries(bots).map(([id, amt]) => {
                const meta = BOT_META.find((b) => b.id === id);
                const seeded = meta ? seedBotAmounts(meta, nextKeys.monthly) : amt;
                return [id, { ...amt, monthly: seeded.monthly }];
              }),
            );
            keys = { ...keys, monthly: nextKeys.monthly };
            changed = true;
          }

          let lastBotTick = s.lastBotTick;
          if (now - lastBotTick >= 9_000) {
            lastBotTick = now;
            bots = { ...bots };
            const n = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < n; i++) {
              const bot = BOT_META[Math.floor(Math.random() * BOT_META.length)]!;
              const bump = Math.round(8 + Math.random() * 90);
              const cur = bots[bot.id] ?? { ...ZERO };
              bots[bot.id] = {
                daily: cur.daily + bump,
                weekly: cur.weekly + bump,
                monthly: cur.monthly + bump,
              };
            }
            changed = true;
          }

          if (changed) set({ keys, paid, you, bots, lastBotTick, botMeta: BOT_META });
        },
      };
    },
    {
      name: "prism-vault-leaderboard",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LeaderboardState>;
        const keys = p.keys ?? current.keys;
        return {
          ...current,
          ...p,
          keys,
          paid: p.paid ?? { daily: "", weekly: "", monthly: "" },
          you: p.you ?? current.you,
          bots: p.bots && Object.keys(p.bots).length ? p.bots : seedAllBots(keys),
          botMeta: BOT_META,
        };
      },
    },
  ),
);

let queuedWl = 0;

function leaderboardPersistReady(): boolean {
  return typeof useLeaderboardStore.persist?.hasHydrated === "function";
}

export function recordWlWager(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) return;
  if (!leaderboardPersistReady() || !useLeaderboardStore.persist.hasHydrated()) {
    queuedWl += amount;
    return;
  }
  useLeaderboardStore.getState().recordWlWager(amount);
}

useLeaderboardStore.persist?.onFinishHydration?.(() => {
  if (queuedWl <= 0) return;
  const n = queuedWl;
  queuedWl = 0;
  useLeaderboardStore.getState().recordWlWager(n);
});

export function leaderboardRows(period: LeaderboardPeriod): LeaderboardRow[] {
  const state = useLeaderboardStore.getState();
  return snapshot(period, state).map((row, i) => ({
    id: row.id,
    name: displayLeaderboardName(row),
    hidden: row.hidden,
    isYou: row.isYou,
    wagered: row.wagered,
    place: i + 1,
    prize: i < 5 ? (LEADERBOARD_PRIZES[period][i] ?? 0) : 0,
  }));
}
