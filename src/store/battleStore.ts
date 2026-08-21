import { create } from "zustand";
import { shortId } from "../lib/format";
import { getCase } from "../data/cases";

export interface BattleCaseEntry {
  caseId: string;
  count: number;
}

export type BattleLobbyStatus = "open" | "active" | "finished";

export interface BattleConfig {
  id: string;
  modeId: string;
  crazy: boolean;
  jackpot: boolean;
  goldSpin: boolean;
  /** Only the value pulled on the LAST case decides the winner, not the running total. */
  terminal: boolean;
  cases: BattleCaseEntry[];
  /** Cost of the full case list — what each individual seat pays to join. */
  costPerPlayer: number;
  /** 0–1. Creator covers this fraction of every other player's seat. */
  fundedPct: number;
  /** Hidden from the lobby — join only with the room link. */
  isPrivate: boolean;
  /** Everyone splits the pot equally after the last case. */
  shared: boolean;
  /** Shorter reel duration in the battle room. */
  fastSpin: boolean;
  createdAt: number;
  /** "you" = created in this session; "lobby" = seeded active room. */
  source: "you" | "lobby";
  /** Other seats already filled with bots when the room opens. */
  prefillBots: number;
  /** Seat index the creator occupies (jackpot position). Defaults to 0. */
  creatorSeat?: number;
  /** Explicit bot seat indexes. When omitted, bots fill the first `prefillBots` non-creator seats. */
  botSeats?: number[];
  /** 0–1. Creator borrowed this fraction of their own seat. */
  creatorBorrowPct: number;
  status: BattleLobbyStatus;
  /** Total pot paid out when finished. */
  payout?: number;
  finishedAt?: number;
}

export interface BattleJoinIntent {
  borrowPct: number;
  /** Seat index the joiner occupies. Defaults to 0 for lobby joins. */
  seat?: number;
}

interface BattleStoreState {
  battles: Record<string, BattleConfig>;
  joinIntents: Record<string, BattleJoinIntent>;
  createBattle: (cfg: Omit<BattleConfig, "id" | "createdAt" | "status"> & { status?: BattleLobbyStatus }) => string;
  getBattle: (id: string) => BattleConfig | undefined;
  listBattles: () => BattleConfig[];
  setJoinIntent: (battleId: string, intent: BattleJoinIntent) => void;
  setBattleStatus: (id: string, status: BattleLobbyStatus, payout?: number) => void;
}

function costOf(cases: BattleCaseEntry[]): number {
  return cases.reduce((s, e) => s + e.count * (getCase(e.caseId)?.price ?? 0), 0);
}

function seedBattle(
  partial: Omit<BattleConfig, "id" | "createdAt" | "costPerPlayer" | "source" | "fundedPct" | "isPrivate" | "shared" | "fastSpin" | "creatorBorrowPct" | "status"> & {
    id: string;
    createdAt: number;
    fundedPct?: number;
    isPrivate?: boolean;
    shared?: boolean;
    fastSpin?: boolean;
    creatorBorrowPct?: number;
    status?: BattleLobbyStatus;
    payout?: number;
    finishedAt?: number;
  },
): BattleConfig {
  return {
    ...partial,
    source: "lobby",
    fundedPct: partial.fundedPct ?? 0,
    isPrivate: partial.isPrivate ?? false,
    shared: partial.shared ?? false,
    fastSpin: partial.fastSpin ?? false,
    creatorBorrowPct: partial.creatorBorrowPct ?? 0,
    status: partial.status ?? "open",
    costPerPlayer: costOf(partial.cases),
  };
}

