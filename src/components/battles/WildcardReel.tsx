import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { EASE_OUT_QUART_CSS, easeOutQuart } from "../../lib/easing";
import { mulberry32 } from "../../lib/fundedBattle";
import { sound } from "../../lib/sound";
import {
  WILDCARD_ROWS,
  formatWildcard,
  wildcardTone,
  type WildcardMulti,
} from "../../lib/wildcard";
import { BATTLE_REEL_HEIGHT, type BattleReelSize } from "../cases/CaseReel";

const STRIP_LEN = 46;
const LAND_INDEX = 38;
const SLOT_PX: Record<BattleReelSize, number> = { sm: 48, md: 56, lg: 64 };
const SPARKS = [
  { x: "12%", y: "22%", delay: "0ms", duration: "720ms" },
  { x: "82%", y: "18%", delay: "70ms", duration: "780ms" },
  { x: "18%", y: "78%", delay: "110ms", duration: "700ms" },
  { x: "76%", y: "74%", delay: "40ms", duration: "820ms" },
  { x: "50%", y: "10%", delay: "160ms", duration: "640ms" },
  { x: "50%", y: "88%", delay: "90ms", duration: "760ms" },
];

function playSpinTick(speed: number) {
  sound.tick(speed);
}

function buildStrip(land: WildcardMulti, seed: number): WildcardMulti[] {
  const rand = mulberry32(seed >>> 0);
  const pool = WILDCARD_ROWS.map((row) => row.multi);
  const strip: WildcardMulti[] = [];
  for (let i = 0; i < STRIP_LEN; i++) {
    strip.push(i === LAND_INDEX ? land : pool[Math.floor(rand() * pool.length)]!);
  }
  return strip;
}

function idleStrip(seed: number): WildcardMulti[] {
  const rand = mulberry32((seed + 91) >>> 0);
  const pool = WILDCARD_ROWS.map((row) => row.multi);
  return Array.from({ length: 14 }, () => pool[Math.floor(rand() * pool.length)]!);
}

