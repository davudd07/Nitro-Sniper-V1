import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { longBrake } from "../../lib/easing";
import { sound } from "../../lib/sound";
import { JACKPOT_COUNTDOWN_MS } from "../../store/jackpotStore";
import type { JackpotTicket } from "../battles/JackpotWheel";
import { PlayerAvatar } from "../identity/PlayerAvatar";

const DURATION_MS = 12000;
const EXTRA_SPINS = 12;
const HUB_INSET = "22%";

export function JackpotCircleWheel({
  tickets,
  spinToken,
  winnerId,
  shouldSpin = true,
  countdown = null,
  countdownEndsAt = null,
  onFinished,
  onPointerChange,
}: {
  tickets: JackpotTicket[];
  spinToken: number;
  winnerId: string | null;
  shouldSpin?: boolean;
  countdown?: number | null;
  countdownEndsAt?: number | null;
  onFinished?: () => void;
  onPointerChange?: (playerId: string | null) => void;
}) {
  const [done, setDone] = useState(false);
  const [hotIndex, setHotIndex] = useState(-1);
  const [ring, setRing] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastSliceRef = useRef(-1);
  const wheelRef = useRef<HTMLDivElement>(null);
  const onPointerRef = useRef(onPointerChange);
  onPointerRef.current = onPointerChange;

  const slices = buildSlices(tickets);
  const spinning = spinToken > 0 && shouldSpin && !done;
  const hot = hotIndex >= 0 ? slices[hotIndex] : undefined;
  const hotColor = hot?.ticket.color ?? "#22d3ee";

  useEffect(() => {
    if (spinToken === 0) {
      setDone(false);
      setHotIndex(-1);
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
    const winnerSlice = winner;

    const jitter = (Math.random() - 0.5) * winnerSlice.sweep * 0.55;
    const winnerMid = winnerSlice.start + winnerSlice.sweep / 2;
    const target = EXTRA_SPINS * 360 + (360 - winnerMid) + jitter;

    const start = performance.now();
    if (wheelRef.current) wheelRef.current.style.transform = "rotate(0deg)";

    function frame(now: number) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = longBrake(t);
      const deg = target * eased;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${deg}deg)`;

      const atTop = sliceAtTop(slices, deg);
      if (atTop && atTop.index !== lastSliceRef.current) {
        lastSliceRef.current = atTop.index;
        setHotIndex(atTop.index);
        onPointerRef.current?.(atTop.ticket.playerId);
        if (t < 1) sound.jackpotSpin();
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        if (wheelRef.current) wheelRef.current.style.transform = `rotate(${target}deg)`;
        setDone(true);
        setHotIndex(winnerSlice.index);
        onPointerRef.current?.(winnerSlice.ticket.playerId);
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

  useEffect(() => {
    if (countdownEndsAt == null) {
      setRing(1);
      return;
    }
    const id = window.setInterval(() => {
      const left = countdownEndsAt - Date.now();
      setRing(Math.max(0, Math.min(1, left / JACKPOT_COUNTDOWN_MS)));
    }, 80);
    return () => window.clearInterval(id);
  }, [countdownEndsAt]);

  const gradient = conicFromSlices(slices);
  const winnerName = done && winnerId ? tickets.find((t) => t.playerId === winnerId)?.name : null;
  const pointerName = spinning && hot ? hot.ticket.name : null;
  const circumference = 2 * Math.PI * 46;

  return (
    <div className="relative mx-auto w-full max-w-[22rem] sm:max-w-md">
      <div className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2" style={{ top: -6 }} aria-hidden>
        <svg width="22" height="16" viewBox="0 0 22 16" className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]">
          <polygon points="11,16 0,0 22,0" fill="#ecfeff" />
          <polygon points="11,13 4,2 18,2" fill="#22d3ee" />
        </svg>
      </div>

      <div className="relative mx-auto aspect-square w-full">
        {countdownEndsAt != null && countdown != null && countdown > 0 ? (
          <svg className="pointer-events-none absolute inset-[-8px] z-20 -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(34,211,238,0.12)" strokeWidth="2.5" />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ring)}
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
            />
          </svg>
        ) : null}

        <div
          className={clsx(
            "absolute inset-0 rounded-full",
            done ? "ring-[3px] ring-amber-300/70" : "ring-[3px] ring-cyan-300/25",
          )}
          style={
            spinning
              ? { boxShadow: `0 0 0 1px ${hotColor}55, 0 0 28px ${hotColor}33` }
              : done
                ? { boxShadow: "0 0 36px rgba(251,191,36,0.28)" }
                : { boxShadow: "0 0 28px rgba(0,0,0,0.45)" }
          }
        />

        <div ref={wheelRef} className="absolute inset-[5px] rounded-full" style={{ willChange: "transform" }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: slices.length ? `conic-gradient(from 0deg, ${gradient})` : "#152020",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
            }}
          />
          {slices.map((s) => (
            <div
              key={`sep-${s.index}`}
              className="pointer-events-none absolute inset-0"
              style={{ transform: `rotate(${s.start}deg)` }}
            >
              <div className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-black/55" />
            </div>
          ))}
          {slices.map((s) => {
            if (s.sweep < 10) return null;
            const mid = s.start + s.sweep / 2;
            const rad = (mid * Math.PI) / 180;
            const r = 39;
            const left = 50 + r * Math.sin(rad);
            const top = 50 - r * Math.cos(rad);
            const size = s.sweep < 16 ? 20 : s.sweep < 28 ? 26 : 32;
            const lit = spinning && s.index === hotIndex;
            return (
              <div
                key={`${s.ticket.playerId}-${s.index}`}
                className="pointer-events-none absolute z-10"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: `translate(-50%, -50%) scale(${lit ? 1.12 : 1})`,
                  filter: lit ? "brightness(1.2)" : undefined,
                }}
              >
                <PlayerAvatar
                  src={s.ticket.avatar}
                  name={s.ticket.name}
                  color={s.ticket.color}
                  size={size}
                  kind={s.ticket.name === "You" ? "you" : "player"}
                />
              </div>
            );
          })}
        </div>

        <div
          className={clsx(
            "absolute z-10 grid place-items-center rounded-full bg-bg-950 ring-1",
            done ? "ring-amber-300/40" : "ring-white/10",
          )}
          style={{ inset: HUB_INSET }}
        >
          <div className="px-3 text-center">
            {winnerName ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Winner</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{winnerName}</p>
              </>
            ) : pointerName ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Pointer</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{pointerName}</p>
              </>
            ) : countdown != null ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Starts in</p>
                <p className="mt-0.5 font-mono text-4xl font-black tabular-nums text-white">{countdown}</p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Jackpot</p>
                <p className="mt-1 text-xs text-slate-400">{slices.length === 0 ? "Waiting" : "Need 1 more"}</p>
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
  return slices.map((s) => `${s.ticket.color} ${s.start}deg ${s.start + s.sweep}deg`).join(", ");
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
  const atTop = (((360 - (rotationDeg % 360)) + 360) % 360);
  for (const slice of slices) {
    if (atTop >= slice.start && atTop < slice.start + slice.sweep) return slice;
  }
  return slices[slices.length - 1] ?? null;
}
