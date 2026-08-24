export const CHEST_ASPECT = 560 / 602;

/** Open cavity, as fractions of the chest art box. */
export const CHEST_INTERIOR = { x: 0.3, y: 0.36, w: 0.46, h: 0.22 };

export const CHEST_MAX_STICKERS = 8;

export interface ChestSticker {
  id: string;
  itemId: string;
  /** Center X as % of the chest art (0–100). */
  x: number;
  /** Center Y as % of the chest art (0–100). */
  y: number;
  scale: number;
  rotate: number;
}

type PileSlot = { x: number; y: number; scale: number; rotate: number };

/**
 * Items sit around the open lid / shoulders — close to the chest, not a single
 * blob on the lid and not floating out at the card edges.
 */
const PILE: PileSlot[] = [
  { x: 50, y: 36, scale: 1.02, rotate: -8 },
  { x: 36, y: 42, scale: 0.94, rotate: 14 },
  { x: 64, y: 40, scale: 0.96, rotate: -16 },
  { x: 28, y: 52, scale: 0.82, rotate: 10 },
  { x: 72, y: 50, scale: 0.84, rotate: -12 },
  { x: 44, y: 50, scale: 0.78, rotate: 6 },
  { x: 58, y: 54, scale: 0.76, rotate: -6 },
  { x: 50, y: 46, scale: 0.72, rotate: 4 },
];

/** Tighter halo for tiny lobby / picker thumbs so gems stay on the chest. */
const PILE_COMPACT: PileSlot[] = [
  { x: 50, y: 38, scale: 1.0, rotate: -8 },
  { x: 34, y: 44, scale: 0.92, rotate: 12 },
  { x: 66, y: 42, scale: 0.94, rotate: -14 },
  { x: 26, y: 54, scale: 0.84, rotate: 8 },
  { x: 74, y: 52, scale: 0.86, rotate: -10 },
  { x: 42, y: 50, scale: 0.8, rotate: 6 },
  { x: 58, y: 54, scale: 0.78, rotate: -5 },
  { x: 50, y: 47, scale: 0.74, rotate: 3 },
];

/** Keep item ids, restack onto the compact halo (list thumbs only). */
export function compactPileStickers(stickers: ChestSticker[]): ChestSticker[] {
  return stickers.map((sticker, i) => {
    const slot = PILE_COMPACT[i % PILE_COMPACT.length]!;
    return {
      ...sticker,
      x: slot.x,
      y: slot.y,
      scale: slot.scale,
      rotate: slot.rotate,
    };
  });
}

export const OFFICIAL_CHEST_COLORS: Record<string, string> = {
  pocket: "#94a3b8",
  starter: "#64748b",
  vault: "#0f766e",
  chaos: "#ea580c",
  prime: "#ca8a04",
  steady: "#0e7490",
  elite: "#7c3aed",
  apex: "#e11d48",
  whale: "#155e75",
};

export function pileStickers(itemIds: string[]): ChestSticker[] {
  const unique: string[] = [];
  for (const id of itemIds) {
    if (id && !unique.includes(id)) unique.push(id);
    if (unique.length >= CHEST_MAX_STICKERS) break;
  }
  return unique.map((itemId, i) => {
    const slot = PILE[i % PILE.length]!;
    return {
      id: `sticker-${i}-${itemId}`,
      itemId,
      x: slot.x,
      y: slot.y,
      scale: slot.scale,
      rotate: slot.rotate,
    };
  });
}

function wrapAngle(deg: number): number {
  const x = ((((deg + 180) % 360) + 360) % 360) - 180;
  return x === -180 ? 180 : x;
}

export function clampSticker(s: ChestSticker): ChestSticker {
  return {
    ...s,
    x: Math.min(82, Math.max(18, s.x)),
    y: Math.min(72, Math.max(28, s.y)),
    scale: Math.min(2.2, Math.max(0.4, s.scale)),
    rotate: wrapAngle(s.rotate),
  };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return { h: 40, s: 70, l: 45 };
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;
  return { h: hue * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lit = Math.min(100, Math.max(0, l)) / 100;
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * lit - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lit - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function gradientFromChestColor(hex: string): { from: string; to: string } {
  const { h, s, l } = hexToHsl(hex);
  return {
    from: hslToHex(h, Math.min(80, s + 4), Math.min(58, l + 10)),
    to: hslToHex(h, Math.min(85, s + 8), Math.max(8, l - 22)),
  };
}

export function normalizeHex(raw: string, fallback = "#ca8a04"): string {
  const m = raw.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return fallback;
  return `#${m[1]!.toLowerCase()}`;
}
