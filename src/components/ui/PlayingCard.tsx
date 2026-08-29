import { motion } from "framer-motion";
import type { Card, Suit } from "../../lib/blackjack";

const RED: Suit[] = ["♥", "♦"];

/** 5×7 pixel ranks — same chunky Growtopia lettering as the lobby tiles. */
const GLYPH: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00110", "01010", "10010", "11111", "00010", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
};

const SUIT_SM: Record<Suit, string[]> = {
  "♠": ["00100", "01110", "11111", "11111", "01110", "00100", "01110"],
  "♥": ["01010", "11111", "11111", "11111", "01110", "00100", "00000"],
  "♦": ["00100", "01110", "11111", "01110", "00100", "00000", "00000"],
  "♣": ["01110", "01110", "11111", "11111", "00100", "01110", "00000"],
};

const SUIT_LG: Record<Suit, string[]> = {
  "♠": [
    "0001000",
    "0011100",
    "0111110",
    "1111111",
    "1111111",
    "0111110",
    "0001000",
    "0011100",
    "0111110",
  ],
  "♥": [
    "0110110",
    "1111111",
    "1111111",
    "1111111",
    "0111110",
    "0011100",
    "0001000",
    "0000000",
    "0000000",
  ],
  "♦": [
    "0001000",
    "0011100",
    "0111110",
    "1111111",
    "0111110",
    "0011100",
    "0001000",
    "0000000",
    "0000000",
  ],
  "♣": [
    "0011100",
    "0111110",
    "0011100",
    "1111111",
    "1111111",
    "0011100",
    "0001000",
    "0011100",
    "0111110",
  ],
};

function Pixel({
  rows,
  x,
  y,
  s,
  fill,
}: {
  rows: string[];
  x: number;
  y: number;
  s: number;
  fill: string;
}) {
  const cells: { cx: number; cy: number }[] = [];
  rows.forEach((row, iy) => {
    for (let ix = 0; ix < row.length; ix++) {
      if (row[ix] === "1") cells.push({ cx: x + ix * s, cy: y + iy * s });
    }
  });
  return (
    <>
      {cells.map((c, i) => (
        <rect key={i} x={c.cx} y={c.cy} width={s} height={s} fill={fill} />
      ))}
    </>
  );
}

function RankMark({
  rank,
  suit,
  x,
  y,
  fill,
}: {
  rank: string;
  suit: Suit;
  x: number;
  y: number;
  fill: string;
}) {
  const chars = rank === "10" ? ["1", "0"] : [rank];
  const glyphW = 5;
  const gap = 1;
  const blockW = chars.length * glyphW + (chars.length - 1) * gap;
  const suitRows = SUIT_SM[suit];
  const suitW = suitRows[0]?.length ?? 5;
  return (
    <g>
      {chars.map((ch, i) => (
        <Pixel key={ch + i} rows={GLYPH[ch] ?? GLYPH.A!} x={x + i * (glyphW + gap)} y={y} s={1} fill={fill} />
      ))}
      <Pixel rows={suitRows} x={x + Math.max(0, Math.floor((blockW - suitW) / 2))} y={y + 8} s={1} fill={fill} />
    </g>
  );
}

