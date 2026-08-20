import { persist } from "zustand/middleware";
import { create } from "zustand";
import { sound } from "../lib/sound";

export type DisplayCurrency = "shards" | "funcoins";

interface SettingsState {
  soundOn: boolean;
  leftNavOpen: boolean;
  chatOpen: boolean;
  displayCurrency: DisplayCurrency;
  toggleSound: () => void;
  toggleLeftNav: () => void;
  toggleChat: () => void;
  setLeftNav: (open: boolean) => void;
  setChat: (open: boolean) => void;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundOn: true,
      leftNavOpen: true,
      chatOpen: true,
      displayCurrency: "shards",
      toggleSound: () => {
        const next = !get().soundOn;
        sound.setMuted(!next);
        set({ soundOn: next });
      },
      toggleLeftNav: () => set((s) => ({ leftNavOpen: !s.leftNavOpen })),
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      setLeftNav: (open) => set({ leftNavOpen: open }),
      setChat: (open) => set({ chatOpen: open }),
      setDisplayCurrency: (currency) => set({ displayCurrency: currency }),
    }),
    {
      name: "prism-vault-settings",
      onRehydrateStorage: () => (state) => {
        if (state) sound.setMuted(!state.soundOn);
      },
    },
  ),
);
