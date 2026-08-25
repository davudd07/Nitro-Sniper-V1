import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { CaseOddsEntry } from "../../data/cases";
import type { CaseItem } from "../../data/items";
import { MAXXX_WIN, isMaxxxWin, itemImageSrc } from "../../data/items";
import { GOLD_INDICATOR, isGoldIndicator } from "../../data/goldItem";
import { RARITIES } from "../../data/rarities";
import { EASE_IN_CUBIC_CSS, EASE_OUT_QUART_CSS, easeInCubic, easeOutQuart } from "../../lib/easing";
import { CashAmount } from "../ui/CurrencyIcon";
import { useSettingsStore } from "../../store/settingsStore";
import { sound } from "../../lib/sound";

// Travel distance stays long (same land index) so the spin still flies past a
// full column of items. Trim only the unused tail below the landing window.
const REEL_LENGTH = 64;
const LAND_INDEX = 58;

export type BattleReelSize = "sm" | "md" | "lg";

const ICON_PX: Record<BattleReelSize, number> = { sm: 40, md: 56, lg: 80 };

// Shared tick clock so 2–8 battle lanes don't each spawn Web Audio nodes
// on every item crossing (that stacks into audible + main-thread jank).
let lastSharedTickAt = 0;
function playSpinTick(speed: number) {
  const now = performance.now();
  if (now - lastSharedTickAt < 32) return;
  lastSharedTickAt = now;
  sound.tick(speed);
}

function preloadIcons(items: CaseItem[]) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.icon)) continue;
    seen.add(item.icon);
    const img = new Image();
    img.decoding = "async";
    img.src = itemImageSrc(item);
  }
}

type Orientation = "horizontal" | "vertical";

type PendingSpin = {
  seed: number;
  duration: number;
  onDone: () => void;
  /** Last-slot gold bait: ease onto it like a stop, then slip onto the land. */
  goldTease?: boolean;
};

// Horizontal (solo case opens): items scroll left-to-right past a vertical
// pointer. Vertical (battles): items stack and scroll top-to-bottom past a
// horizontal pointer, so each player's column takes up less side-by-side
// width when many players are on screen at once.
export const BATTLE_REEL_HEIGHT: Record<BattleReelSize, number> = { sm: 220, md: 276, lg: 324 };

const SIZE_CONFIG: Record<
  BattleReelSize,
  { horizontal: { itemSize: number; boxSize: number }; vertical: { itemSize: number; boxSize: number }; icon: BattleReelSize }
> = {
  sm: {
    horizontal: { itemSize: 112, boxSize: 112 },
    vertical: { itemSize: 72, boxSize: 220 },
    icon: "sm",
  },
  md: {
    horizontal: { itemSize: 140, boxSize: 140 },
    vertical: { itemSize: 92, boxSize: 276 },
    icon: "md",
  },
  lg: {
    horizontal: { itemSize: 180, boxSize: 180 },
    vertical: { itemSize: 108, boxSize: 324 },
    icon: "lg",
  },
};

/** Keep 2–4 player rooms large; shrink so 6–8 lanes still fit the stage. */
export function battleReelSize(playerCount: number): BattleReelSize {
  if (playerCount <= 4) return "lg";
  if (playerCount <= 6) return "md";
  return "sm";
}

function stripTransform(horizontal: boolean, px: number) {
  return horizontal ? `translate3d(${-px}px,0,0)` : `translate3d(0,${-px}px,0)`;
}

function pickFrom(pool: CaseItem[], rand: () => number): CaseItem {
  return pool[Math.floor(rand() * pool.length)] ?? pool[0];
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j]!;
    arr[j] = tmp!;
  }
  return arr;
}

/**
 * Visual-only pass-bys: the GOLD SPIN indicator flies past on a normal reel
 * so players see that a gold spin exists. Never writes LAND_INDEX.
 * Does not change who wins or gold-spin probability.
 */
function sprinkleGoldBaits(strip: CaseItem[], hasGold: boolean, rand: () => number): void {
  if (!hasGold) return;
  const travel: number[] = [];
  // Leave LAND_INDEX-1 for the occasional near-miss tease so mid-strip
  // fly-bys don't all get the fake-stop treatment.
  for (let i = 3; i < LAND_INDEX - 1; i++) travel.push(i);
  shuffleInPlace(travel, rand);
  const extra = Math.floor(travel.length / 10);
  const placeCount = Math.min(travel.length, 5 + extra);
  for (let n = 0; n < placeCount; n++) {
    const slot = travel[n];
    if (slot === undefined || slot === LAND_INDEX) continue;
    strip[slot] = GOLD_INDICATOR;
  }
}

