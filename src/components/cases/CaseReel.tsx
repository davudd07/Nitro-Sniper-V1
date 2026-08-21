import { memo, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { CaseOddsEntry } from "../../data/cases";
import type { CaseItem } from "../../data/items";
import { GOLD_INDICATOR } from "../../data/goldItem";
import { ItemIcon } from "../ui/ItemIcon";
import { RARITIES } from "../../data/rarities";
import { easeOutQuart } from "../../lib/easing";
import { formatCredits } from "../../lib/format";
import { sound } from "../../lib/sound";

// Travel distance stays long (same land index) so the spin still flies past a
// full column of items. Trim only the unused tail below the landing window.
const REEL_LENGTH = 64;
const LAND_INDEX = 58;

// Shared tick clock so 2–6 battle lanes don't each spawn Web Audio nodes
// on every item crossing (that stacks into audible + main-thread jank).
let lastSharedTickAt = 0;
function playSpinTick(speed: number) {
  const now = performance.now();
  if (now - lastSharedTickAt < 32) return;
  lastSharedTickAt = now;
  sound.tick(speed);
}

type Orientation = "horizontal" | "vertical";

// Horizontal (solo case opens): items scroll left-to-right past a vertical
// pointer. Vertical (battles): items stack and scroll top-to-bottom past a
// horizontal pointer, so each player's column takes up less side-by-side
// width when many players are on screen at once.
const SIZE_CONFIG = {
  md: {
    horizontal: { itemSize: 140, boxSize: 140 },
    vertical: { itemSize: 92, boxSize: 276 },
    icon: "md" as const,
  },
  lg: {
    horizontal: { itemSize: 180, boxSize: 180 },
    vertical: { itemSize: 108, boxSize: 324 },
    icon: "lg" as const,
  },
};

function stripTransform(horizontal: boolean, px: number) {
  return horizontal ? `translate3d(${-px}px,0,0)` : `translate3d(0,${-px}px,0)`;
}

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
  requireGoldConfirm = false,
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
  /** Solo opens: wait for a "Spin for Gold" click instead of auto-spinning. */
  requireGoldConfirm?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "main" | "awaitingGold" | "charge" | "gold" | "done">("idle");
  const [strip, setStrip] = useState<CaseItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTickIndexRef = useRef(-1);
  const cfg = SIZE_CONFIG[size][orientation];
  const isHorizontal = orientation === "horizontal";
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goldSeedRef = useRef(0);
  const resultRef = useRef(result);
  resultRef.current = result;
  const spinning = phase === "main" || phase === "gold";

  function applyOffset(px: number) {
    offsetRef.current = px;
    const el = stripRef.current;
    if (el) el.style.transform = stripTransform(isHorizontal, px);
  }

  function runGoldSpin(seedBase: number, landed: CaseOddsEntry) {
    setPhase("charge");
    sound.goldCharge();
    onGoldTriggered?.();
    timeoutRef.current = setTimeout(() => {
      const goldRand = mulberry32(seedBase * 104729 + 3);
      const goldStrip = buildStrip(goldPool.length ? goldPool : [landed.item], landed.item, goldRand);
      setStrip(goldStrip);
      applyOffset(0);
      setPhase("gold");
      lastTickIndexRef.current = -1;
      animateTo(seedBase + 1, goldDuration, () => {
        setPhase("done");
        sound.goldLand();
        onLanded?.(landed.item, true);
      });
    }, 900);
  }

  function confirmGoldSpin() {
    const landed = resultRef.current;
    if (phase !== "awaitingGold" || !landed) return;
    runGoldSpin(goldSeedRef.current, landed);
  }

  // Fill the track with a preview strip so the reel always spans the container.
  useEffect(() => {
    if (spinToken !== 0 || strip.length > 0 || pool.length === 0) return;
    const rand = mulberry32(laneSeed + 17);
    const previewLen = isHorizontal ? 16 : 10;
    setStrip(Array.from({ length: previewLen }, () => pool[Math.floor(rand() * pool.length)]));
    applyOffset(0);
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
    applyOffset(0);
    setPhase("main");
    lastTickIndexRef.current = -1;
    animateTo(seedBase, duration, () => {
      if (goesGold) {
        goldSeedRef.current = seedBase;
        if (requireGoldConfirm) {
          setPhase("awaitingGold");
          sound.land();
        } else {
          runGoldSpin(seedBase, result);
        }
      } else {
        setPhase("done");
        sound.land();
        onLanded?.(result.item, false);
      }
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  function animateTo(seed: number, dur: number, done: () => void) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const stripEl = stripRef.current;
    // Measure once — reading clientWidth/Height every frame forces layout.
    const containerDim = isHorizontal
      ? (containerRef.current?.clientWidth || cfg.boxSize)
      : (containerRef.current?.clientHeight || cfg.boxSize);
    const jitter = (mulberry32(seed)() - 0.5) * cfg.itemSize * 0.55;
    const targetOffset = LAND_INDEX * cfg.itemSize + cfg.itemSize / 2 - containerDim / 2 + jitter;
    if (stripEl) stripEl.style.willChange = "transform";
    applyOffset(0);

    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = easeOutQuart(t);
      const pos = targetOffset * eased;
      applyOffset(pos);

      const currentIndex = Math.floor((pos + containerDim / 2) / cfg.itemSize);
      if (currentIndex !== lastTickIndexRef.current && t < 1) {
        lastTickIndexRef.current = currentIndex;
        playSpinTick(1 - t);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        applyOffset(targetOffset);
        if (stripEl) stripEl.style.willChange = "auto";
        done();
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const isGoldPhase = phase === "gold" || phase === "charge" || phase === "awaitingGold";

  return (
    <div className="min-w-0 w-full max-w-full">
      {playerLabel && <p className="mb-1.5 truncate text-xs font-medium text-slate-400">{playerLabel}</p>}
      <div
        ref={containerRef}
        className={clsx(
          "relative w-full max-w-full overflow-hidden border-2 bg-black/50 isolate",
          isGoldPhase ? "border-amber-400/70 shadow-[0_0_30px_rgba(251,191,36,0.35)]" : "border-white/20 shadow-[inset_0_0_18px_rgba(0,0,0,0.6)]",
        )}
        style={{ height: cfg.boxSize, transform: "translateZ(0)" }}
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
        {phase === "awaitingGold" && (
          <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={confirmGoldSpin}
              className="gold-pulse inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-400 px-4 py-2 text-xs font-bold uppercase tracking-widest text-bg-950 shadow-[0_8px_28px_rgba(251,191,36,0.55)] transition-transform hover:scale-105 active:scale-95"
            >
              Spin for Gold
            </button>
          </div>
        )}
        {phase === "charge" && (
          <div className="gold-pulse absolute inset-0 z-20 flex items-center justify-center bg-amber-400/10">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Gold Spin!</span>
          </div>
        )}
        <div
          ref={stripRef}
          className={clsx("pointer-events-none absolute flex", isHorizontal ? "inset-y-0 left-0 flex-row" : "inset-x-0 top-0 w-full flex-col")}
          style={{
            transform: stripTransform(isHorizontal, offsetRef.current),
            backfaceVisibility: "hidden",
            willChange: spinning ? "transform" : "auto",
          }}
        >
          {strip.map((item, i) => (
            <ReelSlot
              key={i}
              item={item}
              itemSize={cfg.itemSize}
              iconSize={SIZE_CONFIG[size].icon}
              orientation={orientation}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const ReelSlot = memo(function ReelSlot({
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
  const r = RARITIES[item.rarity];
  const isIndicator = item.id === GOLD_INDICATOR.id;

  if (orientation === "horizontal") {
    return (
      <div
        className="relative h-full shrink-0"
        style={{
          width: itemSize,
          contain: "layout paint",
        }}
      >
        <div
          className={clsx("absolute inset-0 flex flex-col items-center justify-center gap-0.5", isIndicator && "gold-pulse")}
          style={{
            background: `linear-gradient(165deg, ${r.from}66, ${r.to})`,
            boxShadow: isIndicator ? "0 0 22px rgba(251,191,36,0.7)" : undefined,
            borderRight: `2px solid ${r.ring}`,
          }}
        >
          <ItemIcon icon={item.icon} rarity={item.rarity} size={iconSize} className="!rounded-none" lite />
          <span className="max-w-[92%] truncate px-0.5 text-[10px] font-bold" style={{ color: isIndicator ? "#fbbf24" : r.text }}>
            {item.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full shrink-0"
      style={{
        height: itemSize,
        contain: "layout paint",
      }}
    >
      <div
        className={clsx("absolute inset-0 flex items-center gap-2.5 px-2", isIndicator && "gold-pulse")}
        style={{
          background: `linear-gradient(90deg, ${r.from}55, ${r.to}cc)`,
          boxShadow: isIndicator ? "0 0 22px rgba(251,191,36,0.7)" : undefined,
          borderBottom: `2px solid ${r.ring}`,
        }}
      >
        <ItemIcon icon={item.icon} rarity={item.rarity} size={iconSize} className="!rounded-none shrink-0" lite />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold" style={{ color: isIndicator ? "#fbbf24" : r.text }}>
            {item.name}
          </p>
          {!isIndicator && <p className="text-[11px] text-slate-300">{formatCredits(item.value)} SH</p>}
        </div>
      </div>
    </div>
  );
});
