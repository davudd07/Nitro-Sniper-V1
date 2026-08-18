import { create } from "zustand";
import { createServerSeed, randomSeed, rollFloats, sha256Hex } from "../lib/provablyFair";

interface RevealedRound {
  nonce: number;
  serverSeed: string;
  clientSeed: string;
  rolls: number[];
}

interface FairnessState {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  history: RevealedRound[];
  ready: boolean;
  init: () => Promise<void>;
  setClientSeed: (seed: string) => void;
  rotateServerSeed: () => Promise<void>;
  /** Roll `count` floats for the current round, then reveal + advance nonce. */
  play: (count: number) => Promise<number[]>;
}

export const useFairnessStore = create<FairnessState>((set, get) => ({
  serverSeed: "",
  serverSeedHash: "",
  clientSeed: randomSeed(8),
  nonce: 0,
  history: [],
  ready: false,
  init: async () => {
    if (get().ready) return;
    const { serverSeed, serverSeedHash } = await createServerSeed();
    set({ serverSeed, serverSeedHash, ready: true });
  },
  setClientSeed: (seed) => set({ clientSeed: seed || randomSeed(8) }),
  rotateServerSeed: async () => {
    const { serverSeed } = await createServerSeed();
    const serverSeedHash = await sha256Hex(serverSeed);
    set({ serverSeed, serverSeedHash, nonce: 0, history: [] });
  },
  play: async (count) => {
    const { serverSeed, clientSeed, nonce } = get();
    await get().init();
    const seed = get().serverSeed || serverSeed;
    const rolls = await rollFloats(seed, clientSeed, nonce, count);
    set((s) => ({
      nonce: s.nonce + 1,
      history: [{ nonce, serverSeed: seed, clientSeed, rolls }, ...s.history].slice(0, 25),
    }));
    return rolls;
  },
}));
