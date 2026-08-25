import { persist } from "zustand/middleware";
import { create } from "zustand";
import { sound } from "../lib/sound";
import { isLockUnit, type HeaderWallet, type LockUnit } from "../lib/money";

interface SettingsState {
  soundOn: boolean;
  leftNavOpen: boolean;
  chatOpen: boolean;
  /** Display unit for the play-money World Lock ledger. Does not change stored balances. */
  lockUnit: LockUnit;
  /** Header shows lock balance or the Shards (ex–Fun Coins) wallet. */
  headerWallet: HeaderWallet;
  /** Show last-roll diamonds on the Dice slider. */
  diceRollMarks: boolean;
  toggleSound: () => void;
  toggleLeftNav: () => void;
  toggleChat: () => void;
  setLeftNav: (open: boolean) => void;
  setChat: (open: boolean) => void;
  setLockUnit: (unit: LockUnit) => void;
  setHeaderWallet: (wallet: HeaderWallet) => void;
  setDiceRollMarks: (on: boolean) => void;
}

type PersistedSettings = Partial<SettingsState> & { displayCurrency?: string };

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundOn: true,
      leftNavOpen: true,
      chatOpen: true,
      lockUnit: "wl",
      headerWallet: "locks",
      diceRollMarks: true,
      toggleSound: () => {
        const next = !get().soundOn;
        sound.setMuted(!next);
        set({ soundOn: next });
      },
      toggleLeftNav: () => set((s) => ({ leftNavOpen: !s.leftNavOpen })),
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      setLeftNav: (open) => set({ leftNavOpen: open }),
      setChat: (open) => set({ chatOpen: open }),
      setLockUnit: (unit) => set({ lockUnit: unit, headerWallet: "locks" }),
      setHeaderWallet: (wallet) => set({ headerWallet: wallet }),
      setDiceRollMarks: (on) => set({ diceRollMarks: on }),
    }),
    {
      name: "prism-vault-settings",
      version: 2,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as PersistedSettings;
        if (version >= 2) {
          return {
            ...p,
            lockUnit: isLockUnit(p.lockUnit) ? p.lockUnit : "wl",
            headerWallet: p.headerWallet === "shards" ? "shards" : "locks",
            diceRollMarks: p.diceRollMarks !== false,
          };
        }
        return {
          ...p,
          lockUnit: "wl" as LockUnit,
          headerWallet: (p.displayCurrency === "funcoins" ? "shards" : "locks") as HeaderWallet,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) sound.setMuted(!state.soundOn);
      },
    },
  ),
);
