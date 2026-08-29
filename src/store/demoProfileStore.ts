import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_DEMO_NAME = "Vaultbound";

interface DemoProfileState {
  displayName: string;
  /** Hide this username in games/live bets/cases. Chat still shows the real name. */
  anonymous: boolean;
  setDisplayName: (name: string) => void;
  setAnonymous: (anonymous: boolean) => void;
}

export const useDemoProfileStore = create<DemoProfileState>()(
  persist(
    (set) => ({
      displayName: DEFAULT_DEMO_NAME,
      anonymous: false,
      setDisplayName: (name) => {
        const trimmed = name.trim().slice(0, 24);
        set({ displayName: trimmed || DEFAULT_DEMO_NAME });
      },
      setAnonymous: (anonymous) => set({ anonymous }),
    }),
    { name: "prism-vault-demo-profile" },
  ),
);
