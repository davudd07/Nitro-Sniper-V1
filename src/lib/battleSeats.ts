import { BATTLE_MODES, PLAYER_COLORS, totalPlayers, type BattleMode } from "../data/battleModes";
import { BOT_NAMES } from "../data/botNames";
import type { BattleConfig, BattleJoinIntent, BattleRosterSeat } from "../store/battleStore";

function botNameFor(battleId: string, slot: number): string {
  return BOT_NAMES[(slot + battleId.length) % BOT_NAMES.length];
}

/** Explicit bot seats. An empty array is treated as unspecified (use prefillBots). */
export function explicitBotSeats(b: BattleConfig): Set<number> | null {
  if (b.botSeats && b.botSeats.length > 0) return new Set(b.botSeats);
  return null;
}

function hydrateRoster(
  seats: BattleRosterSeat[],
  spectating: boolean,
  source: BattleConfig["source"],
): BattleRosterSeat[] {
  return seats.map((s) => {
    if (spectating && s.kind === "you") {
      return { ...s, kind: "player" as const, name: s.name && s.name !== "You" ? s.name : "Host" };
    }
    if (!spectating && source === "you" && s.kind === "you") {
      return { ...s, name: "You" };
    }
    return s;
  });
}

/** Seats that must stay filled once a round is in progress or already finished. */
export function shouldFillEmptySeats(b: BattleConfig, replaying: boolean): boolean {
  return replaying || b.status === "finished" || b.status === "active";
}

export function buildBattleRoster(
  battle: BattleConfig,
  mode: BattleMode,
  opts: { spectating: boolean; joinSeat?: number; replaying?: boolean },
): BattleRosterSeat[] {
  const fillEmpties = shouldFillEmptySeats(battle, Boolean(opts.replaying));

  if (battle.replay?.seats?.length) {
    return hydrateRoster(battle.replay.seats, opts.spectating, battle.source);
  }
  if (battle.roster?.length) {
    return hydrateRoster(battle.roster, opts.spectating, battle.source);
  }

  const creatorSeat = battle.source === "you" ? (battle.creatorSeat ?? 0) : 0;
  const youSeat = battle.source === "you" ? creatorSeat : (opts.joinSeat ?? 0);
  const bots = explicitBotSeats(battle);
  const players: BattleRosterSeat[] = [];
  let slot = 0;
  mode.teamSizes.forEach((size, teamIndex) => {
    for (let i = 0; i < size; i++) {
      const isYou = !opts.spectating && slot === youSeat;
      let kind: BattleRosterSeat["kind"];
      if (isYou) {
        kind = "you";
      } else if (bots) {
        kind = bots.has(slot) ? "bot" : "empty";
      } else if (battle.source === "you") {
        const total = totalPlayers(mode);
        const filled: number[] = [];
        for (let s = 0; filled.length < battle.prefillBots && s < total; s++) {
          if (s === creatorSeat) continue;
          filled.push(s);
        }
        kind = filled.includes(slot) ? "bot" : "empty";
      } else {
        kind = slot !== 0 && slot <= battle.prefillBots ? "bot" : "empty";
      }

      if (fillEmpties && kind === "empty") {
        kind = slot === 0 && battle.source !== "you" ? "player" : "bot";
      }

      players.push({
        slotIndex: slot,
        teamIndex,
        kind,
        name: isYou
          ? "You"
          : kind === "bot" || kind === "player"
            ? botNameFor(battle.id, slot)
            : "",
        color: PLAYER_COLORS[slot % PLAYER_COLORS.length],
      });
      slot++;
    }
  });
  return players;
}

/** Which seat indexes are taken in the lobby list (true = occupied). */
export function occupiedSeatFlags(b: BattleConfig, intent?: BattleJoinIntent): boolean[] {
  const mode = BATTLE_MODES.find((m) => m.id === b.modeId);
  const seats = mode ? totalPlayers(mode) : 0;
  const taken = Array.from({ length: seats }, () => false);
  if (seats === 0) return taken;
  if (b.status === "finished" || b.status === "active") return taken.map(() => true);

  if (b.roster?.length) {
    for (const seat of b.roster) {
      if (seat.kind !== "empty" && seat.kind !== "joining" && seat.slotIndex >= 0 && seat.slotIndex < seats) {
        taken[seat.slotIndex] = true;
      }
    }
  } else if (b.source === "you") {
    const you = b.creatorSeat ?? 0;
    if (you >= 0 && you < seats) taken[you] = true;
    const bots = explicitBotSeats(b);
    if (bots) {
      for (const slot of bots) {
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
  } else if (b.botSeats && b.botSeats.length > 0) {
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
