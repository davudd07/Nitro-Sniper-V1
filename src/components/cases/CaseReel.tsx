import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { CaseOddsEntry } from "../../data/cases";
import type { CaseItem } from "../../data/items";
import { GOLD_INDICATOR } from "../../data/goldItem";
import { ItemIcon } from "../ui/ItemIcon";
import { RARITIES } from "../../data/rarities";
import { easeOutQuart } from "../../lib/easing";
import { formatCredits } from "../../lib/format";
import { sound } from "../../lib/sound";

const REEL_LENGTH = 70;
const LAND_INDEX = 58;

type Orientation = "horizontal" | "vertical";

// Horizontal (solo case opens): items scroll left-to-right past a vertical
// pointer. Vertical (battles): items stack and scroll top-to-bottom past a
// horizontal pointer, so each player's column takes up less side-by-side
// width when many players are on screen at once.
const SIZE_CONFIG = {
  md: {
    horizontal: { itemSize: 132, boxSize: 124 },
    vertical: { itemSize: 80, boxSize: 256 },
    icon: "md" as const,
  },
  lg: {
    horizontal: { itemSize: 172, boxSize: 148 },
    vertical: { itemSize: 96, boxSize: 304 },
    icon: "lg" as const,
  },
};

function buildStrip(pool: CaseItem[], landing: CaseItem, rand: () => number): CaseItem[] {
  const strip: CaseItem[] = [];
  for (let i = 0; i < REEL_LENGTH; i++) {
    if (i === LAND_INDEX) {
      strip.push(landing);
    } else {
      strip.push(pool[Math.floor(rand() * pool.length)]);
    }
  }
  return strip;
}

