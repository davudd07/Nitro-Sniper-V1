import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sound } from "../lib/sound";

interface SettingsState {
  soundOn: boolean;
  toggleSound: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundOn: true,
      toggleSound: () => {
        const next = !get().soundOn;
        sound.setMuted(!next);
        set({ soundOn: next });
      },
    }),
    {
      name: "prism-vault-settings",
      onRehydrateStorage: () => (state) => {
        if (state) sound.setMuted(!state.soundOn);
      },
    },
  ),
);