export function WildcardReel({
  result,
  spinToken,
  size = "lg",
  laneSeed = 0,
  duration = 3400,
  onLanded,
}: {
  result: WildcardMulti | null;
  spinToken: number;
  size?: BattleReelSize;
  laneSeed?: number;
  duration?: number;
  onLanded?: (multi: WildcardMulti) => void;
}) {
  const height = BATTLE_REEL_HEIGHT[size];
  const slot = SLOT_PX[size];
  const [strip, setStrip] = useState<WildcardMulti[]>(() => idleStrip(laneSeed));
  const [phase, setPhase] = useState<"idle" | "spin" | "done">("idle");
  const [kick, setKick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const landedRef = useRef(false);
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;

  function applyOffset(px: number) {
    const el = stripRef.current;
    if (el) el.style.transform = `translate3d(0,${-px}px,0)`;
  }

  useLayoutEffect(() => {
    if (spinToken === 0 || result == null) {
      setPhase("idle");
      setStrip(idleStrip(laneSeed));
      applyOffset(0);
      landedRef.current = false;
      return;
    }
    landedRef.current = false;
    const next = buildStrip(result, spinToken * 7919 + laneSeed * 131);
    setStrip(next);
    setPhase("spin");
    applyOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  useEffect(() => {
    if (phase !== "spin" || result == null) return;
    const el = stripRef.current;
    const box = wrapRef.current;
    if (!el || !box) {
      const retry = window.setTimeout(() => setKick((n) => n + 1), 32);
      return () => window.clearTimeout(retry);
    }
    const windowH = box.clientHeight || height;
    const landPx = LAND_INDEX * slot - (windowH - slot) / 2;
    const delay = laneSeed * 110;
    const dur = duration + laneSeed * 70;
    el.getAnimations().forEach((a) => a.cancel());
    const anim = el.animate(
      [
        { transform: "translate3d(0,0,0)", filter: "blur(1.2px) saturate(1.15)" },
        { transform: `translate3d(0,${-landPx * 0.82}px,0)`, filter: "blur(0.6px) saturate(1.2)", offset: 0.72 },
        { transform: `translate3d(0,${-landPx}px,0)`, filter: "blur(0px) saturate(1)" },
      ],
      { duration: dur, delay, easing: EASE_OUT_QUART_CSS, fill: "forwards" },
    );
    let cancelled = false;
    let lastTick = -1;
    let raf = 0;
    const tick = () => {
      if (cancelled) return;
      const raw = typeof anim.currentTime === "number" ? anim.currentTime : 0;
      const t = Math.min(1, Math.max(0, (raw - delay) / dur));
      const eased = easeOutQuart(Math.max(0, t));
      const idx = Math.floor((eased * landPx) / slot);
      if (idx !== lastTick) {
        lastTick = idx;
        playSpinTick(1 - t);
      }
      if (t < 1 && anim.playState !== "finished") raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const done = () => {
      if (cancelled || landedRef.current) return;
      landedRef.current = true;
      cancelAnimationFrame(raf);
      setPhase("done");
      applyOffset(landPx);
      const up = wildcardTone(result) === "up";
      if (up) sound.win(result >= 5 ? "big" : "small");
      else sound.lose();
      onLandedRef.current?.(result);
    };
    anim.onfinish = done;
    const fallback = window.setTimeout(done, delay + dur + 80);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
      anim.onfinish = null;
      try {
        anim.cancel();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, spinToken, kick]);

  const landed = phase === "done" && result != null;
  const landedUp = landed && wildcardTone(result) === "up";
  const spinning = phase === "spin";

  return (
    <div
      ref={wrapRef}
      className={clsx(
        "relative overflow-hidden rounded-lg border",
        landed ? (landedUp ? "border-emerald-300/80" : "border-rose-400/80") : spinning ? "border-white/25" : "border-white/10",
        landed && (landedUp ? "wildcard-land-up" : "wildcard-land-down"),
      )}
      style={{
        height,
        background: landed
          ? landedUp
            ? "radial-gradient(circle at 50% 42%, rgba(52,211,153,0.38), #04110c 72%)"
            : "radial-gradient(circle at 50% 42%, rgba(244,63,94,0.36), #140308 72%)"
          : "linear-gradient(180deg, #0b1220, #05080c)",
        boxShadow: landed
          ? landedUp
            ? "0 0 34px rgba(52,211,153,0.55)"
            : "0 0 34px rgba(244,63,94,0.48)"
          : spinning
            ? "0 0 18px rgba(255,255,255,0.08)"
            : undefined,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 to-transparent py-1.5 text-center">
        <span
          className={clsx(
            "text-[9px] font-black uppercase tracking-[0.28em]",
            landedUp ? "text-emerald-200" : landed ? "text-rose-200" : "text-white/55",
          )}
        >
          Wildcard
        </span>
      </div>

      {spinning && <div className="wildcard-scan pointer-events-none absolute inset-x-0 z-20 h-10" />}

      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px -translate-y-1/2 bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 z-10 rounded-md border-2"
        style={{
          top: "50%",
          height: slot,
          transform: "translateY(-50%)",
          borderColor: landed
            ? landedUp
              ? "rgba(52,211,153,0.95)"
              : "rgba(251,113,133,0.95)"
            : "rgba(255,255,255,0.35)",
          boxShadow: landed
            ? landedUp
              ? "0 0 18px rgba(52,211,153,0.65)"
              : "0 0 18px rgba(244,63,94,0.55)"
            : undefined,
        }}
      />

      <div ref={stripRef} className="absolute inset-x-0 top-0 will-change-transform">
        {strip.map((multi, i) => {
          const up = wildcardTone(multi) === "up";
          const isLand = i === LAND_INDEX && (phase === "spin" || phase === "done");
          return (
            <div key={`${i}-${multi}`} className="flex items-center justify-center px-1" style={{ height: slot }}>
              <div
                className={clsx(
                  "flex h-[78%] w-full items-center justify-center rounded-md border-2 font-black tracking-wide",
                  size === "sm" ? "text-lg" : size === "md" ? "text-xl" : "text-2xl",
                  up ? "border-emerald-300/70 text-emerald-200" : "border-rose-400/70 text-rose-200",
                  isLand && landed && "wildcard-chip-pop",
                )}
                style={{
                  background: up ? "linear-gradient(180deg,#166534,#022c22)" : "linear-gradient(180deg,#9f1239,#450a0a)",
                  boxShadow: up ? "0 0 16px rgba(52,211,153,0.4)" : "0 0 16px rgba(244,63,94,0.32)",
                }}
              >
                {formatWildcard(multi)}
              </div>
            </div>
          );
        })}
      </div>

      {landed && (
        <>
          <div className={clsx("wildcard-flash pointer-events-none absolute inset-0 z-30", landedUp ? "wildcard-flash-up" : "wildcard-flash-down")} />
          <div
            className={clsx("wildcard-shock pointer-events-none absolute left-1/2 top-1/2 z-20 h-24 w-24 rounded-full", landedUp ? "wildcard-shock-up" : "wildcard-shock-down")}
          />
          {SPARKS.map((spark, i) => (
            <span
              key={i}
              className={clsx("wildcard-spark pointer-events-none absolute z-30 h-2 w-2 rounded-full", landedUp ? "bg-emerald-200" : "bg-rose-200")}
              style={{
                left: spark.x,
                top: spark.y,
                animationDelay: spark.delay,
                animationDuration: spark.duration,
                boxShadow: landedUp ? "0 0 10px rgba(52,211,153,0.95)" : "0 0 10px rgba(244,63,94,0.95)",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
