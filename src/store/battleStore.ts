import { create } from "zustand";
import { shortId } from "../lib/format";
import { getCase } from "../data/cases";

export interface BattleCaseEntry {
  caseId: string;
  count: number;
}

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
  createdAt: number;
  /** "you" = created in this session; "lobby" = seeded active room. */
  source: "you" | "lobby";
  /** Other seats already filled with bots when the room opens. */
  prefillBots: number;
}

export interface BattleJoinIntent {
  borrowPct: number;
}

interface BattleStoreState {
  battles: Record<string, BattleConfig>;
  joinIntents: Record<string, BattleJoinIntent>;
  createBattle: (cfg: Omit<BattleConfig, "id" | "createdAt">) => string;
  getBattle: (id: string) => BattleConfig | undefined;
  listBattles: () => BattleConfig[];
  setJoinIntent: (battleId: string, intent: BattleJoinIntent) => void;
}

function costOf(cases: BattleCaseEntry[]): number {
  return cases.reduce((s, e) => s + e.count * (getCase(e.caseId)?.price ?? 0), 0);
}

function seedBattle(
  partial: Omit<BattleConfig, "id" | "createdAt" | "costPerPlayer" | "source" | "fundedPct" | "isPrivate"> & {
    id: string;
    createdAt: number;
    fundedPct?: number;
    isPrivate?: boolean;
  },
): BattleConfig {
  return {
    ...partial,
    source: "lobby",
    fundedPct: partial.fundedPct ?? 0,
    isPrivate: partial.isPrivate ?? false,
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
      prefillBots: 1,
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
      prefillBots: 2,
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
      prefillBots: 3,
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
  ];
  return Object.fromEntries(seeds.map((b) => [b.id, b]));
}

export const useBattleStore = create<BattleStoreState>((set, get) => ({
  battles: seedBattles(),
  joinIntents: {},
  createBattle: (cfg) => {
    const id = shortId("battle");
    const battle: BattleConfig = { ...cfg, id, createdAt: Date.now() };
    set((s) => ({ battles: { ...s.battles, [id]: battle } }));
    return id;
  },
  getBattle: (id) => get().battles[id],
  listBattles: () => Object.values(get().battles).sort((a, b) => b.createdAt - a.createdAt),
  setJoinIntent: (battleId, intent) => {
    set((s) => ({ joinIntents: { ...s.joinIntents, [battleId]: intent } }));
  },
}));