/**
 * Extra fly-bys of MAXXX WIN — only when MAXXX is actually in this case.
 * If MAXXX sits in the gold-spin pool, those slots show GOLD SPIN instead.
 * Never writes LAND_INDEX.
 */
function sprinkleMaxxxBaits(strip: CaseItem[], rand: () => number, goldIds: Set<string>): void {
  const bait = goldIds.has(MAXXX_WIN.id) ? GOLD_INDICATOR : MAXXX_WIN;
  const travel: number[] = [];
  for (let i = 3; i < LAND_INDEX - 1; i++) travel.push(i);
  shuffleInPlace(travel, rand);
  const placeCount = Math.min(travel.length, Math.max(6, Math.floor(travel.length / 8)));
  for (let n = 0; n < placeCount; n++) {
    const slot = travel[n];
    if (slot === undefined || slot === LAND_INDEX) continue;
    strip[slot] = bait;
  }
}

/** Sometimes park GOLD SPIN just before the land slot so the reel looks like it will stop, then rolls over. */
function maybeGoldNearMiss(strip: CaseItem[], landing: CaseItem, rand: () => number): boolean {
  if (isGoldIndicator(landing) || isMaxxxWin(landing)) return false;
  if (rand() > 0.4) return false;
  strip[LAND_INDEX - 1] = GOLD_INDICATOR;
  return true;
}

type GoldTeaseCurve = {
  hold: number;
  creepEnd: number;
  holdT: number;
  slipT: number;
};

/** Slow onto the gold bait, linger, then ease-in over the line onto the land slot. */
function goldTeaseTiming(dur: number): { holdT: number; slipT: number } {
  const ms = Math.max(1, dur);
  const tail = Math.min(1100, Math.max(ms * 0.18, Math.min(420, ms * 0.28)));
  const creep = Math.min(520, tail * 0.45);
  return { holdT: 1 - tail / ms, slipT: 1 - (tail - creep) / ms };
}

function spinOffsetAt(t: number, target: number, tease: GoldTeaseCurve | null): number {
  if (!tease) return target * easeOutQuart(t);
  if (t <= tease.holdT) return tease.hold * easeOutQuart(t / Math.max(1e-6, tease.holdT));
  if (t <= tease.slipT) {
    const u = (t - tease.holdT) / Math.max(1e-6, tease.slipT - tease.holdT);
    return tease.hold + (tease.creepEnd - tease.hold) * u;
  }
  const u = (t - tease.slipT) / Math.max(1e-6, 1 - tease.slipT);
  return tease.creepEnd + (target - tease.creepEnd) * easeInCubic(u);
}

function poolHasMaxxx(pool: CaseItem[]): boolean {
  return pool.some((item) => isMaxxxWin(item));
}