/** Classic pip slots in a 51×72 card, origin top-left of the inner face. */
function pipSlots(rank: string): { x: number; y: number; flip?: boolean }[] {
  const cx = 25.5;
  const colL = 16;
  const colR = 35;
  const top = 16;
  const mid = 36;
  const bot = 56;
  const t2 = 24;
  const b2 = 48;
  switch (rank) {
    case "A":
    case "J":
    case "Q":
    case "K":
      return [{ x: cx, y: mid }];
    case "2":
      return [
        { x: cx, y: top },
        { x: cx, y: bot, flip: true },
      ];
    case "3":
      return [{ x: cx, y: top }, { x: cx, y: mid }, { x: cx, y: bot, flip: true }];
    case "4":
      return [
        { x: colL, y: top },
        { x: colR, y: top },
        { x: colL, y: bot, flip: true },
        { x: colR, y: bot, flip: true },
      ];
    case "5":
      return [
        { x: colL, y: top },
        { x: colR, y: top },
        { x: cx, y: mid },
        { x: colL, y: bot, flip: true },
        { x: colR, y: bot, flip: true },
      ];
    case "6":
      return [
        { x: colL, y: top },
        { x: colR, y: top },
        { x: colL, y: mid },
        { x: colR, y: mid },
        { x: colL, y: bot, flip: true },
        { x: colR, y: bot, flip: true },
      ];
    case "7":
      return [
        { x: colL, y: top },
        { x: colR, y: top },
        { x: cx, y: t2 },
        { x: colL, y: mid },
        { x: colR, y: mid },
        { x: colL, y: bot, flip: true },
        { x: colR, y: bot, flip: true },
      ];
    case "8":
      return [
        { x: colL, y: top },
        { x: colR, y: top },
        { x: colL, y: t2 },
        { x: colR, y: t2 },
        { x: colL, y: b2, flip: true },
        { x: colR, y: b2, flip: true },
        { x: colL, y: bot, flip: true },
        { x: colR, y: bot, flip: true },
      ];
    case "9":
      return [
        { x: colL, y: top },
        { x: colR, y: top },
        { x: colL, y: t2 },
        { x: colR, y: t2 },
        { x: cx, y: mid },
        { x: colL, y: b2, flip: true },
        { x: colR, y: b2, flip: true },
        { x: colL, y: bot, flip: true },
        { x: colR, y: bot, flip: true },
      ];
    case "10":
      return [
        { x: colL, y: top },
        { x: colR, y: top },
        { x: cx, y: 20 },
        { x: colL, y: t2 + 4 },
        { x: colR, y: t2 + 4 },
        { x: colL, y: b2 - 4, flip: true },
        { x: colR, y: b2 - 4, flip: true },
        { x: cx, y: 52, flip: true },
        { x: colL, y: bot, flip: true },
        { x: colR, y: bot, flip: true },
      ];
    default:
      return [{ x: cx, y: mid }];
  }
}

function Face({ card }: { card: Card }) {
  const red = RED.includes(card.suit);
  const fill = red ? "#e11d48" : "#111827";
  const lg = SUIT_LG[card.suit];
  const lgW = lg[0]?.length ?? 7;
  const lgH = lg.length;
  return (
    <svg viewBox="0 0 51 72" className="h-full w-full" shapeRendering="crispEdges" aria-hidden>
      <rect width="51" height="72" fill="#0a1212" />
      <rect x="2" y="2" width="47" height="68" fill="#f8fafc" />
      <rect x="3" y="3" width="45" height="66" fill="none" stroke="#d1d5db" strokeWidth="1" />
      <RankMark rank={card.rank} suit={card.suit} x={4} y={4} fill={fill} />
      <g transform="rotate(180 25.5 36)">
        <RankMark rank={card.rank} suit={card.suit} x={4} y={4} fill={fill} />
      </g>
      {pipSlots(card.rank).map((p, i) => {
        const px = p.x - lgW / 2;
        const py = p.y - lgH / 2;
        return (
          <g key={i} transform={p.flip ? `rotate(180 ${p.x} ${p.y})` : undefined}>
            <Pixel rows={lg} x={px} y={py} s={1} fill={fill} />
          </g>
        );
      })}
    </svg>
  );
}

function CardBack() {
  const cells: { x: number; y: number }[] = [];
  for (let y = 6; y < 66; y += 4) {
    for (let x = 6; x < 45; x += 4) {
      if ((x + y) % 8 === 2) cells.push({ x, y });
    }
  }
  return (
    <svg viewBox="0 0 51 72" className="h-full w-full" shapeRendering="crispEdges" aria-hidden>
      <rect width="51" height="72" fill="#041016" />
      <rect x="2" y="2" width="47" height="68" fill="#0b3a4a" />
      <rect x="4" y="4" width="43" height="64" fill="#083044" stroke="#4af1f1" strokeWidth="1" />
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width="2" height="2" fill="#2aa8a8" opacity="0.55" />
      ))}
      <rect x="16" y="26" width="19" height="20" fill="#042028" stroke="#4af1f1" strokeWidth="1" />
      <rect x="22" y="31" width="7" height="10" fill="#4af1f1" />
      <rect x="24" y="33" width="3" height="3" fill="#042028" />
    </svg>
  );
}

export function PlayingCard({ card, hidden = false, delay = 0 }: { card?: Card; hidden?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -24, rotate: -6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 20 }}
      className="relative h-[7.35rem] w-[5.25rem] shrink-0 sm:h-36 sm:w-[6.4rem]"
      style={{ perspective: 700 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: hidden ? 180 : 0 }}
        transition={{ duration: 0.45, delay: hidden ? 0 : delay }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[6px] shadow-[3px_3px_0_#050808]"
          style={{ backfaceVisibility: "hidden" }}
        >
          {card ? <Face card={card} /> : <CardBack />}
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-[6px] shadow-[3px_3px_0_#050808]"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <CardBack />
        </div>
      </motion.div>
    </motion.div>
  );
}
