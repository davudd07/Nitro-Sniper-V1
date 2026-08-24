import { create } from "zustand";

interface MaxxxWinState {
  nonce: number;
  fire: () => void;
}

export const useMaxxxWinStore = create<MaxxxWinState>((set) => ({
  nonce: 0,
  fire: () => set((s) => ({ nonce: s.nonce + 1 })),
}));

/** Who should see the MAXXX WIN overlay after a pull. */
export function shouldCelebrateMaxxxWin(opts: {
  crazy: boolean;
  jackpot: boolean;
  /** Undefined when the local user is only spectating. */
  yourTeamIndex: number | undefined;
  hitterTeamIndex: number | undefined;
}): boolean {
  if (opts.crazy && !opts.jackpot) return false;
  if (opts.yourTeamIndex === undefined || opts.hitterTeamIndex === undefined) return false;
  return opts.yourTeamIndex === opts.hitterTeamIndex;
}
