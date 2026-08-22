import type { BattleCaseEntry } from "../store/battleStore";

const KEY = "prism-vault-battle-draft";

export interface BattleDraft {
  modeId: string;
  crazy: boolean;
  jackpot: boolean;
  goldSpin: boolean;
  terminal: boolean;
  shared: boolean;
  coinflip: boolean;
  fastSpin: boolean;
  cases: BattleCaseEntry[];
  fundedPct: number;
  isPrivate: boolean;
  creatorBorrowPct: number;
  prefillBots: number;
  creatorSeat?: number;
  botSeats?: number[];
}

export function saveBattleDraft(draft: BattleDraft): void {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function consumeBattleDraft(): BattleDraft | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    const parsed = JSON.parse(raw) as BattleDraft;
    return { ...parsed, coinflip: Boolean(parsed.coinflip) };
  } catch {
    return null;
  }
}
