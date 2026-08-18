import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { CaseOddsEntry } from "../../data/cases";
import type { CaseItem } from "../../data/items";
import { GOLD_INDICATOR } from "../../data/goldItem";
import { ItemIcon } from "../ui/ItemIcon";
import { RARITIES } from "../../data/rarities";
import { easeOutQuart } from "../../lib/easing";
import { sound } from "../../lib/sound";

const REEL_LENGTH = 70;
const LAND_INDEX = 58;

const SIZE_CONFIG = {
  md: { itemWidth: 132, height: 108, icon: "md" as const },
  lg: { itemWidth: 172, height: 140, icon: "lg" as const },
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
  const cfg = SIZE_CONFIG[size];

  useEffect(() => {
    if (!result || spinToken === 0) return;
    const seedBase = spinToken * 7919 + 13 + laneSeed * 97;
    const rand = mulberry32(seedBase);
    const goesGold = goldSpinEnabled && result.goldTier;
    const targetForMain = goesGold ? GOLD_INDICATOR : result.item;
    const mainStrip = buildStrip(pool, targetForMain, rand);
    setStrip(mainStrip);
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
    const containerWidth = containerRef.current?.clientWidth ?? 320;
    const jitter = (mulberry32(seed)() - 0.5) * cfg.itemWidth * 0.55;
    const targetOffset = LAND_INDEX * cfg.itemWidth + cfg.itemWidth / 2 - containerWidth / 2 + jitter;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = easeOutQuart(t);
      const pos = targetOffset * eased;
      setOffset(pos);

      const currentIndex = Math.floor((pos + containerWidth / 2) / cfg.itemWidth);
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
    <div className="w-full">
      {playerLabel && <p className="mb-1.5 truncate text-xs font-medium text-slate-400">{playerLabel}</p>}
      <div
        ref={containerRef}
        className={clsx(
          "relative w-full overflow-hidden rounded-xl border bg-bg-950/70 transition-shadow",
          isGoldPhase ? "border-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.35)]" : "border-white/10",
        )}
        style={{ height: cfg.height }}
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-[3px] -translate-x-1/2 bg-gradient-to-b from-transparent via-fuchsia-400 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-bg-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-bg-950 to-transparent" />
        {phase === "charge" && (
          <div className="gold-pulse absolute inset-0 z-20 flex items-center justify-center bg-amber-400/10 backdrop-blur-[1px]">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Gold Spin!</span>
          </div>
        )}
        <div className="absolute top-1/2 flex -translate-y-1/2 gap-0" style={{ transform: `translate(${-offset}px, -50%)` }}>
          {strip.map((item, i) => (
            <ReelSlot key={i} item={item} itemWidth={cfg.itemWidth} iconSize={cfg.icon} />
          ))}
          {strip.length === 0 && (
            <div
              className="flex items-center justify-center py-8 text-xs text-slate-600"
              style={{ width: containerRef.current?.clientWidth ?? 320 }}
            >
              Waiting to spin…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReelSlot({
  item,
  itemWidth,
  iconSize,
}: {
  item: CaseItem;
  itemWidth: number;
  iconSize: "md" | "lg";
}) {
  const isIndicator = item.id === GOLD_INDICATOR.id;
  const r = RARITIES[item.rarity];
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 py-2" style={{ width: itemWidth }}>
      <div className={clsx("rounded-lg", isIndicator && "gold-pulse")} style={{ boxShadow: isIndicator ? "0 0 22px rgba(251,191,36,0.7)" : undefined }}>
        <ItemIcon icon={item.icon} rarity={item.rarity} size={iconSize} />
      </div>
      <span className="max-w-[85%] truncate text-[10px] font-medium" style={{ color: isIndicator ? "#fbbf24" : r.text }}>
        {item.name}
      </span>
    </div>
  );
}
