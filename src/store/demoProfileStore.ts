import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_DEMO_NAME = "Vaultbound";

interface DemoProfileState {
  displayName: string;
  setDisplayName: (name: string) => void;
}

export const useDemoProfileStore = create<DemoProfileState>()(
  persist(
    (set) => ({
      displayName: DEFAULT_DEMO_NAME,
      setDisplayName: (name) => {
        const trimmed = name.trim().slice(0, 24);
        set({ displayName: trimmed || DEFAULT_DEMO_NAME });
      },
    }),
    { name: "prism-vault-demo-profile" },
  ),
);
