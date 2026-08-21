import { BATTLE_MODES, totalPlayers } from "../data/battleModes";
import type { BattleConfig, BattleJoinIntent } from "../store/battleStore";

/** Which seat indexes are taken in the lobby list (true = occupied). */
export function occupiedSeatFlags(b: BattleConfig, intent?: BattleJoinIntent): boolean[] {
  const mode = BATTLE_MODES.find((m) => m.id === b.modeId);
  const seats = mode ? totalPlayers(mode) : 0;
  const taken = Array.from({ length: seats }, () => false);
  if (seats === 0) return taken;
  if (b.status === "finished" || b.status === "active") return taken.map(() => true);

  if (b.source === "you") {
    const you = b.creatorSeat ?? 0;
    if (you >= 0 && you < seats) taken[you] = true;
    if (b.botSeats?.length) {
      for (const slot of b.botSeats) {
        if (slot >= 0 && slot < seats) taken[slot] = true;
      }
    } else {
      let n = 0;
      for (let i = 0; i < seats && n < b.prefillBots; i++) {
        if (i === you) continue;
        taken[i] = true;
        n += 1;
      }
    }
  } else if (b.botSeats?.length) {
    for (const slot of b.botSeats) {
      if (slot >= 0 && slot < seats) taken[slot] = true;
    }
  } else {
    for (let slot = 0; slot < seats; slot++) {
      if (slot !== 0 && slot <= b.prefillBots) taken[slot] = true;
    }
  }

  const joinSeat = intent?.seat;
  if (typeof joinSeat === "number" && joinSeat >= 0 && joinSeat < seats) taken[joinSeat] = true;
  return taken;
}

export function occupiedCount(flags: boolean[]): { filled: number; seats: number } {
  return { filled: flags.filter(Boolean).length, seats: flags.length };
}

/** First open seat index, or 0 if the room is full. */
export function firstEmptySeat(flags: boolean[]): number {
  const idx = flags.findIndex((taken) => !taken);
  return idx < 0 ? 0 : idx;
}
