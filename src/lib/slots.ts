/** Fun-spin slots. Stake and payout are Shards only — never World Locks. */

export const SLOT_CURRENCY = "shards" as const;

export const SLOT_DEFAULT_BET = 10;
export const SLOT_BET_PRESETS = [5, 10, 25, 50, 100] as const;

export type SlotGameId = "lockfruit" | "gemrush";

export type SlotSymbol = {
  id: string;
  label: string;
  mark: string;
  fill: string;
  ink: string;
  ring: string;
};

export type SlotDef = {
  id: SlotGameId;
  name: string;
  blurb: string;
  reels: 3 | 5;
  theme: "fruit" | "gem";
  symbols: readonly SlotSymbol[];
  weights: readonly number[];
  /** Left-to-right consecutive pays. Missing counts pay 0. */
  pays: Readonly<Record<string, Readonly<Record<number, number>>>>;
};

export type SlotLineWin = {
  symbol: string;
  count: number;
  multi: number;
};

export function pickWeightedIndex(float: number, weights: readonly number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  if (!(total > 0)) return 0;
  let x = Math.min(0.999999999, Math.max(0, float)) * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i]!;
    if (x < 0) return i;
  }
  return weights.length - 1;
}

export function evaluateLine(ids: readonly string[], pays: SlotDef["pays"]): SlotLineWin {
  if (ids.length === 0) return { symbol: "", count: 0, multi: 0 };
  const symbol = ids[0]!;
  let count = 1;
  for (let i = 1; i < ids.length; i++) {
    if (ids[i] === symbol) count += 1;
    else break;
  }
  const multi = pays[symbol]?.[count] ?? 0;
  return { symbol, count, multi };
}

export function slotPayout(stake: number, multi: number): number {
  if (!(stake > 0) || !(multi > 0)) return 0;
  return Math.round(stake * multi);
}

export function spinStops(floats: readonly number[], def: SlotDef): number[] {
  return Array.from({ length: def.reels }, (_, i) => pickWeightedIndex(floats[i] ?? 0, def.weights));
}

export function spinSymbols(stops: readonly number[], def: SlotDef): string[] {
  return stops.map((s) => def.symbols[s]?.id ?? def.symbols[0]!.id);
}

/** Exact RTP from independent weighted reels + left-to-right pays. */
export function slotRtp(def: SlotDef): number {
  const n = def.symbols.length;
  const reels = def.reels;
  const totalW = def.weights.reduce((s, w) => s + w, 0);
  if (!(totalW > 0) || n === 0) return 0;
  const p = def.weights.map((w) => w / totalW);
  let rtp = 0;
  const stops = new Array<number>(reels).fill(0);
  const walk = (reel: number) => {
    if (reel === reels) {
      let prob = 1;
      const ids: string[] = [];
      for (let i = 0; i < reels; i++) {
        const idx = stops[i]!;
        prob *= p[idx]!;
        ids.push(def.symbols[idx]!.id);
      }
      rtp += prob * evaluateLine(ids, def.pays).multi;
      return;
    }
    for (let i = 0; i < n; i++) {
      stops[reel] = i;
      walk(reel + 1);
    }
  };
  walk(0);
  return rtp;
}

export const LOCK_FRUIT_SYMBOLS: readonly SlotSymbol[] = [
  { id: "cherry", label: "Cherry", mark: "CH", fill: "#9f1239", ink: "#fecdd3", ring: "#fb7185" },
  { id: "lemon", label: "Lemon", mark: "LM", fill: "#a16207", ink: "#fef08a", ring: "#facc15" },
  { id: "orange", label: "Orange", mark: "OR", fill: "#9a3412", ink: "#fdba74", ring: "#fb923c" },
  { id: "grape", label: "Grape", mark: "GR", fill: "#6b21a8", ink: "#e9d5ff", ring: "#c084fc" },
  { id: "lock", label: "Lock", mark: "LK", fill: "#155e75", ink: "#a5f3fc", ring: "#22d3ee" },
  { id: "gem", label: "Gem", mark: "GM", fill: "#1e3a8a", ink: "#bfdbfe", ring: "#60a5fa" },
  { id: "shard", label: "Shard", mark: "SH", fill: "#831843", ink: "#fbcfe8", ring: "#f472b6" },
];

/** 3-reel fruit/lock. ~95% RTP, max 320×. */
export const LOCK_FRUIT: SlotDef = {
  id: "lockfruit",
  name: "Lock Fruit",
  blurb: "Classic 3-reel fruit + locks. Fun spins · Shards.",
  reels: 3,
  theme: "fruit",
  symbols: LOCK_FRUIT_SYMBOLS,
  weights: [6, 5, 4, 4, 3, 2, 1],
  pays: {
    cherry: { 2: 2, 3: 13 },
    lemon: { 2: 1, 3: 18 },
    orange: { 3: 26 },
    grape: { 3: 38 },
    lock: { 3: 85 },
    gem: { 3: 150 },
    shard: { 3: 320 },
  },
};

export const GEM_RUSH_SYMBOLS: readonly SlotSymbol[] = [
  { id: "pebble", label: "Pebble", mark: "PB", fill: "#334155", ink: "#cbd5e1", ring: "#64748b" },
  { id: "aqua", label: "Aqua", mark: "AQ", fill: "#155e75", ink: "#a5f3fc", ring: "#22d3ee" },
  { id: "violet", label: "Violet", mark: "VT", fill: "#5b21b6", ink: "#ddd6fe", ring: "#a78bfa" },
  { id: "ruby", label: "Ruby", mark: "RB", fill: "#9f1239", ink: "#fecdd3", ring: "#fb7185" },
  { id: "emerald", label: "Emerald", mark: "EM", fill: "#14532d", ink: "#bbf7d0", ring: "#34d399" },
  { id: "crown", label: "Crown", mark: "CR", fill: "#854d0e", ink: "#fde68a", ring: "#fbbf24" },
];

/** 5-reel gem line. ~94% RTP, max 2500×. */
export const GEM_RUSH: SlotDef = {
  id: "gemrush",
  name: "Gem Rush",
  blurb: "Five reels, one line, juicier hits. Fun spins · Shards.",
  reels: 5,
  theme: "gem",
  symbols: GEM_RUSH_SYMBOLS,
  weights: [9, 8, 6, 4, 3, 2],
  pays: {
    pebble: { 2: 1, 3: 6, 4: 16, 5: 50 },
    aqua: { 2: 1, 3: 8, 4: 25, 5: 90 },
    violet: { 3: 14, 4: 45, 5: 180 },
    ruby: { 3: 28, 4: 90, 5: 450 },
    emerald: { 3: 50, 4: 160, 5: 1000 },
    crown: { 3: 90, 4: 400, 5: 2500 },
  },
};

export const SLOT_GAMES: Record<SlotGameId, SlotDef> = {
  lockfruit: LOCK_FRUIT,
  gemrush: GEM_RUSH,
};

export const LOCK_FRUIT_RTP = slotRtp(LOCK_FRUIT);
export const GEM_RUSH_RTP = slotRtp(GEM_RUSH);

export function payRows(def: SlotDef): { symbol: SlotSymbol; counts: { count: number; multi: number }[] }[] {
  return def.symbols.map((symbol) => {
    const table = def.pays[symbol.id] ?? {};
    const counts = Object.keys(table)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n) && (table[n] ?? 0) > 0)
      .sort((a, b) => a - b)
      .map((count) => ({ count, multi: table[count]! }));
    return { symbol, counts };
  });
}

export function symbolById(def: SlotDef, id: string): SlotSymbol | undefined {
  return def.symbols.find((s) => s.id === id);
}
