import { create } from "zustand";
import { shortId } from "../lib/format";

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
  createdAt: number;
}

interface BattleStoreState {
  battles: Record<string, BattleConfig>;
  createBattle: (cfg: Omit<BattleConfig, "id" | "createdAt">) => string;
  getBattle: (id: string) => BattleConfig | undefined;
}

export const useBattleStore = create<BattleStoreState>((set, get) => ({
  battles: {},
  createBattle: (cfg) => {
    const id = shortId("battle");
    const battle: BattleConfig = { ...cfg, id, createdAt: Date.now() };
    set((s) => ({ battles: { ...s.battles, [id]: battle } }));
    return id;
  },
  getBattle: (id) => get().battles[id],
}));
