import { create } from "zustand";
import { shortId } from "../lib/format";
import { getCase, type CaseOddsEntry } from "../data/cases";
import { sanitizeBattleModifiers } from "../lib/battleCoinflip";

export type BattleRosterKind = "you" | "empty" | "joining" | "bot" | "player";

export interface BattleRosterSeat {
  slotIndex: number;
  teamIndex: number;
  kind: BattleRosterKind;
  name: string;
  color: string;
}

export interface BattleJackpotReplay {
  tickets: { playerId: string; name: string; color: string; weight: number }[];
  winnerId: string;
  tieBreak: boolean;
}

/** Stored openings + seats so a finished room can replay instead of re-opening as a live lobby. */
export interface BattleReplay {
  seats: BattleRosterSeat[];
  openings: Record<number, CaseOddsEntry | null>[];
  jackpot: BattleJackpotReplay | null;
}

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
  /**
   * Coinflip battle: equal-odds strip spin (one player per team) decides the winner.
   * The pot is the live pull total, not the seat buy-in.
   */
  coinflip: boolean;
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
  /** Frozen seated players once the room fills or a bot is called. Survives status flips. */
  roster?: BattleRosterSeat[];
  /** Openings and jackpot outcome for replay. */
  replay?: BattleReplay;
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
  patchBattle: (id: string, patch: Partial<Omit<BattleConfig, "id">>) => void;
}

function costOf(cases: BattleCaseEntry[]): number {
  return cases.reduce((s, e) => s + e.count * (getCase(e.caseId)?.price ?? 0), 0);
}

function seedBattle(
  partial: Omit<BattleConfig, "id" | "createdAt" | "costPerPlayer" | "source" | "fundedPct" | "isPrivate" | "shared" | "fastSpin" | "creatorBorrowPct" | "status" | "coinflip"> & {
    id: string;
    createdAt: number;
    fundedPct?: number;
    isPrivate?: boolean;
    shared?: boolean;
    fastSpin?: boolean;
    coinflip?: boolean;
    creatorBorrowPct?: number;
    status?: BattleLobbyStatus;
    payout?: number;
    finishedAt?: number;
  },
): BattleConfig {
  const mods = sanitizeBattleModifiers({
    coinflip: partial.coinflip,
    crazy: partial.crazy,
    jackpot: partial.jackpot,
    terminal: partial.terminal,
    goldSpin: partial.goldSpin,
    shared: partial.shared,
  });
  return {
    ...partial,
    ...mods,
    source: "lobby",
    fundedPct: partial.fundedPct ?? 0,
    isPrivate: partial.isPrivate ?? false,
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
      botSeats: [1],
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
      botSeats: [1],
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
      id: "lobby_ffa6_prime",
      modeId: "1v1v1v1v1v1",
      crazy: false,
      jackpot: true,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "prime", count: 1 }],
      prefillBots: 2,
      botSeats: [1, 4],
      createdAt: now - 6500,
    }),
    seedBattle({
      id: "lobby_2v2v2v2_elite",
      modeId: "2v2v2v2",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "elite", count: 1 }],
      prefillBots: 3,
      botSeats: [1, 4, 6],
      createdAt: now - 5200,
    }),
    seedBattle({
      id: "lobby_4v4_vault",
      modeId: "4v4",
      crazy: false,
      jackpot: true,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "vault", count: 1 }],
      prefillBots: 3,
      botSeats: [2, 5, 7],
      createdAt: now - 3600,
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
      id: "lobby_2v2_coinflip",
      modeId: "2v2",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      coinflip: true,
      cases: [{ caseId: "starter", count: 2 }],
      prefillBots: 2,
      botSeats: [1, 2],
      createdAt: now - 2800,
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
      id: "hist_ffa6",
      modeId: "1v1v1v1v1v1",
      crazy: false,
      jackpot: true,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "prime", count: 2 }],
      prefillBots: 5,
      status: "finished",
      payout: 18600,
      finishedAt: now - 9600000,
      createdAt: now - 9700000,
    }),
    seedBattle({
      id: "hist_quads",
      modeId: "2v2v2v2",
      crazy: false,
      jackpot: false,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "elite", count: 1 }, { caseId: "vault", count: 1 }],
      prefillBots: 7,
      status: "finished",
      payout: 17240,
      finishedAt: now - 8400000,
      createdAt: now - 8500000,
    }),
    seedBattle({
      id: "hist_4v4",
      modeId: "4v4",
      crazy: false,
      jackpot: true,
      goldSpin: true,
      terminal: false,
      cases: [{ caseId: "vault", count: 2 }],
      prefillBots: 7,
      status: "finished",
      payout: 16480,
      finishedAt: now - 7800000,
      createdAt: now - 7900000,
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
    seedBattle({
      id: "hist_coinflip",
      modeId: "1v1",
      crazy: false,
      jackpot: false,
      goldSpin: false,
      terminal: false,
      coinflip: true,
      cases: [{ caseId: "prime", count: 1 }],
      prefillBots: 1,
      status: "finished",
      payout: 2100,
      finishedAt: now - 4200000,
      createdAt: now - 4300000,
    }),
  ];
  return Object.fromEntries(seeds.map((b) => [b.id, b]));
}

export const useBattleStore = create<BattleStoreState>((set, get) => ({
  battles: seedBattles(),
  joinIntents: {},
  createBattle: (cfg) => {
    const id = shortId("battle");
    const mods = sanitizeBattleModifiers(cfg);
    const battle: BattleConfig = {
      ...cfg,
      ...mods,
      id,
      createdAt: Date.now(),
      status: cfg.status ?? "open",
    };
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
  patchBattle: (id, patch) => {
    set((s) => {
      const cur = s.battles[id];
      if (!cur) return s;
      return { battles: { ...s.battles, [id]: { ...cur, ...patch } } };
    });
  },
}));
