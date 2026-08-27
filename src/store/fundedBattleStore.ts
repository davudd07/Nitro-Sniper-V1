import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  FUNDED_BOOTSTRAP_DELAY_MS,
  FUNDED_WINDOW_MS,
  fundedBattleId,
  nextWindowStart,
  randomOffsetMs,
  rollFundedBattle,
  mulberry32,
} from "../lib/fundedBattle";
import { useBattleStore, type BattleConfig } from "./battleStore";
import { useToastStore } from "./toastStore";

interface FundedBattleState {
  windowStart: number;
  spawnAt: number;
  spawnedWindow: number;
  bootstrapped: boolean;
  snapshot: BattleConfig | null;
  tick: (now?: number) => void;
}

function seedRng(now: number): () => number {
  return mulberry32((now / 1000) >>> 0);
}

export const useFundedBattleStore = create<FundedBattleState>()(
  persist(
    (set, get) => ({
      windowStart: 0,
      spawnAt: 0,
      spawnedWindow: 0,
      bootstrapped: false,
      snapshot: null,
      tick: (now = Date.now()) => {
        let { windowStart, spawnAt, spawnedWindow, bootstrapped, snapshot } = get();
        let changed = false;

        if (!bootstrapped || windowStart <= 0) {
          windowStart = now;
          spawnAt = now + FUNDED_BOOTSTRAP_DELAY_MS;
          spawnedWindow = 0;
          bootstrapped = true;
          snapshot = null;
          changed = true;
        }

        const aligned = nextWindowStart(windowStart, now);
        if (aligned !== windowStart) {
          windowStart = aligned;
          spawnAt = windowStart + randomOffsetMs(seedRng(windowStart));
          changed = true;
        }

        if (spawnAt < windowStart || spawnAt >= windowStart + FUNDED_WINDOW_MS) {
          spawnAt = windowStart + randomOffsetMs(seedRng(windowStart + 17));
          changed = true;
        }

        if (now >= spawnAt && spawnedWindow !== windowStart) {
          const rolled = rollFundedBattle(windowStart);
          const battle: BattleConfig = { ...rolled, status: "open", createdAt: now };
          useBattleStore.getState().putBattle(battle);
          spawnedWindow = windowStart;
          snapshot = battle;
          changed = true;
          const stake = battle.costPerPlayer;
          useToastStore.getState().push(
            `House-funded battle is live · ${stake} WL seats · 4 slots · free to join.`,
            "success",
          );
        } else if (snapshot && spawnedWindow === windowStart) {
          const live = useBattleStore.getState().getBattle(snapshot.id);
          if (live) {
            if (live.status !== snapshot.status || live.payout !== snapshot.payout) {
              snapshot = live;
              changed = true;
            }
          } else {
            useBattleStore.getState().putBattle(snapshot);
          }
        }

        if (changed) set({ windowStart, spawnAt, spawnedWindow, bootstrapped, snapshot });
      },
    }),
    { name: "prism-vault-funded-battle" },
  ),
);

export function nextFundedSpawnAt(): number {
  const { spawnAt, windowStart, spawnedWindow } = useFundedBattleStore.getState();
  if (spawnedWindow === windowStart) return windowStart + FUNDED_WINDOW_MS;
  return spawnAt;
}

export function liveFundedBattleId(): string | null {
  const { snapshot, spawnedWindow, windowStart } = useFundedBattleStore.getState();
  if (!snapshot || spawnedWindow !== windowStart) return null;
  return snapshot.id || fundedBattleId(windowStart);
}
