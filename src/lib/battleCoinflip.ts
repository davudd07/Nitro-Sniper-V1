import type { JackpotTicket } from "../components/battles/JackpotWheel";

export interface CoinflipSeat {
  slotIndex: number;
  teamIndex: number;
  kind: string;
  name: string;
  color: string;
}

/** Buy-in pot for a coinflip battle — cases set the seat cost, pulls are not used. */
export function coinflipPot(costPerPlayer: number, seats: number): number {
  return Math.max(0, costPerPlayer) * Math.max(0, seats);
}

/**
 * Equal-odds tickets: one representative per team (FFA = one ticket per player).
 * Prefer the local player when they sit on that team so the strip features "You".
 */
export function coinflipTicketsFor(players: CoinflipSeat[]): JackpotTicket[] {
  const groups = new Map<number, CoinflipSeat[]>();
  for (const p of players) {
    const list = groups.get(p.teamIndex);
    if (list) list.push(p);
    else groups.set(p.teamIndex, [p]);
  }
  const teams = [...groups.keys()].sort((a, b) => a - b);
  const weight = teams.length > 0 ? 1 / teams.length : 1;
  return teams.map((teamIdx) => {
    const members = groups.get(teamIdx) ?? [];
    const sorted = [...members].sort((a, b) => a.slotIndex - b.slotIndex);
    const rep = sorted.find((p) => p.kind === "you") ?? sorted[0];
    return {
      playerId: String(rep.slotIndex),
      name: rep.kind === "you" ? "You" : rep.name || `Player ${rep.slotIndex + 1}`,
      color: rep.color,
      weight,
    };
  });
}

export function pickWeightedTicketIndex(tickets: { weight: number }[], roll: number): number {
  let acc = 0;
  let winnerIdx = Math.max(0, tickets.length - 1);
  for (let i = 0; i < tickets.length; i++) {
    acc += tickets[i].weight;
    if (roll < acc) {
      winnerIdx = i;
      break;
    }
  }
  return winnerIdx;
}