function seedBattles(): Record<string, BattleConfig> {
  const now = Date.now();
  const seeds: BattleConfig[] = [
    seedBattle({
      id: "lobby_1v1_pocket",
      modeId: "1v1",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "pocket", count: 3 }],
      prefillBots: 0,
      createdAt: now - 40000,
    }),
    seedBattle({
      id: "lobby_1v1_starter",
      modeId: "1v1",
      crazy: false,
      jackpot: true,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "starter", count: 2 }],
      prefillBots: 1,
      createdAt: now - 32000,
    }),
    seedBattle({
      id: "lobby_2v2_vault",
      modeId: "2v2",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "vault", count: 2 }],
      prefillBots: 3,
      status: "active",
      createdAt: now - 25000,
    }),
    seedBattle({
      id: "lobby_1v1v1_prime",
      modeId: "1v1v1",
      crazy: true,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "prime", count: 1 }, { caseId: "starter", count: 1 }],
      prefillBots: 1,
      createdAt: now - 18000,
    }),
    seedBattle({
      id: "lobby_2v2_elite",
      modeId: "2v2",
      crazy: false,
      jackpot: true,
      goldSpin: true,
      terminal: true,
      cases: [{ caseId: "elite", count: 1 }],
      prefillBots: 3,
      status: "active",
      createdAt: now - 12000,
    }),
    seedBattle({
      id: "lobby_3v3_chaos",
      modeId: "3v3",
      crazy: true,
      jackpot: false,
      goldSpin: false,
      terminal: false,
      cases: [{ caseId: "chaos", count: 1 }, { caseId: "vault", count: 1 }],
      prefillBots: 5,
      status: "active",
      createdAt: now - 8000,
    }),
    seedBattle({
      id: "lobby_1v1_steady",
      modeId: "1v1",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "steady", count: 1 }],
      prefillBots: 0,
      fundedPct: 0.5,
      createdAt: now - 4000,
    }),
    seedBattle({
      id: "hist_whale",
      modeId: "2v2",
      crazy: false,
      jackpot: true,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "whale", count: 2 }],
      prefillBots: 3,
      status: "finished",
      payout: 48200,
      finishedAt: now - 3600000,
      createdAt: now - 3700000,
    }),
    seedBattle({
      id: "hist_apex",
      modeId: "1v1v1",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "apex", count: 1 }],
      prefillBots: 2,
      status: "finished",
      payout: 31500,
      finishedAt: now - 7200000,
      createdAt: now - 7300000,
    }),
    seedBattle({
      id: "hist_elite",
      modeId: "2v2v2",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "elite", count: 2 }],
      prefillBots: 5,
      status: "finished",
      payout: 24800,
      finishedAt: now - 5400000,
      createdAt: now - 5500000,
    }),
    seedBattle({
      id: "hist_chaos",
      modeId: "3v3",
      crazy: true,
      jackpot: false,
      goldSpin: false,
      terminal: false,
      cases: [{ caseId: "chaos", count: 1 }],
      prefillBots: 5,
      status: "finished",
      payout: 19640,
      finishedAt: now - 10800000,
      createdAt: now - 10900000,
    }),
    seedBattle({
      id: "hist_prime",
      modeId: "1v1",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "prime", count: 3 }],
      prefillBots: 1,
      status: "finished",
      payout: 15400,
      finishedAt: now - 14400000,
      createdAt: now - 14500000,
    }),
    seedBattle({
      id: "hist_vault",
      modeId: "2v2",
      crazy: false,
      jackpot: true,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "vault", count: 2 }],
      prefillBots: 3,
      status: "finished",
      payout: 12150,
      finishedAt: now - 18000000,
      createdAt: now - 18100000,
    }),
    seedBattle({
      id: "hist_starter",
      modeId: "1v1v1",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: true,
      cases: [{ caseId: "starter", count: 4 }],
      prefillBots: 2,
      status: "finished",
      payout: 8800,
      finishedAt: now - 21600000,
      createdAt: now - 21700000,
    }),
    seedBattle({
      id: "hist_steady",
      modeId: "1v1",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "steady", count: 2 }],
      prefillBots: 1,
      status: "finished",
      payout: 4200,
      finishedAt: now - 25200000,
      createdAt: now - 25300000,
    }),
    seedBattle({
      id: "hist_pocket",
      modeId: "1v1",
      crazy: false,
      jackpot: false,
      goldSpin: false,
      terminal: false,
      cases: [{ caseId: "pocket", count: 5 }],
      prefillBots: 1,
      status: "finished",
      payout: 2650,
      finishedAt: now - 28800000,
      createdAt: now - 28900000,
    }),
    seedBattle({
      id: "hist_small",
      modeId: "1v1",
      crazy: true,
      jackpot: false,
      goldSpin: false,
      terminal: false,
      cases: [{ caseId: "pocket", count: 1 }],
      prefillBots: 1,
      status: "finished",
      payout: 980,
      finishedAt: now - 32400000,
      createdAt: now - 32500000,
    }),
    seedBattle({
      id: "hist_tiny",
      modeId: "1v1",
      crazy: false,
      jackpot: false,
      goldSpin: false,
      terminal: false,
      cases: [{ caseId: "pocket", count: 1 }],
      prefillBots: 1,
      status: "finished",
      payout: 420,
      finishedAt: now - 36000000,
      createdAt: now - 36100000,
    }),
  ];
  return Object.fromEntries(seeds.map((b) => [b.id, b]));
}

export const useBattleStore = create<BattleStoreState>((set, get) => ({
  battles: seedBattles(),
  joinIntents: {},
  createBattle: (cfg) => {
    const id = shortId("battle");
    const battle: BattleConfig = { ...cfg, id, createdAt: Date.now(), status: cfg.status ?? "open" };
    set((s) => ({ battles: { ...s.battles, [id]: battle } }));
    return id;
  },
  getBattle: (id) => get().battles[id],
  listBattles: () => Object.values(get().battles).sort((a, b) => b.createdAt - a.createdAt),
  setJoinIntent: (battleId, intent) => {
    set((s) => ({ joinIntents: { ...s.joinIntents, [battleId]: intent } }));
  },
  setBattleStatus: (id, status, payout) => {
    set((s) => {
      const cur = s.battles[id];
      if (!cur) return s;
      return {
        battles: {
          ...s.battles,
          [id]: {
            ...cur,
            status,
            payout: payout ?? cur.payout,
            finishedAt: status === "finished" ? Date.now() : cur.finishedAt,
          },
        },
      };
    });
  },
}));
