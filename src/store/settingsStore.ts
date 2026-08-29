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
  /** Left-nav Games group. Open (arrow down) by default. */
  gamesNavOpen: boolean;
  toggleSound: () => void;
  toggleLeftNav: () => void;
  toggleChat: () => void;
  toggleGamesNav: () => void;
  setLeftNav: (open: boolean) => void;
  setChat: (open: boolean) => void;
  setGamesNavOpen: (open: boolean) => void;
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
      gamesNavOpen: true,
      toggleSound: () => {
        const next = !get().soundOn;
        sound.setMuted(!next);
        set({ soundOn: next });
      },
      toggleLeftNav: () => set((s) => ({ leftNavOpen: !s.leftNavOpen })),
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      toggleGamesNav: () => set((s) => ({ gamesNavOpen: !(s.gamesNavOpen ?? true) })),
      setLeftNav: (open) => set({ leftNavOpen: open }),
      setChat: (open) => set({ chatOpen: open }),
      setGamesNavOpen: (open) => set({ gamesNavOpen: open }),
      setLockUnit: (unit) => set({ lockUnit: unit, headerWallet: "locks" }),
      setHeaderWallet: (wallet) => set({ headerWallet: wallet }),
      setDiceRollMarks: (on) => set({ diceRollMarks: on }),
    }),
    {
      name: "prism-vault-settings",
      version: 3,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as PersistedSettings;
        const next =
          version >= 2
            ? {
                ...p,
                lockUnit: isLockUnit(p.lockUnit) ? p.lockUnit : "wl",
                headerWallet: p.headerWallet === "shards" ? "shards" : "locks",
                diceRollMarks: p.diceRollMarks !== false,
              }
            : {
                ...p,
                lockUnit: "wl" as LockUnit,
                headerWallet: (p.displayCurrency === "funcoins" ? "shards" : "locks") as HeaderWallet,
              };
        return {
          ...next,
          gamesNavOpen: true,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          sound.setMuted(!state.soundOn);
          state.gamesNavOpen = true;
        }
      },
    },
  ),
);
