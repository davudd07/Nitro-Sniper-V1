import { useEffect, useRef, useState } from "react";
import { longBrake } from "../../lib/easing";
import { formatChancePct, formatRollBand } from "../../lib/upgrader";
import { sound } from "../../lib/sound";
import { clsx } from "clsx";

const EXTRA_SPINS = 7;
const TICK_EVERY = 14;
const TICK_COUNT = 48;

export function UpgradeGauge({
  chance,
  spinning,
  won,
  landDeg,
  spinToken,
  durationMs,
  extraSpins = EXTRA_SPINS,
  onSettled,
}: {
  chance: number;
  spinning: boolean;
  won: boolean | null;
  landDeg: number;
  spinToken: number;
  durationMs: number;
  extraSpins?: number;
  onSettled: () => void;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const lastTickRef = useRef(0);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;
  const [hub, setHub] = useState<"idle" | "spin" | "win" | "lose">("idle");

  const winSweep = Math.max(0, Math.min(360, chance * 360));
  const gradient =
    chance > 0
      ? `conic-gradient(#a3e635 0deg ${winSweep}deg, #365314 ${winSweep}deg ${Math.min(360, winSweep + 1.2)}deg, #1a2420 ${Math.min(360, winSweep + 1.2)}deg 360deg)`
      : "conic-gradient(#1a2420 0deg 360deg)";

  useEffect(() => {
    if (spinToken === 0) {
      setHub("idle");
      rotationRef.current = 0;
      if (wheelRef.current) wheelRef.current.style.transform = "rotate(0deg)";
      return;
    }

    setHub("spin");
    lastTickRef.current = 0;
    const startRot = rotationRef.current;
    const startMod = ((startRot % 360) + 360) % 360;
    const targetMod = (360 - landDeg + 360) % 360;
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
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${deg}deg)`;

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
        if (wheelRef.current) wheelRef.current.style.transform = `rotate(${target}deg)`;
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

  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px]">
      <div
        className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
        style={{ top: -8 }}
        aria-hidden
      >
        <div
          className="h-0 w-0"
          style={{
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderTop: "20px solid #d9f99d",
            filter: "drop-shadow(0 2px 6px rgba(5,8,5,0.7))",
          }}
        />
      </div>

      <div className="relative mx-auto aspect-square w-full">
        <div
          className="absolute inset-0 rounded-full ring-4 ring-[#3d5a3a]/80"
          style={{ boxShadow: "0 0 36px rgba(163,230,53,0.18), 6px 6px 0 #050805" }}
        />
        <div
          ref={wheelRef}
          className="absolute inset-[6px] overflow-hidden rounded-full"
          style={{ background: gradient, willChange: "transform" }}
        >
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
            {Array.from({ length: TICK_COUNT }, (_, i) => {
              const a = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
              const major = i % 4 === 0;
              const inner = major ? 45.4 : 46.6;
              const outer = 49.4;
              const x1 = 50 + Math.cos(a) * inner;
              const y1 = 50 + Math.sin(a) * inner;
              const x2 = 50 + Math.cos(a) * outer;
              const y2 = 50 + Math.sin(a) * outer;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={major ? "rgba(236,252,203,0.55)" : "rgba(236,252,203,0.22)"}
                  strokeWidth={major ? 0.7 : 0.45}
                />
              );
            })}
          </svg>
        </div>
        <div className="absolute inset-[22%] z-10 grid place-items-center rounded-full bg-[#0c1410] ring-2 ring-lime-300/15">
          <div className="px-2 text-center">
            {hub === "spin" || spinning ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80">Spinning</p>
                <p className="mt-1 font-mono text-3xl font-black tabular-nums text-white">{formatChancePct(chance)}</p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-lime-200/80">{formatRollBand(chance)}</p>
              </>
            ) : hub === "win" ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">Hit</p>
                <p className="mt-1 text-2xl font-black uppercase tracking-wide text-lime-200">Upgrade</p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-lime-200/70">{formatRollBand(chance)}</p>
              </>
            ) : hub === "lose" ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Miss</p>
                <p className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-300">Bust</p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">{formatRollBand(chance)}</p>
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
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-emerald-200/70">{formatRollBand(chance)}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