function buildStrip(
  pool: CaseItem[],
  landing: CaseItem,
  rand: () => number,
  baits: CaseItem[] = [],
  baitMaxxx = false,
): CaseItem[] {
  const goldIds = new Set(baits.map((item) => item.id));
  const filler = goldIds.size ? pool.filter((item) => !goldIds.has(item.id)) : pool;
  const fillerPool = filler.length ? filler : pool;
  const strip: CaseItem[] = [];
  for (let i = 0; i < REEL_LENGTH; i++) {
    strip.push(i === LAND_INDEX ? landing : pickFrom(fillerPool, rand));
  }
  if (baits.length) sprinkleGoldBaits(strip, true, rand);
  if (baitMaxxx && (poolHasMaxxx(pool) || poolHasMaxxx(baits))) {
    sprinkleMaxxxBaits(strip, rand, goldIds);
  }
  if (baits.length) maybeGoldNearMiss(strip, landing, rand);
  strip[LAND_INDEX] = landing;
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
  goldChargeMs = 900,
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
  goldChargeMs?: number;
  laneSeed?: number;
  size?: BattleReelSize;
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
  const animRef = useRef<Animation | null>(null);
  const tickRafRef = useRef<number | null>(null);
  const pendingSpinRef = useRef<PendingSpin | null>(null);
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

  function cancelMotion() {
    if (tickRafRef.current) cancelAnimationFrame(tickRafRef.current);
    tickRafRef.current = null;
    if (animRef.current) {
      try {
        animRef.current.cancel();
      } catch {
        /* ignore */
      }
      animRef.current = null;
    }
  }

  function startWaapi(seed: number, dur: number, done: () => void, goldTease = false) {
    cancelMotion();
    const el = stripRef.current;
    const containerDim = isHorizontal
      ? (containerRef.current?.clientWidth || cfg.boxSize)
      : (containerRef.current?.clientHeight || cfg.boxSize);
    const rng = mulberry32(seed);
    const itemSize = cfg.itemSize;
    const landCenter = LAND_INDEX * itemSize + itemSize / 2 - containerDim / 2;
    // Tease rests just past the gold→land boundary so the winner is clearly
    // selected but gold is still hugging the pointer. Normal spins keep the
    // wider rest jitter.
    const jitter = goldTease ? (rng() - 0.78) * itemSize * 0.28 : (rng() - 0.5) * itemSize * 0.55;
    const targetOffset = landCenter + jitter;
    const tease: GoldTeaseCurve | null = goldTease
      ? (() => {
          const { holdT, slipT } = goldTeaseTiming(dur);
          const hold = (LAND_INDEX - 1) * itemSize + itemSize * 0.58 - containerDim / 2;
          const creepEnd = hold + (targetOffset - hold) * 0.14;
          return { hold, creepEnd, holdT, slipT };
        })()
      : null;
    lastTickIndexRef.current = -1;
    applyOffset(0);
    if (!el) {
      applyOffset(targetOffset);
      done();
      return;
    }
    el.style.willChange = "transform";

    const finish = () => {
      try {
        animRef.current?.commitStyles();
      } catch {
        /* ignore */
      }
      try {
        animRef.current?.cancel();
      } catch {
        /* ignore */
      }
      animRef.current = null;
      if (tickRafRef.current) cancelAnimationFrame(tickRafRef.current);
      tickRafRef.current = null;
      applyOffset(targetOffset);
      el.style.willChange = "auto";
      done();
    };

    if (typeof el.animate !== "function") {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const pos = spinOffsetAt(t, targetOffset, tease);
        applyOffset(pos);
        const currentIndex = Math.floor((pos + containerDim / 2) / itemSize);
        if (currentIndex !== lastTickIndexRef.current && t < 1) {
          lastTickIndexRef.current = currentIndex;
          playSpinTick(1 - t);
        }
        if (t < 1) tickRafRef.current = requestAnimationFrame(tick);
        else finish();
      };
      tickRafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Compositor-thread interpolation — visual motion stays at 60fps even if
    // React / image decode / audio hitch the main thread.
    const anim = tease
      ? el.animate(
          [
            { transform: stripTransform(isHorizontal, 0), offset: 0, easing: EASE_OUT_QUART_CSS },
            { transform: stripTransform(isHorizontal, tease.hold), offset: tease.holdT, easing: "linear" },
            {
              transform: stripTransform(isHorizontal, tease.creepEnd),
              offset: tease.slipT,
              easing: EASE_IN_CUBIC_CSS,
            },
            { transform: stripTransform(isHorizontal, targetOffset), offset: 1 },
          ],
          { duration: dur, fill: "forwards" },
        )
      : el.animate(
          [{ transform: stripTransform(isHorizontal, 0) }, { transform: stripTransform(isHorizontal, targetOffset) }],
          { duration: dur, easing: EASE_OUT_QUART_CSS, fill: "forwards" },
        );
    animRef.current = anim;

    const start = performance.now();
    const sampleTicks = () => {
      if (animRef.current !== anim) return;
      const t = Math.min(1, (performance.now() - start) / dur);
      const pos = spinOffsetAt(t, targetOffset, tease);
      const currentIndex = Math.floor((pos + containerDim / 2) / itemSize);
      if (currentIndex !== lastTickIndexRef.current && t < 1) {
        lastTickIndexRef.current = currentIndex;
        playSpinTick(1 - t);
      }
      if (t < 1) tickRafRef.current = requestAnimationFrame(sampleTicks);
    };
    tickRafRef.current = requestAnimationFrame(sampleTicks);

    anim.onfinish = () => {
      if (animRef.current !== anim) return;
      finish();
    };
  }

  function runGoldSpin(seedBase: number, landed: CaseOddsEntry) {
    setPhase("charge");
    sound.goldCharge();
    onGoldTriggered?.();
    timeoutRef.current = setTimeout(() => {
      const goldRand = mulberry32(seedBase * 104729 + 3);
      // Gold reel: real gold-pool items can land. No GOLD SPIN baits and no
      // extra MAXXX baits — those belong on the main reel as GOLD SPIN.
      const goldStrip = buildStrip(goldPool.length ? goldPool : [landed.item], landed.item, goldRand, [], false);
      pendingSpinRef.current = {
        seed: seedBase + 1,
        duration: goldDuration,
        onDone: () => {
          setPhase("done");
          sound.goldLand();
          onLanded?.(landed.item, true);
        },
      };
      setStrip(goldStrip);
      setPhase("gold");
    }, goldChargeMs);
  }

  function confirmGoldSpin() {
    const landed = resultRef.current;
    if (phase !== "awaitingGold" || !landed) return;
    runGoldSpin(goldSeedRef.current, landed);
  }

  useEffect(() => {
    preloadIcons(pool);
    preloadIcons(goldPool);
    preloadIcons([GOLD_INDICATOR, MAXXX_WIN]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  // Full-length idle strip so unique icons decode during countdown / before Open.
  // GOLD SPIN indicator baits (not gold-pool items) fly past before Open.
  useEffect(() => {
    if (spinToken !== 0 || strip.length > 0 || pool.length === 0) return;
    const rand = mulberry32(laneSeed + 17);
    setStrip(buildStrip(pool, pickFrom(pool, rand), rand, goldPool, true));
    applyOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, goldPool, spinToken, laneSeed]);

  useEffect(() => {
    if (!result || spinToken === 0) return;
    const seedBase = spinToken * 7919 + 13 + laneSeed * 97;
    const rand = mulberry32(seedBase);
    const goesGold = goldSpinEnabled && result.goldTier;
    const targetForMain = goesGold ? GOLD_INDICATOR : result.item;
    // Normal reel: GOLD SPIN flies past as bait (including when MAXXX is in the
    // gold pool). Landing stays the real result (or the GOLD SPIN indicator).
    const mainStrip = buildStrip(pool, targetForMain, rand, goldPool, true);
    const goldTease =
      Boolean(goldPool.length) &&
      !isGoldIndicator(targetForMain) &&
      isGoldIndicator(mainStrip[LAND_INDEX - 1]);
    pendingSpinRef.current = {
      seed: seedBase,
      duration,
      goldTease,
      onDone: () => {
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
      },
    };
    setStrip(mainStrip);
    setPhase("main");
    lastTickIndexRef.current = -1;
    return () => {
      cancelMotion();
      pendingSpinRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  // Start the compositor animation only after the new strip is in the DOM so
  // the first painted frame is at rest (no hitch-then-jump at t=0).
  useLayoutEffect(() => {
    const pending = pendingSpinRef.current;
    if (!pending) return;
    pendingSpinRef.current = null;
    startWaapi(pending.seed, pending.duration, pending.onDone, pending.goldTease);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strip, phase]);

  useEffect(
    () => () => {
      cancelMotion();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const isGoldPhase = phase === "gold" || phase === "charge" || phase === "awaitingGold";
  const stripLen = Math.max(strip.length, 1);
  const goldIdSet = new Set(goldPool.map((item) => item.id));

  return (
    <div className="min-w-0 w-full max-w-full">
      {playerLabel && <p className="mb-1.5 truncate text-xs font-medium text-slate-400">{playerLabel}</p>}
      <div
        ref={containerRef}
        className={clsx(
          "relative w-full max-w-full overflow-hidden border-2 bg-black/50 isolate",
          isGoldPhase ? "border-sky-400/70 shadow-[0_0_30px_rgba(56,189,248,0.35)]" : "border-white/20 shadow-[inset_0_0_18px_rgba(0,0,0,0.6)]",
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
              className="gold-pulse inline-flex items-center gap-1.5 rounded-full border border-sky-300/80 bg-sky-400 px-4 py-2 text-xs font-bold uppercase tracking-widest text-bg-950 shadow-[0_8px_28px_rgba(56,189,248,0.55)] transition-transform hover:scale-105 active:scale-95"
            >
              Spin for Gold
            </button>
          </div>
        )}
        {phase === "charge" && (
          <div className="gold-pulse absolute inset-0 z-20 flex items-center justify-center bg-sky-400/10">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-200">Gold Spin!</span>
          </div>
        )}
        <div
          ref={stripRef}
          className="pointer-events-none absolute left-0 top-0"
          style={{
            height: isHorizontal ? "100%" : cfg.itemSize * stripLen,
            width: isHorizontal ? cfg.itemSize * stripLen : "100%",
            backfaceVisibility: "hidden",
            willChange: spinning ? "transform" : "auto",
          }}
        >
          {strip.map((item, i) => (
            <ReelSlot
              key={i}
              item={item}
              index={i}
              itemSize={cfg.itemSize}
              iconSize={SIZE_CONFIG[size].icon}
              orientation={orientation}
              pulse={isGoldIndicator(item) && !spinning}
              goldBait={!isGoldPhase && goldIdSet.has(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const ReelSlot = memo(function ReelSlot({
  item,
  index,
  itemSize,
  iconSize,
  orientation,
  pulse,
  goldBait,
}: {
  item: CaseItem;
  index: number;
  itemSize: number;
  iconSize: BattleReelSize;
  orientation: Orientation;
  pulse: boolean;
  goldBait: boolean;
}) {
  useSettingsStore((s) => s.lockUnit);
  const r = RARITIES[item.rarity];
  const isIndicator = isGoldIndicator(item);
  const maxxx = isMaxxxWin(item);
  const goldChrome = isIndicator || goldBait;
  const iconPx = ICON_PX[iconSize];
  const isHorizontal = orientation === "horizontal";
  const ring = goldChrome ? "#38bdf8" : maxxx ? "#38bdf8" : r.ring;
  const cubePx = Math.round(Math.min(itemSize * 0.78, iconPx * 1.85));

  return (
    <div
      className={clsx(
        "absolute flex",
        pulse && "gold-pulse",
        isHorizontal
          ? "h-full flex-col items-center justify-center gap-0.5"
          : iconSize === "sm"
            ? "w-full flex-col items-center justify-center gap-0.5 px-1"
            : isIndicator
              ? "w-full flex-col items-center justify-center gap-1 px-2"
              : "w-full items-center gap-2.5 px-2",
      )}
      style={{
        contain: "layout paint",
        width: isHorizontal ? itemSize : "100%",
        height: isHorizontal ? "100%" : itemSize,
        top: isHorizontal ? 0 : index * itemSize,
        left: isHorizontal ? index * itemSize : 0,
        background: isIndicator
          ? isHorizontal
            ? "linear-gradient(165deg, #0b3a4a, #041016)"
            : "linear-gradient(90deg, #0b3a4a, #041016cc)"
          : goldChrome
            ? isHorizontal
              ? `linear-gradient(165deg, #38bdf866, ${r.to})`
              : `linear-gradient(90deg, #38bdf855, ${r.to}cc)`
          : maxxx
            ? isHorizontal
              ? "linear-gradient(165deg, rgba(251,191,36,0.2), #1c1003)"
              : "linear-gradient(90deg, rgba(251,191,36,0.18), #1c1003cc)"
          : isHorizontal
            ? `linear-gradient(165deg, ${r.from}66, ${r.to})`
            : `linear-gradient(90deg, ${r.from}55, ${r.to}cc)`,
        boxShadow: goldChrome || maxxx ? "0 0 22px rgba(56,189,248,0.7)" : undefined,
        borderRight: isHorizontal ? `2px solid ${ring}` : undefined,
        borderBottom: isHorizontal ? undefined : `2px solid ${ring}`,
      }}
    >
      {isIndicator ? (
        <>
          <img
            src={itemImageSrc(item)}
            alt=""
            width={cubePx}
            height={cubePx}
            decoding="async"
            draggable={false}
            className="pixelated shrink-0 object-contain drop-shadow-[0_0_16px_rgba(56,189,248,0.85)]"
            style={{ width: cubePx, height: cubePx }}
          />
          {!(isHorizontal || iconSize === "sm") && (
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-200">Gold Spin</p>
          )}
        </>
      ) : (
        <>
          <img
            src={itemImageSrc(item)}
            alt=""
            width={maxxx ? Math.round(iconPx * 1.7) : iconPx}
            height={iconPx}
            decoding="async"
            draggable={false}
            className={clsx("shrink-0 pixelated object-contain")}
            style={{ width: maxxx ? Math.round(iconPx * 1.7) : iconPx, height: iconPx }}
          />
          {maxxx ? (
            isHorizontal || iconSize === "sm" ? null : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-amber-200">{item.name}</p>
                <p className="text-[11px] text-slate-300">
                  <CashAmount wl={item.value} iconClassName="h-3 w-3" />
                </p>
              </div>
            )
          ) : isHorizontal || iconSize === "sm" ? (
            <span
              className={clsx("max-w-[92%] truncate px-0.5 font-bold", iconSize === "sm" ? "text-[9px]" : "text-[10px]")}
              style={{ color: goldChrome ? "#7dd3fc" : r.text }}
            >
              {item.name}
            </span>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold" style={{ color: goldChrome ? "#7dd3fc" : r.text }}>
                {item.name}
              </p>
              <p className="text-[11px] text-slate-300">
                <CashAmount wl={item.value} iconClassName="h-3 w-3" />
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
});
