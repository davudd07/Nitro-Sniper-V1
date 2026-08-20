import { useEffect, useRef, useState } from "react";
import { longBrake } from "../../lib/easing";
import { sound } from "../../lib/sound";
import type { JackpotTicket } from "../battles/JackpotWheel";

const DURATION_MS = 22000;
const EXTRA_SPINS = 16;

export function JackpotCircleWheel({
  tickets,
  spinToken,
  winnerId,
  shouldSpin = true,
  onFinished,
}: {
  tickets: JackpotTicket[];
  spinToken: number;
  winnerId: string | null;
  shouldSpin?: boolean;
  onFinished?: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastSliceRef = useRef(-1);

  const slices = buildSlices(tickets);

  useEffect(() => {
    if (spinToken === 0 || !winnerId || slices.length === 0 || !shouldSpin) return;
    setDone(false);
    lastSliceRef.current = -1;

    const winner = slices.find((s) => s.ticket.playerId === winnerId);
    if (!winner) return;

    const jitter = (Math.random() - 0.5) * winner.sweep * 0.55;
    const winnerMid = winner.start + winner.sweep / 2;
    // Arrow sits at 0deg (top). Rotate clockwise so winnerMid lands under it.
    const target = EXTRA_SPINS * 360 + (360 - winnerMid) + jitter;

    const start = performance.now();

    function frame(now: number) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = longBrake(t);
      const deg = target * eased;
      setRotation(deg);

      const atTop = sliceAtTop(slices, deg);
      if (atTop && atTop.index !== lastSliceRef.current) {
        lastSliceRef.current = atTop.index;
        if (t < 1) sound.jackpotSpin();
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setRotation(target);
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

  const gradient = slices
    .map((s) => `${s.ticket.color} ${s.start}deg ${s.start + s.sweep}deg`)
    .join(", ");

  const winnerName = done && winnerId ? tickets.find((t) => t.playerId === winnerId)?.name : null;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
        style={{ top: -2 }}
        aria-hidden
      >
        <div
          className="h-0 w-0"
          style={{
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderTop: "18px solid #f8fafc",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.55))",
          }}
        />
      </div>

      <div className="relative mx-auto aspect-square w-full">
        <div
          className="absolute inset-0 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.45)] ring-4 ring-white/10"
          style={{
            background: slices.length ? `conic-gradient(from 0deg, ${gradient})` : "#1c1c28",
            transform: `rotate(${rotation}deg)`,
            willChange: "transform",
          }}
        />
        <div className="absolute inset-[22%] grid place-items-center rounded-full bg-bg-950 ring-2 ring-white/10">
          <div className="px-3 text-center">
            {winnerName ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Winner</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{winnerName}</p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Jackpot</p>
                <p className="mt-1 text-xs text-slate-400">{spinToken === 0 ? "Waiting" : "Spinning"}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Slice = { ticket: JackpotTicket; start: number; sweep: number; index: number };

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