// A tiny deterministic PRNG so repeated renders of the same round look stable.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function CaseReel({
  pool,
  goldPool,
  result,
  spinToken,
  goldSpinEnabled,
  duration = 6800,
  goldDuration = 3800,
  laneSeed = 0,
  size = "md",
  orientation = "horizontal",
  onLanded,
  onGoldTriggered,
  playerLabel,
}: {
  pool: CaseItem[];
  goldPool: CaseItem[];
  result: CaseOddsEntry | null;
  spinToken: number;
  goldSpinEnabled: boolean;
  duration?: number;
  goldDuration?: number;
  laneSeed?: number;
  size?: "md" | "lg";
  orientation?: Orientation;
  onLanded?: (item: CaseItem, wasGold: boolean) => void;
  onGoldTriggered?: () => void;
  playerLabel?: string;
}) {
  const [phase, setPhase] = useState<"idle" | "main" | "charge" | "gold" | "done">("idle");
  const [offset, setOffset] = useState(0);
  const [strip, setStrip] = useState<CaseItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickIndexRef = useRef(-1);
  const cfg = SIZE_CONFIG[size][orientation];
  const isHorizontal = orientation === "horizontal";

  // Fill the track with a preview strip so the reel always spans the
  // container (idle "Waiting to spin" text made it look empty/cut off).
  useEffect(() => {
    if (spinToken !== 0 || strip.length > 0 || pool.length === 0) return;
    const rand = mulberry32(laneSeed + 17);
    const previewLen = isHorizontal ? 16 : 10;
    setStrip(Array.from({ length: previewLen }, () => pool[Math.floor(rand() * pool.length)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, spinToken, laneSeed]);

  useEffect(() => {
    if (!result || spinToken === 0) return;
    const seedBase = spinToken * 7919 + 13 + laneSeed * 97;
    const rand = mulberry32(seedBase);
    const goesGold = goldSpinEnabled && result.goldTier;
    const targetForMain = goesGold ? GOLD_INDICATOR : result.item;
    const mainStrip = buildStrip(pool, targetForMain, rand);
    setStrip(mainStrip);
    setOffset(0);
    setPhase("main");
    lastTickIndexRef.current = -1;
    animateTo(seedBase, duration, () => {
      if (goesGold) {
        setPhase("charge");
        sound.goldCharge();
        onGoldTriggered?.();
        setTimeout(() => {
          const goldRand = mulberry32(seedBase * 104729 + 3);
          const goldStrip = buildStrip(goldPool.length ? goldPool : [result.item], result.item, goldRand);
          setStrip(goldStrip);
          setOffset(0);
          setPhase("gold");
          lastTickIndexRef.current = -1;
          animateTo(seedBase + 1, goldDuration, () => {
            setPhase("done");
            sound.goldLand();
            onLanded?.(result.item, true);
          });
        }, 900);
      } else {
        setPhase("done");
        sound.land();
        onLanded?.(result.item, false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  function animateTo(seed: number, dur: number, done: () => void) {
    const containerDim = isHorizontal
      ? (containerRef.current?.clientWidth ?? cfg.boxSize)
      : (containerRef.current?.clientHeight ?? cfg.boxSize);
    const jitter = (mulberry32(seed)() - 0.5) * cfg.itemSize * 0.55;
    const targetOffset = LAND_INDEX * cfg.itemSize + cfg.itemSize / 2 - containerDim / 2 + jitter;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = easeOutQuart(t);
      const pos = targetOffset * eased;
      setOffset(pos);

      const currentIndex = Math.floor((pos + containerDim / 2) / cfg.itemSize);
      if (currentIndex !== lastTickIndexRef.current && t < 1) {
        lastTickIndexRef.current = currentIndex;
        sound.tick(1 - t);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setOffset(targetOffset);
        done();
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const isGoldPhase = phase === "gold" || phase === "charge";

  return (
    <div className="min-w-0 w-full max-w-full">
      {playerLabel && <p className="mb-1.5 truncate text-xs font-medium text-slate-400">{playerLabel}</p>}
      <div
        ref={containerRef}
        className={clsx(
          "relative w-full max-w-full overflow-hidden rounded-xl border-2 bg-black/50 shadow-[inset_0_0_18px_rgba(0,0,0,0.6)] transition-shadow",
          isGoldPhase ? "border-amber-400/70 shadow-[0_0_30px_rgba(251,191,36,0.35)]" : "border-white/20",
        )}
        style={{ height: cfg.boxSize }}
      >
        {isHorizontal ? (
          <>
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-[3px] -translate-x-1/2 bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black/85 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black/85 to-transparent" />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute left-0 top-1/2 z-10 h-[3px] w-full -translate-y-1/2 bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]" />
            <div className="pointer-events-none absolute -top-1 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rotate-45 bg-fuchsia-400" />
            <div className="pointer-events-none absolute -bottom-1 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rotate-45 bg-fuchsia-400" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-black/70 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-black/70 to-transparent" />
          </>
        )}
        {phase === "charge" && (
          <div className="gold-pulse absolute inset-0 z-20 flex items-center justify-center bg-amber-400/10 backdrop-blur-[1px]">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Gold Spin!</span>
          </div>
        )}
        <div
          className={clsx(
            "absolute flex",
            isHorizontal ? "left-0 top-1/2 -translate-y-1/2 flex-row" : "left-0 top-0 w-full flex-col",
          )}
          style={{ transform: isHorizontal ? `translate(${-offset}px, -50%)` : `translateY(${-offset}px)` }}
        >
          {strip.map((item, i) => (
            <ReelSlot key={i} item={item} itemSize={cfg.itemSize} iconSize={SIZE_CONFIG[size].icon} orientation={orientation} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReelSlot({
  item,
  itemSize,
  iconSize,
  orientation,
}: {
  item: CaseItem;
  itemSize: number;
  iconSize: "md" | "lg";
  orientation: Orientation;
}) {
  const isIndicator = item.id === GOLD_INDICATOR.id;
  const r = RARITIES[item.rarity];
  const goldGlow = isIndicator ? { boxShadow: "0 0 22px rgba(251,191,36,0.7)" } : undefined;

  if (orientation === "horizontal") {
    return (
      <div className="flex h-full shrink-0 flex-col items-center justify-center gap-1 overflow-hidden py-2" style={{ width: itemSize }}>
        <div className={clsx("rounded-lg", isIndicator && "gold-pulse")} style={goldGlow}>
          <ItemIcon icon={item.icon} rarity={item.rarity} size={iconSize} />
        </div>
        <span className="max-w-[85%] truncate text-[10px] font-medium" style={{ color: isIndicator ? "#fbbf24" : r.text }}>
          {item.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-full shrink-0 items-center gap-2.5 px-3" style={{ height: itemSize }}>
      <div className={clsx("shrink-0 rounded-lg", isIndicator && "gold-pulse")} style={goldGlow}>
        <ItemIcon icon={item.icon} rarity={item.rarity} size={iconSize} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" style={{ color: isIndicator ? "#fbbf24" : r.text }}>
          {item.name}
        </p>
        {!isIndicator && <p className="text-[11px] text-slate-500">{formatCredits(item.value)} SH</p>}
      </div>
    </div>
  );
}
