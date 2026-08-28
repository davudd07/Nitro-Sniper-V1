import { useEffect, useId, useRef, useState } from "react";
import { clsx } from "clsx";
import { longBrake } from "../../lib/easing";
import { sound } from "../../lib/sound";
import type { JackpotTicket } from "../battles/JackpotWheel";
import { PlayerAvatar } from "../identity/PlayerAvatar";
import { AnimatedPot } from "../ui/AnimatedPot";
import type { PlayCurrency } from "../../lib/playWallet";

const DURATION_MS = 12000;
const EXTRA_SPINS = 12;
const AVATAR_MIN_SWEEP = 16;
const HUB_INSET = "26%";

export function JackpotCircleWheel({
  tickets,
  spinToken,
  winnerId,
  shouldSpin = true,
  countdown = null,
  countdownProgress = null,
  potValue,
  potLabel,
  currency,
  pointerName = null,
  onPointerChange,
  onFinished,
}: {
  tickets: JackpotTicket[];
  spinToken: number;
  winnerId: string | null;
  shouldSpin?: boolean;
  countdown?: number | null;
  /** Remaining countdown 0–1, for the hub ring. */
  countdownProgress?: number | null;
  potValue: number;
  potLabel: string;
  currency?: PlayCurrency;
  pointerName?: string | null;
  onPointerChange?: (info: { playerId: string; name: string } | null) => void;
  onFinished?: () => void;
}) {
  const [done, setDone] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSliceRef = useRef(-1);
  const wheelRef = useRef<HTMLDivElement>(null);
  const onPointerRef = useRef(onPointerChange);
  onPointerRef.current = onPointerChange;
  const pointerId = useId().replace(/:/g, "");

  const slices = buildSlices(tickets);
  const empty = slices.length === 0;

  useEffect(() => {
    if (spinToken === 0) {
      setDone(false);
      setActiveIndex(null);
      lastSliceRef.current = -1;
      onPointerRef.current?.(null);
      if (wheelRef.current) wheelRef.current.style.transform = "rotate(0deg)";
      return;
    }
    if (!winnerId || slices.length === 0 || !shouldSpin) return;
    setDone(false);
    lastSliceRef.current = -1;

    const winner = slices.find((s) => s.ticket.playerId === winnerId);
    if (!winner) return;

    const jitter = (Math.random() - 0.5) * winner.sweep * 0.55;
    const winnerMid = winner.start + winner.sweep / 2;
    // Arrow sits at 0deg (top). Rotate clockwise so winnerMid lands under it.
    const target = EXTRA_SPINS * 360 + (360 - winnerMid) + jitter;

    const start = performance.now();
    if (wheelRef.current) wheelRef.current.style.transform = "rotate(0deg)";

    const opening = sliceAtTop(slices, 0);
    if (opening) {
      lastSliceRef.current = opening.index;
      setActiveIndex(opening.index);
      onPointerRef.current?.({ playerId: opening.ticket.playerId, name: opening.ticket.name });
    }

    function frame(now: number) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = longBrake(t);
      const deg = target * eased;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${deg}deg)`;

      const atTop = sliceAtTop(slices, deg);
      if (atTop && atTop.index !== lastSliceRef.current) {
        lastSliceRef.current = atTop.index;
        setActiveIndex(atTop.index);
        onPointerRef.current?.({ playerId: atTop.ticket.playerId, name: atTop.ticket.name });
        if (t < 1) sound.jackpotSpin();
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        if (wheelRef.current) wheelRef.current.style.transform = `rotate(${target}deg)`;
        const landed = slices.find((s) => s.ticket.playerId === winnerId) ?? atTop;
        if (landed) {
          setActiveIndex(landed.index);
          onPointerRef.current?.({ playerId: landed.ticket.playerId, name: landed.ticket.name });
        }
        setDone(true);
        sound.jackpotWin();
        onFinished?.();
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  const gradient = conicFromSlices(slices);
  const winnerTicket = done && winnerId ? tickets.find((t) => t.playerId === winnerId) : null;
  const winnerName = winnerTicket?.name ?? null;
  const highlight = done
    ? slices.find((s) => s.ticket.playerId === winnerId)
    : activeIndex != null
      ? slices[activeIndex]
      : null;

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
      <div
        className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
        style={{ top: -10 }}
        aria-hidden
      >
        <svg width="36" height="32" viewBox="0 0 36 32" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
          <defs>
            <linearGradient id={`${pointerId}-ptr`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="38%" stopColor="#a5f3fc" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
          </defs>
          <path
            d="M18 30 L2 4 L34 4 Z"
            fill={`url(#${pointerId}-ptr)`}
            stroke="#083344"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M18 24 L8 7 L28 7 Z" fill="#22d3ee" opacity="0.85" />
        </svg>
      </div>

      <div
        className={clsx("relative mx-auto aspect-square w-full rounded-full", done && "jackpot-win-rim")}
        style={{
          boxShadow: done
            ? "0 10px 36px rgba(0,0,0,0.45), 0 0 28px rgba(251,191,36,0.38)"
            : highlight && spinToken > 0
              ? `0 10px 36px rgba(0,0,0,0.45), 0 0 26px ${highlight.ticket.color}55`
              : "0 10px 36px rgba(0,0,0,0.45), 0 0 32px rgba(34,211,238,0.22)",
        }}
      >
        <div className={clsx("absolute inset-0 overflow-hidden rounded-full", empty && "bg-[#0b1112]")}>
          <div ref={wheelRef} className="absolute inset-0" style={{ willChange: "transform" }}>
          <div
            className="absolute inset-0"
            style={
              empty
                ? {
                    background:
                      "radial-gradient(circle at 50% 42%, rgba(34,211,238,0.10) 0%, rgba(12,18,20,0.92) 58%, #070a0a 100%)",
                  }
                : {
                    background: `conic-gradient(from 0deg, ${gradient})`,
                    transform: "scale(1.08)",
                  }
            }
          />
            {empty ? (
              <>
                {Array.from({ length: 24 }, (_, i) => (
                  <div
                    key={`tick-${i}`}
                    className="pointer-events-none absolute inset-0"
                    style={{ transform: `rotate(${i * 15}deg)` }}
                    aria-hidden
                  >
                    <div
                      className="absolute left-1/2 -translate-x-1/2 rounded-full bg-cyan-300/25"
                      style={{ top: "5%", height: i % 3 === 0 ? "8%" : "4.5%", width: i % 3 === 0 ? 2 : 1 }}
                    />
                  </div>
                ))}
                <div
                  className="jackpot-wait-spin absolute inset-[11%] rounded-full border-2 border-dashed border-cyan-400/40"
                  aria-hidden
                />
              </>
            ) : null}
            {highlight && !empty ? (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `conic-gradient(from ${highlight.start}deg, ${
                    done ? "rgba(251,191,36,0.32)" : "rgba(255,255,255,0.26)"
                  } 0deg ${highlight.sweep}deg, transparent ${highlight.sweep}deg 360deg)`,
                }}
              />
            ) : null}
            {slices.length >= 2
              ? slices.map((s) => (
                  <div
                    key={`sep-${s.ticket.playerId}-${s.index}`}
                    className="pointer-events-none absolute inset-0"
                    style={{ transform: `rotate(${s.start}deg)` }}
                    aria-hidden
                  >
                    <div
                      className="absolute left-1/2 -translate-x-1/2 bg-[#050808]"
                      style={{
                        top: 0,
                        height: "26.5%",
                        width: 2,
                      }}
                    />
                  </div>
                ))
              : null}
            {slices.map((s) => {
              if (s.sweep < AVATAR_MIN_SWEEP) return null;
              const mid = s.start + s.sweep / 2;
              const rad = (mid * Math.PI) / 180;
              const r = 36;
              const left = 50 + r * Math.sin(rad);
              const top = 50 - r * Math.cos(rad);
              const size = s.sweep < 22 ? 22 : s.sweep < 40 ? 28 : 34;
              const kind = s.ticket.kind ?? (s.ticket.name === "You" ? "you" : "player");
              return (
                <div
                  key={`${s.ticket.playerId}-${s.index}`}
                  className="pointer-events-none absolute z-10"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span
                    className="inline-block"
                    style={{
                      transform: `scale(${highlight?.index === s.index && spinToken > 0 && !done ? 1.12 : 1})`,
                      filter: highlight?.index === s.index && spinToken > 0 ? "brightness(1.15)" : undefined,
                    }}
                  >
                    <PlayerAvatar
                      src={s.ticket.avatar}
                      name={s.ticket.name}
                      color={s.ticket.color}
                      size={size}
                      kind={kind}
                    />
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{
              background:
                "conic-gradient(from 210deg, #ecfeff, #67e8f9 14%, #155e75 32%, #a5f3fc 48%, #083344 66%, #22d3ee 82%, #ecfeff)",
              WebkitMaskImage:
                "radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 10px))",
              maskImage:
                "radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 10px))",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            }}
            aria-hidden
          />
        </div>

        {countdownProgress != null && countdown != null ? (
          <svg
            className="pointer-events-none absolute inset-[23%] z-20 -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(239,68,68,0.28)" strokeWidth="5" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#ef4444"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={2 * Math.PI * 45 * (1 - countdownProgress)}
            />
          </svg>
        ) : null}

        <div
          className={clsx(
            "absolute z-10 grid place-items-center rounded-full bg-[#070c0d] ring-1 ring-cyan-100/15",
            done && "ring-amber-300/45",
          )}
          style={{ inset: HUB_INSET }}
        >
          <div className="flex max-w-[92%] flex-col items-center px-2 text-center" aria-live="polite">
            {winnerName ? (
              <>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300">Winner</p>
                <p className="mt-0.5 max-w-full truncate text-sm font-semibold text-white">{winnerName}</p>
                <div className="mt-1">
                  <AnimatedPot value={potValue} label={potLabel} size="hub" currency={currency} />
                </div>
              </>
            ) : (
              <>
                <AnimatedPot value={potValue} label={potLabel} size="hub" currency={currency} />
                {countdown != null ? (
                  <p className="mt-0.5 font-mono text-2xl font-black tabular-nums text-red-400 sm:text-3xl">
                    {countdown}
                  </p>
                ) : spinToken > 0 && !done ? (
                  <p className="mt-0.5 max-w-full truncate text-xs font-medium text-cyan-200">
                    {pointerName ?? "Spinning"}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {empty ? "Waiting" : "Open"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Slice = { ticket: JackpotTicket; start: number; sweep: number; index: number };

function conicFromSlices(slices: Slice[]): string {
  if (slices.length === 0) return "";
  if (slices.length === 1) {
    const only = slices[0];
    return `${only.ticket.color} ${only.start}deg ${only.start + only.sweep}deg`;
  }
  // Dark notches at each boundary so two same-color tickets never visually merge.
  const GAP = 1.15;
  return slices
    .map((s) => {
      const end = s.start + s.sweep;
      const innerEnd = end - Math.min(GAP, Math.max(0.35, s.sweep * 0.28));
      return `${s.ticket.color} ${s.start}deg ${innerEnd}deg, #050808 ${innerEnd}deg ${end}deg`;
    })
    .join(", ");
}

function buildSlices(tickets: JackpotTicket[]): Slice[] {
  let acc = 0;
  return tickets.map((ticket, index) => {
    const start = acc * 360;
    const sweep = ticket.weight * 360;
    acc += ticket.weight;
    return { ticket, start, sweep, index };
  });
}

function sliceAtTop(slices: Slice[], rotationDeg: number): Slice | null {
  if (slices.length === 0) return null;
  const atTop = ((360 - (rotationDeg % 360)) + 360) % 360;
  for (const slice of slices) {
    if (atTop >= slice.start && atTop < slice.start + slice.sweep) return slice;
  }
  return slices[slices.length - 1];
}
