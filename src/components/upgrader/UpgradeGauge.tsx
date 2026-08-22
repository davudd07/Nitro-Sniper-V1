import { useEffect, useRef, useState } from "react";
import { longBrake } from "../../lib/easing";
import { formatChancePct } from "../../lib/upgrader";
import { sound } from "../../lib/sound";
import { clsx } from "clsx";

const EXTRA_SPINS = 7;
const TICK_EVERY = 14;

export function UpgradeGauge({
  chance,
  spinning,
  won,
  landDeg,
  spinToken,
  durationMs,
  onSettled,
}: {
  chance: number;
  spinning: boolean;
  won: boolean | null;
  landDeg: number;
  spinToken: number;
  durationMs: number;
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
      ? `conic-gradient(#84cc16 0deg ${winSweep}deg, #1f2933 ${winSweep}deg 360deg)`
      : "conic-gradient(#1f2933 0deg 360deg)";

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
    const target = startRot + EXTRA_SPINS * 360 + delta;
    const start = performance.now();
    const duration = Math.max(280, durationMs);

    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = longBrake(t);
      const deg = startRot + (target - startRot) * eased;
      rotationRef.current = deg;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${deg}deg)`;

      const ticks = Math.floor(deg / TICK_EVERY);
      if (ticks !== lastTickRef.current) {
        lastTickRef.current = ticks;
        if (t < 0.98) sound.tick(0.35 + t * 0.5);
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
        style={{ top: -6 }}
        aria-hidden
      >
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

      <div className="relative mx-auto aspect-square w-full">
        <div
          className="absolute inset-0 rounded-full ring-4 ring-[#3d5a3a]/80"
          style={{ boxShadow: "0 0 36px rgba(132,204,22,0.16), 6px 6px 0 #050805" }}
        />
        <div
          ref={wheelRef}
          className="absolute inset-[6px] overflow-hidden rounded-full"
          style={{ background: gradient, willChange: "transform" }}
        />
        <div className="absolute inset-[22%] z-10 grid place-items-center rounded-full bg-[#0c1410] ring-2 ring-white/10">
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
