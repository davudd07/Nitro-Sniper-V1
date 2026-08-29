import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BOT_NAMES } from "../data/botNames";
import { useEconomyStore } from "./economyStore";
import { appendBalanceLedger } from "./balanceLedgerStore";

export const LOCAL_PLAYER = "You";

export const MODERATION_PLAYERS = [LOCAL_PLAYER, ...BOT_NAMES] as const;
export type ModerationPlayer = (typeof MODERATION_PLAYERS)[number] | string;

export interface BotWallet {
  shards: number;
  funCoins: number;
  pendingRakeback: number;
  wagered: number;
}

export interface AdminLogEntry {
  at: number;
  action: string;
}

interface ModerationState {
  banned: string[];
  muted: string[];
  locked: string[];
  botWallets: Record<string, BotWallet>;
  log: AdminLogEntry[];
  isBanned: (name: string) => boolean;
  isMuted: (name: string) => boolean;
  isLocked: (name: string) => boolean;
  canChat: (name: string) => boolean;
  ban: (name: string) => void;
  unban: (name: string) => void;
  mute: (name: string) => void;
  unmute: (name: string) => void;
  lock: (name: string) => void;
  unlock: (name: string) => void;
  topUpShards: (name: string, amount: number) => void;
  grantFunCoins: (name: string, amount: number) => void;
  grantPendingRakeback: (name: string, amount: number) => void;
  resetPlayer: (name: string) => void;
  snapshot: (name: string) => {
    shards: number;
    funCoins: number;
    pendingRakeback: number;
    wagered: number;
    banned: boolean;
    muted: boolean;
    locked: boolean;
  };
}

function emptyWallet(): BotWallet {
  return { shards: 0, funCoins: 0, pendingRakeback: 0, wagered: 0 };
}

function note(get: () => ModerationState, set: (p: Partial<ModerationState>) => void, action: string) {
  const entry: AdminLogEntry = { at: Date.now(), action };
  set({ log: [entry, ...get().log].slice(0, 40) });
}

export const useModerationStore = create<ModerationState>()(
  persist(
    (set, get) => ({
      banned: [],
      muted: [],
      locked: [],
      botWallets: {},
      log: [],
      isBanned: (name) => get().banned.includes(name),
      isMuted: (name) => get().muted.includes(name),
      isLocked: (name) => get().locked.includes(name),
      canChat: (name) => {
        const s = get();
        return !s.banned.includes(name) && !s.muted.includes(name);
      },
      ban: (name) => {
        if (get().banned.includes(name)) return;
        set({ banned: [...get().banned, name] });
        note(get, set, `Banned ${name}`);
      },
      unban: (name) => {
        set({ banned: get().banned.filter((n) => n !== name) });
        note(get, set, `Unbanned ${name}`);
      },
      mute: (name) => {
        if (get().muted.includes(name)) return;
        set({ muted: [...get().muted, name] });
        note(get, set, `Muted ${name}`);
      },
      unmute: (name) => {
        set({ muted: get().muted.filter((n) => n !== name) });
        note(get, set, `Unmuted ${name}`);
      },
      lock: (name) => {
        if (get().locked.includes(name)) return;
        set({ locked: [...get().locked, name] });
        note(get, set, `Locked ${name}`);
      },
      unlock: (name) => {
        set({ locked: get().locked.filter((n) => n !== name) });
        note(get, set, `Unlocked ${name}`);
      },
      topUpShards: (name, amount) => {
        if (amount <= 0) return;
        if (name === LOCAL_PLAYER) {
          useEconomyStore.getState().credit(amount);
        } else {
          const wallets = { ...get().botWallets };
          const cur = wallets[name] ?? emptyWallet();
          wallets[name] = { ...cur, shards: cur.shards + amount };
          set({ botWallets: wallets });
        }
        appendBalanceLedger({
          name,
          kind: "grant",
          amount,
          currency: "wl",
          note: "Warden World Lock top-up",
          balanceAfter: name === LOCAL_PLAYER ? useEconomyStore.getState().balance : undefined,
        });
        note(get, set, `Topped up ${name} +${amount} WL`);
      },
      grantFunCoins: (name, amount) => {
        if (amount <= 0) return;
        if (name === LOCAL_PLAYER) {
          useEconomyStore.getState().creditFun(amount);
        } else {
          const wallets = { ...get().botWallets };
          const cur = wallets[name] ?? emptyWallet();
          wallets[name] = { ...cur, funCoins: cur.funCoins + amount };
          set({ botWallets: wallets });
        }
        appendBalanceLedger({
          name,
          kind: "grant",
          amount,
          currency: "shards",
          note: "Warden Shard grant",
        });
        note(get, set, `Granted ${name} +${amount} Shards`);
      },
      grantPendingRakeback: (name, amount) => {
        if (amount <= 0) return;
        if (name === LOCAL_PLAYER) {
          useEconomyStore.getState().grantPendingRakeback(amount);
        } else {
          const wallets = { ...get().botWallets };
          const cur = wallets[name] ?? emptyWallet();
          wallets[name] = { ...cur, pendingRakeback: cur.pendingRakeback + amount };
          set({ botWallets: wallets });
        }
        note(get, set, `Granted ${name} +${amount} pending rakeback`);
      },
      resetPlayer: (name) => {
        if (name === LOCAL_PLAYER) {
          useEconomyStore.getState().reset();
        } else {
          const wallets = { ...get().botWallets };
          wallets[name] = emptyWallet();
          set({ botWallets: wallets });
        }
        set({
          banned: get().banned.filter((n) => n !== name),
          muted: get().muted.filter((n) => n !== name),
          locked: get().locked.filter((n) => n !== name),
        });
        note(get, set, `Reset ${name}`);
      },
      snapshot: (name) => {
        const s = get();
        if (name === LOCAL_PLAYER) {
          const eco = useEconomyStore.getState();
          return {
            shards: eco.balance,
            funCoins: eco.funCoins,
            pendingRakeback: eco.pendingRakeback ?? 0,
            wagered: eco.totalWagered,
            banned: s.banned.includes(name),
            muted: s.muted.includes(name),
            locked: s.locked.includes(name),
          };
        }
        const w = s.botWallets[name] ?? emptyWallet();
        return {
          shards: w.shards,
          funCoins: w.funCoins,
          pendingRakeback: w.pendingRakeback,
          wagered: w.wagered,
          banned: s.banned.includes(name),
          muted: s.muted.includes(name),
          locked: s.locked.includes(name),
        };
      },
    }),
    {
      name: "prism-vault-moderation",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ModerationState>;
        return {
          ...current,
          ...p,
          locked: Array.isArray(p.locked) ? p.locked : [],
        };
      },
    },
  ),
);
