import { create } from "zustand";

/** Visible hold before the overlay starts fading. */
export const MAXXX_SHOW_MS = 2800;
/** Fade-out after the hold. Next spin waits for show + fade. */
export const MAXXX_FADE_MS = 600;
export const MAXXX_TOTAL_MS = MAXXX_SHOW_MS + MAXXX_FADE_MS;

interface MaxxxWinState {
  nonce: number;
  active: boolean;
  fire: () => void;
  clear: () => void;
}

export const useMaxxxWinStore = create<MaxxxWinState>((set) => ({
  nonce: 0,
  active: false,
  fire: () => set((s) => ({ nonce: s.nonce + 1, active: true })),
  clear: () => set({ active: false }),
}));

/** Resolves when no MAXXX overlay is playing (or the last one has finished). */
export function waitUntilMaxxxIdle(): Promise<void> {
  if (!useMaxxxWinStore.getState().active) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      unsub();
      window.clearTimeout(failSafe);
      resolve();
    };
    const unsub = useMaxxxWinStore.subscribe((state) => {
      if (!state.active) finish();
    });
    const failSafe = window.setTimeout(finish, MAXXX_TOTAL_MS + 400);
    if (!useMaxxxWinStore.getState().active) finish();
  });
}

/** Who should see the MAXXX WIN overlay after a pull. */
export function shouldCelebrateMaxxxWin(opts: {
  /** Undefined when the local user is only spectating. */
  yourTeamIndex: number | undefined;
  hitterTeamIndex: number | undefined;
}): boolean {
  if (opts.yourTeamIndex === undefined || opts.hitterTeamIndex === undefined) return false;
  return opts.yourTeamIndex === opts.hitterTeamIndex;
}
