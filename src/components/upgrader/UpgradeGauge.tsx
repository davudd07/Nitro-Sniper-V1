import { useEffect, useRef, useState, type PointerEvent } from "react";
import { longBrake } from "../../lib/easing";
import { degFromCenter, formatChancePct, shortestDegDelta, wrapDeg } from "../../lib/upgrader";
import { sound } from "../../lib/sound";
import { clsx } from "clsx";

const EXTRA_SPINS = 7;
const TICK_EVERY = 14;
/** Stroke-center radius in a 100×100 viewBox (0 = top, clockwise). */
const RING_R = 42;
const RING_STROKE = 8;

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

function ArcHandle({ deg, spinning, grabbing }: { deg: number; spinning: boolean; grabbing: boolean }) {
  const p = polar(deg, RING_R);
  return (
    <div
      data-arc-grab=""
      className={clsx(
        "absolute z-30 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
        spinning ? "cursor-default" : grabbing ? "cursor-grabbing" : "cursor-grab",
      )}
      style={{ left: `${p.x}%`, top: `${p.y}%` }}
      aria-hidden
    >
      <span className="pointer-events-none h-3.5 w-3.5 rounded-full border-2 border-[#0c1410] bg-lime-300 shadow-[0_0_10px_rgba(163,230,53,0.85)]" />
    </div>
  );
}

export function UpgradeGauge({
  chance,
  spinning,
  won,
  landDeg,
  spinToken,
  durationMs,
  extraSpins = EXTRA_SPINS,
  arcStartDeg,
  onArcStartChange,
  onSettled,
}: {
  chance: number;
  spinning: boolean;
  won: boolean | null;
  landDeg: number;
  spinToken: number;
  durationMs: number;
  extraSpins?: number;
  arcStartDeg: number;
  onArcStartChange: (deg: number) => void;
  onSettled: () => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const lastTickRef = useRef(0);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;
  const arcRef = useRef(arcStartDeg);
  arcRef.current = arcStartDeg;
  const onArcRef = useRef(onArcStartChange);
  onArcRef.current = onArcStartChange;
  const dragRef = useRef<{ lastDeg: number } | null>(null);
  const [hub, setHub] = useState<"idle" | "spin" | "win" | "lose">("idle");
  const [dragging, setDragging] = useState(false);

  const winSweep = Math.max(0, Math.min(360, chance * 360));
  const startDeg = wrapDeg(arcStartDeg);
  const endDeg = wrapDeg(arcStartDeg + winSweep);
  const arcPath = describeArc(arcStartDeg, winSweep, RING_R);

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
    if (!grab) return;
    const now = pointerDeg(e);
    if (now == null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { lastDeg: now };
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const now = pointerDeg(e);
    if (now == null) return;
    const next = wrapDeg(arcRef.current + shortestDegDelta(drag.lastDeg, now));
    drag.lastDeg = now;
    arcRef.current = next;
    onArcRef.current(next);
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
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
        aria-label="Win zone position"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(wrapDeg(arcStartDeg))}
        aria-disabled={spinning}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="47.6" fill="none" stroke="#3d5a3a" strokeWidth="1.15" pointerEvents="none" />
          <circle cx="50" cy="50" r={RING_R} fill="none" stroke="#1a2420" strokeWidth={RING_STROKE} pointerEvents="none" />
          {chance > 0 && arcPath && (
            <path
              d={arcPath}
              fill="none"
              stroke="#a3e635"
              strokeWidth={RING_STROKE}
              strokeLinecap="butt"
              data-arc-grab=""
              className={spinning ? undefined : dragging ? "cursor-grabbing" : "cursor-grab"}
              style={{
                pointerEvents: spinning ? "none" : "stroke",
                filter: "drop-shadow(0 0 3px rgba(163,230,53,0.55))",
              }}
            />
          )}
        </svg>

        {chance > 0 && (
          <>
            <ArcHandle deg={startDeg} spinning={spinning} grabbing={dragging} />
            <ArcHandle deg={endDeg} spinning={spinning} grabbing={dragging} />
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

        <div className="pointer-events-none absolute inset-[24%] z-20 grid place-items-center rounded-full bg-[#0c1410]">
          <div className="px-2 text-center">
            {hub === "spin" || spinning ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80">Spinning</p>
                <p className="mt-1 font-mono text-3xl font-black tabular-nums text-white">{formatChancePct(chance)}</p>
              </>
            ) : hub === "win" ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">Hit</p>
                <p className="mt-1 text-2xl font-black uppercase tracking-wide text-lime-200">Upgrade</p>
              </>
            ) : hub === "lose" ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Miss</p>
                <p className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-300">Bust</p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Chance</p>
                <p
                  className={clsx(
                    "mt-1 font-mono text-3xl font-black tabular-nums",
                    chance > 0 ? "text-lime-300" : "text-slate-500",
                  )}
                >
                  {formatChancePct(chance)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
