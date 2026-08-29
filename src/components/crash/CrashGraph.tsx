import { useId } from "react";
import { clsx } from "clsx";
import { BarChart3, ShieldCheck } from "lucide-react";
import { crashChipTone, formatCrashMulti, type CrashPhase } from "../../lib/crash";

export interface CrashSample {
  t: number;
  m: number;
}

export function CrashGraph({
  phase,
  multiplier,
  crashPoint,
  samples,
  bettingLeftMs,
  onFairness,
  onStats,
}: {
  phase: CrashPhase;
  multiplier: number;
  crashPoint: number;
  samples: CrashSample[];
  bettingLeftMs: number;
  onFairness?: () => void;
  onStats?: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const fillId = `crashFill-${uid}`;
  const glowId = `crashGlow-${uid}`;
  const W = 1000;
  const H = 520;
  const padL = 16;
  const padR = 36;
  const padT = 28;
  const padB = 28;
  const lastT = samples.length > 0 ? samples[samples.length - 1]!.t : 0;
  const maxT = Math.max(3.2, lastT * 1.14, phase === "running" ? lastT + 0.4 : 3.2);
  const maxM = Math.max(2, multiplier * 1.2, phase === "crashed" ? crashPoint * 1.08 : 2);
  const crashed = phase === "crashed";
  const stroke = crashed ? "#fb7185" : "#4ade80";

  function xy(t: number, m: number): { x: number; y: number } {
    const x = padL + (t / maxT) * (W - padL - padR);
    const y = H - padB - ((Math.max(1, m) - 1) / (maxM - 1)) * (H - padT - padB);
    return { x, y };
  }

  const pts = samples.map((s) => xy(s.t, s.m));
  const tip = pts.length > 0 ? pts[pts.length - 1]! : xy(0, 1);
  const d =
    pts.length === 0
      ? ""
      : `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)} ` +
        pts
          .slice(1)
          .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ");

  const gridMs = [1.5, 2, 3, 5, 10, 20, 50, 100].filter((g) => g <= maxM * 1.02);

  const headline =
    phase === "betting"
      ? `Starting in ${(Math.max(0, bettingLeftMs) / 1000).toFixed(1)}s`
      : crashed
        ? `Crashed @ ${formatCrashMulti(crashPoint)}`
        : formatCrashMulti(multiplier);

  const tone = crashChipTone(crashed ? crashPoint : multiplier);

  return (
    <div className="relative min-h-[280px] overflow-hidden bg-[#070d0d] sm:min-h-[380px] lg:min-h-[420px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={fillId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={stroke} stopOpacity="0" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.22" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {gridMs.map((g) => {
          const { y } = xy(0, g);
          return (
            <g key={g}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
              <text x={W - 10} y={y - 4} textAnchor="end" fill="rgba(148,163,184,0.45)" fontSize="18" fontFamily="ui-monospace, monospace">
                {g.toFixed(g >= 10 ? 0 : 1)}x
              </text>
            </g>
          );
        })}
        {d && pts.length > 1 && (
          <path
            d={`${d} L ${tip.x.toFixed(1)} ${H - padB} L ${pts[0]!.x.toFixed(1)} ${H - padB} Z`}
            fill={`url(#${fillId})`}
          />
        )}
        {d && (
          <path
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
          />
        )}
        {(phase === "running" || crashed) && (
          <circle cx={tip.x} cy={tip.y} r={crashed ? 7 : 9} fill={stroke} stroke="#ecfccb" strokeWidth="2" />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <p
          className={clsx(
            "px-4 text-center font-mono text-4xl font-black tracking-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)] sm:text-6xl lg:text-7xl",
            phase === "betting" && "text-cyan-100",
            phase === "running" && (tone === "moon" ? "text-amber-200" : "text-white"),
            crashed && "text-rose-300",
          )}
        >
          {headline}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 text-[11px] text-slate-500">
        <button
          type="button"
          onClick={onFairness}
          className="pointer-events-auto inline-flex items-center gap-1.5 text-emerald-300/90 hover:text-emerald-200"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Provably Fair
        </button>
        <button
          type="button"
          onClick={onStats}
          className="pointer-events-auto inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300"
          title="RTP & house edge"
        >
          <BarChart3 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
