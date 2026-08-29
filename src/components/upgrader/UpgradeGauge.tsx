import { useEffect, useRef, useState, type PointerEvent } from "react";
import { longBrake as longBrake } from "../../lib/easing";
import {
  degFromCenter as degFromCenter,
  formatAttemptMultiplier as formatAttemptMultiplier,
  formatChancePct as formatChancePct,
  shortestDegDelta as shortestDegDelta,
  wrapDeg as wrapDeg,
} from "../../lib/upgrader";
import { formatTickets } from "../../lib/format";
import { sound } from "../../lib/sound";
import { clsx } from "clsx";

const EXTRA_SPINS = 7;
const TICK_EVERY = 14;
/** Stroke-center radius in a 100×100 viewBox (0 = top, clockwise). */
const RING_R = 42;
const RING_STROKE = 8;
/** Radial end-caps: stick slightly past the green stroke, square ends (not dots). */
const CAP_HALF_LEN = 6.4;
const CAP_STROKE = 3.7;

function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: 50 + Math.sin(rad) * r, y: 50 - Math.cos(rad) * r };
}

function describeArc(startDeg: number, sweep: number, r: number): string {
  if (sweep <= 0.001) return "";
  const s = wrapDeg(startDeg);
  if (sweep >= 359.99) {
    const a = polar(s, r);
    const b = polar(s + 180, r);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 1 1 ${b.x} ${b.y} A ${r} ${r} 0 1 1 ${a.x} ${a.y}`;
  }
  const start = polar(s, r);
  const end = polar(s + sweep, r);
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

function arcCap(deg: number) {
  const inner = polar(deg, RING_R - CAP_HALF_LEN);
  const outer = polar(deg, RING_R + CAP_HALF_LEN);
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
}

type ArcGrab = "start" | "end" | "rotate";

/** Invisible grab target over a radial tick at the green arc’s endpoint. */
function ArcHandle({
  deg,
  which,
  spinning,
  grabbing,
}: {
  deg: number;
  which: "start" | "end";
  spinning: boolean;
  grabbing: boolean;
}) {
  const p = polar(deg, RING_R);
  return (
    <div
      data-arc-grab={which}
      className={clsx(
        "absolute z-30 h-10 w-10 -translate-x-1/2 -translate-y-1/2",
        spinning ? "pointer-events-none cursor-default" : grabbing ? "cursor-grabbing" : "cursor-grab",
      )}
      style={{ left: `${p.x}%`, top: `${p.y}%` }}
      aria-hidden
    />
  );
}

export function UpgradeGauge({
  chance,
  multiplier,
  spinning,
  won,
  landDeg,
  spinToken,
  durationMs,
  extraSpins = EXTRA_SPINS,
  arcStartDeg,
  minChance,
  maxChance,
  ticket = null,
  onArcStartChange,
  onWinChanceChange,
  onSettled,
}: {
  chance: number;
  multiplier: number;
  spinning: boolean;
  won: boolean | null;
  landDeg: number;
  spinToken: number;
  durationMs: number;
  extraSpins?: number;
  arcStartDeg: number;
  minChance: number;
  maxChance: number;
  ticket?: number | null;
  onArcStartChange: (deg: number) => void;
  onWinChanceChange: (chance: number) => void;
  onSettled: () => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const lastTickRef = useRef(0);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;
  const onArcRef = useRef(onArcStartChange);
  onArcRef.current = onArcStartChange;
  const onChanceRef = useRef(onWinChanceChange);
  onChanceRef.current = onWinChanceChange;
  const dragRef = useRef<{ lastDeg: number; mode: ArcGrab; start: number; sweep: number } | null>(null);
  const [hub, setHub] = useState<"idle" | "spin" | "win" | "lose">("idle");
  const [dragging, setDragging] = useState(false);
  const [dragArc, setDragArc] = useState<{ start: number; sweep: number } | null>(null);

  const propSweep = Math.max(0, Math.min(360, chance * 360));
  const startDeg = wrapDeg(dragArc?.start ?? arcStartDeg);
  const winSweep = dragArc?.sweep ?? propSweep;
  const endDeg = wrapDeg(startDeg + winSweep);
  const arcPath = describeArc(startDeg, winSweep, RING_R);
  const hubChance = winSweep / 360;
  const minSweep = Math.max(0.001, minChance * 360);
  const maxSweep = Math.max(minSweep, Math.min(360 * (1 - Number.EPSILON), maxChance * 360));

  useEffect(() => {
    if (spinToken === 0) {
      setHub("idle");
      rotationRef.current = 0;
      if (needleRef.current) needleRef.current.style.transform = "rotate(0deg)";
      return;
    }

    setHub("spin");
    lastTickRef.current = 0;
    const startRot = rotationRef.current;
    const startMod = ((startRot % 360) + 360) % 360;
    const targetMod = wrapDeg(landDeg);
    const delta = (targetMod - startMod + 360) % 360;
    const loops = Math.max(0, extraSpins);
    const target = startRot + loops * 360 + delta;
    const start = performance.now();
    const duration = Math.max(1, durationMs);
    const tickSounds = duration >= 200;

    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = longBrake(t);
      const deg = startRot + (target - startRot) * eased;
      rotationRef.current = deg;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${deg}deg)`;

      if (tickSounds) {
        const ticks = Math.floor(deg / TICK_EVERY);
        if (ticks !== lastTickRef.current) {
          lastTickRef.current = ticks;
          if (t < 0.98) sound.tick(0.35 + t * 0.5);
        }
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rotationRef.current = target;
        if (needleRef.current) needleRef.current.style.transform = `rotate(${target}deg)`;
        setHub(won ? "win" : "lose");
        settledRef.current();
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  function pointerDeg(e: { clientX: number; clientY: number }): number | null {
    const el = dialRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return degFromCenter(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (spinning) return;
    const grab = (e.target as Element | null)?.closest?.("[data-arc-grab]");
    const mode = grab?.getAttribute?.("data-arc-grab") as ArcGrab | null;
    if (mode !== "start" && mode !== "end" && mode !== "rotate") return;
    const now = pointerDeg(e);
    if (now == null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const start = wrapDeg(arcStartDeg);
    const sweep = Math.max(0, Math.min(360, chance * 360));
    dragRef.current = { lastDeg: now, mode, start, sweep };
    setDragArc({ start, sweep });
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const now = pointerDeg(e);
    if (now == null) return;
    const delta = shortestDegDelta(drag.lastDeg, now);
    drag.lastDeg = now;

    if (drag.mode === "rotate") {
      drag.start = wrapDeg(drag.start + delta);
      setDragArc({ start: drag.start, sweep: drag.sweep });
      onArcRef.current(drag.start);
      return;
    }

    const prevSweep = drag.sweep;
    if (drag.mode === "end") {
      drag.sweep = Math.min(maxSweep, Math.max(minSweep, drag.sweep + delta));
    } else {
      drag.sweep = Math.min(maxSweep, Math.max(minSweep, drag.sweep - delta));
      drag.start = wrapDeg(drag.start + (prevSweep - drag.sweep));
      onArcRef.current(drag.start);
    }
    setDragArc({ start: drag.start, sweep: drag.sweep });
    onChanceRef.current(drag.sweep / 360);
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragArc(null);
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px]">
      <div
        ref={dialRef}
        className={clsx("relative mx-auto aspect-square w-full select-none touch-none", dragging && "cursor-grabbing")}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="slider"
        aria-label="Win zone size and position"
        aria-valuemin={Math.round(minChance * 100)}
        aria-valuemax={Math.round(maxChance * 100)}
        aria-valuenow={Math.round(hubChance * 100)}
        aria-disabled={spinning}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r={RING_R} fill="none" stroke="#243830" strokeWidth={RING_STROKE} pointerEvents="none" />
          {winSweep > 0 && arcPath && (
            <path
              d={arcPath}
              fill="none"
              stroke="#a3e635"
              strokeWidth={RING_STROKE}
              strokeLinecap="butt"
              data-arc-grab="rotate"
              className={spinning ? undefined : dragging ? "cursor-grabbing" : "cursor-grab"}
              style={{
                pointerEvents: spinning ? "none" : "stroke",
                filter: "drop-shadow(0 0 3px rgba(163,230,53,0.55))",
              }}
            />
          )}
          {winSweep > 0 && (
            <>
              {[startDeg, endDeg].map((deg, i) => {
                const cap = arcCap(deg);
                return (
                  <line
                    key={i}
                    x1={cap.x1}
                    y1={cap.y1}
                    x2={cap.x2}
                    y2={cap.y2}
                    stroke="#bef264"
                    strokeWidth={CAP_STROKE}
                    strokeLinecap="butt"
                    pointerEvents="none"
                    style={{ filter: "drop-shadow(0 0 2px rgba(163,230,53,0.9))" }}
                  />
                );
              })}
            </>
          )}
        </svg>

        {winSweep > 0 && (
          <>
            <ArcHandle deg={startDeg} which="start" spinning={spinning} grabbing={dragging} />
            <ArcHandle deg={endDeg} which="end" spinning={spinning} grabbing={dragging} />
          </>
        )}

        <div
          ref={needleRef}
          className="pointer-events-none absolute inset-0 z-40"
          style={{ willChange: "transform" }}
          aria-hidden
        >
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 2 }}>
            <div
              className="h-0 w-0"
              style={{
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "18px solid #d9f99d",
                filter: "drop-shadow(0 2px 6px rgba(5,8,5,0.7))",
              }}
            />
          </div>
          <div
            className="absolute left-1/2 top-[18px] h-[14%] w-[3px] -translate-x-1/2 rounded-full"
            style={{ background: "#d9f99d", boxShadow: "0 0 8px rgba(163,230,53,0.65)" }}
          />
        </div>

        <div className="pointer-events-none absolute inset-[22%] z-20 grid place-items-center rounded-full bg-[#0c1414]">
          <div
            className="-translate-y-2 px-1.5 text-center"
            aria-live="polite"
            aria-label={`${formatChancePct(hubChance)} for ${formatAttemptMultiplier(multiplier)}`}
          >
            <p
              className={clsx(
                "min-h-[12px] text-[9px] font-bold uppercase tracking-[0.22em]",
                hub === "spin" || spinning
                  ? "text-emerald-300/80"
                  : hub === "win"
                    ? "text-lime-300"
                    : hub === "lose"
                      ? "text-slate-400"
                      : "text-transparent",
              )}
            >
              {hub === "spin" || spinning ? "Spinning" : hub === "win" ? "HIT" : hub === "lose" ? "MISS" : "\u00a0"}
            </p>
            {(hub === "win" || hub === "lose") && ticket != null ? (
              <p
                className={clsx(
                  "mt-0.5 font-mono text-[10px] font-bold tabular-nums sm:text-[11px]",
                  hub === "win" ? "text-lime-200/90" : "text-slate-300",
                )}
              >
                #{formatTickets(ticket)}
              </p>
            ) : null}
            <p
              className={clsx(
                "font-mono text-[1.65rem] font-black leading-none tabular-nums sm:text-3xl",
                hub === "win"
                  ? "text-lime-200"
                  : hub === "lose"
                    ? "text-slate-300"
                    : hubChance > 0
                      ? "text-lime-300"
                      : "text-slate-500",
              )}
            >
              {formatChancePct(hubChance)}
            </p>
            <p
              className={clsx(
                "mt-1 font-mono text-[11px] font-semibold tabular-nums sm:text-xs",
                hub === "win"
                  ? "text-lime-300/85"
                  : hub === "lose"
                    ? "text-slate-400"
                    : "text-emerald-200/85",
              )}
            >
              for {formatAttemptMultiplier(multiplier)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
