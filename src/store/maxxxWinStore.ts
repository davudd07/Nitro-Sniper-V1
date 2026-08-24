import { create } from "zustand";

interface MaxxxWinState {
  nonce: number;
  fire: () => void;
}

export const useMaxxxWinStore = create<MaxxxWinState>((set) => ({
  nonce: 0,
  fire: () => set((s) => ({ nonce: s.nonce + 1 })),
}));
