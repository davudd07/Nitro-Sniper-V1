export const CASE_TICKET_COUNT = 1_000_000;
/** Top 1% of the million-ticket pool (990,000–1,000,000). */
export const RARE_TICKET_START = 990_000;

export interface TicketBand {
  tickets: number;
  ticketStart: number;
  ticketEnd: number;
}

export interface TicketLootRef {
  id: string;
  value: number;
}

/** Dirt, fireworks, and 0–1 WL placeholders — never Gold Spin prizes. */
export function isFillerLoot(item: TicketLootRef | undefined | null): boolean {
  if (!item) return false;
  if (item.id === "dirt" || item.id === "firework") return true;
  return item.value <= 1;
}

/** Map a fair float in [0, 1) onto tickets 1…1,000,000. */
export function ticketFromRoll(roll: number): number {
  if (!Number.isFinite(roll) || roll <= 0) return 1;
  if (roll >= 1) return CASE_TICKET_COUNT;
  return Math.min(CASE_TICKET_COUNT, Math.floor(roll * CASE_TICKET_COUNT) + 1);
}

/** Largest-remainder so ticket counts sum exactly to 1,000,000. */
export function allocateTickets(probabilities: number[], total = CASE_TICKET_COUNT): number[] {
  const n = probabilities.length;
  if (n === 0) return [];
  const raw = probabilities.map((p) => Math.max(0, p) * total);
  const counts = raw.map((x) => Math.floor(x + 1e-12));
  let used = counts.reduce((s, v) => s + v, 0);
  let leftover = total - used;
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x + 1e-12) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < leftover; k++) counts[order[k % n]!.i]++;
  for (let i = 0; i < n; i++) {
    if (probabilities[i]! > 0 && counts[i] === 0) {
      const donor = counts
        .map((t, j) => ({ j, t }))
        .filter((x) => x.t > 1)
        .sort((a, b) => b.t - a.t)[0];
      if (donor) {
        counts[donor.j]--;
        counts[i]++;
      }
    }
  }
  return counts;
}

/**
 * Highest-value *prizes* sit at the top of the ticket list, so the top 1% of
 * outcomes occupy tickets 990,000–1,000,000 (Gold Spin). Junk filler always
 * occupies the low tickets — even if a case accidentally makes dirt rare —
 * so Gold Spin never pays Dirt / Firework / 0-WL placeholders.
 * Value beats rarity: a more expensive item is Gold Spin even when a cheaper
 * chase is less likely (Farm Cache Angel Wings vs Floating Leaf).
 */
export function stampTicketRanges<T extends { probability: number; item?: TicketLootRef }>(
  entries: T[],
): (T & TicketBand & { goldTier: boolean })[] {
  const tickets = allocateTickets(entries.map((e) => e.probability));
  const ranked = entries
    .map((entry, index) => ({ entry, index, tickets: tickets[index] ?? 0 }))
    .sort((a, b) => {
      const fill = Number(isFillerLoot(a.entry.item)) - Number(isFillerLoot(b.entry.item));
      if (fill !== 0) return fill;
      const va = a.entry.item?.value ?? 0;
      const vb = b.entry.item?.value ?? 0;
      if (vb !== va) return vb - va;
      return a.entry.probability - b.entry.probability || b.tickets - a.tickets;
    });
  let cursor = CASE_TICKET_COUNT;
  const byIndex = new Map<number, TicketBand & { goldTier: boolean }>();
  for (const row of ranked) {
    const count = Math.max(0, row.tickets);
    const ticketEnd = count > 0 ? cursor : 0;
    const ticketStart = count > 0 ? cursor - count + 1 : 0;
    if (count > 0) cursor = ticketStart - 1;
    byIndex.set(row.index, {
      tickets: count,
      ticketStart,
      ticketEnd,
      goldTier: count > 0 && ticketEnd >= RARE_TICKET_START && !isFillerLoot(row.entry.item),
    });
  }
  return entries.map((entry, i) => ({
    ...entry,
    ...(byIndex.get(i) ?? { tickets: 0, ticketStart: 0, ticketEnd: 0, goldTier: false }),
  }));
}

export function formatTicketRange(start: number, end: number): string {
  const fmt = (n: number) => n.toLocaleString("en-US");
  if (!(start > 0) || !(end > 0)) return "—";
  if (start === end) return fmt(start);
  return `${fmt(start)}–${fmt(end)}`;
}
