import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { easeOutBack } from "../../lib/easing";
import { sound } from "../../lib/sound";

export interface JackpotTicket {
  playerId: string;
  name: string;
  color: string;
  weight: number; // 0..1, sums to 1 across all tickets
}

const LOOP_BASE_HEIGHT = 1100;
const MIN_SEGMENT_HEIGHT = 48;
const LOOPS = 5;
const LAND_LOOP = 3;

function buildLoopSegments(tickets: JackpotTicket[]) {
  return tickets.map((t) => ({ ticket: t, height: Math.max(MIN_SEGMENT_HEIGHT, t.weight * LOOP_BASE_HEIGHT) }));
}

export function JackpotWheel({
  tickets,
  spinToken,
  winnerId,
  duration = 8200,
  onFinished,
}: {
  tickets: JackpotTicket[];
  spinToken: number;
  winnerId: string | null;
  duration?: number;
  onFinished?: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const activeIndexRef = useRef(-1);
  const lastTickRef = useRef(-1);

  const loopSegments = buildLoopSegments(tickets);
  const loopHeight = loopSegments.reduce((s, seg) => s + seg.height, 0);
  const fullStrip = Array.from({ length: LOOPS }, () => loopSegments).flat();

  // Precompute each segment's [start, end) pixel range within the full strip.
  const ranges = (() => {
    let acc = 0;
    return fullStrip.map((seg) => {
      const r = { start: acc, end: acc + seg.height };
      acc += seg.height;
      return r;
    });
  })();

  function setActive(index: number) {
    if (activeIndexRef.current === index) return;
    const prev = segmentRefs.current[activeIndexRef.current];
    if (prev) prev.classList.remove("jackpot-seg-active");
    const cur = segmentRefs.current[index];
    if (cur) cur.classList.add("jackpot-seg-active");
    activeIndexRef.current = index;
  }

  useEffect(() => {
    if (spinToken === 0 || !winnerId) return;
    setDone(false);
    activeIndexRef.current = -1;
    lastTickRef.current = -1;
    const containerHeight = containerRef.current?.clientHeight ?? 380;

    const winnerIdxInLoop = loopSegments.findIndex((s) => s.ticket.playerId === winnerId);
    if (winnerIdxInLoop === -1) return;

    let yBeforeWinner = LAND_LOOP * loopHeight;
    for (let i = 0; i < winnerIdxInLoop; i++) yBeforeWinner += loopSegments[i].height;
    const winnerHeight = loopSegments[winnerIdxInLoop].height;
    const jitter = (Math.random() * 0.5 + 0.25) * winnerHeight;
    const landingCenter = yBeforeWinner + jitter;
    const targetOffset = landingCenter - containerHeight / 2;

    const start = performance.now();

    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = t > 0.92 ? easeOutBack(t) : 1 - Math.pow(1 - t, 5);
      const pos = targetOffset * Math.min(1, eased);
      setOffset(pos);

      const pointerPos = pos + containerHeight / 2;
      const idx = ranges.findIndex((r) => pointerPos >= r.start && pointerPos < r.end);
      if (idx >= 0) setActive(idx);

      const tickIdx = Math.floor(pointerPos / MIN_SEGMENT_HEIGHT);
      if (tickIdx !== lastTickRef.current && t < 1) {
        lastTickRef.current = tickIdx;
        sound.jackpotSpin();
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setOffset(targetOffset);
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

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-center">
      <div
        ref={containerRef}
        className={clsx(
          "relative h-[380px] w-full max-w-[220px] overflow-hidden rounded-2xl border bg-bg-950/80 shadow-inner transition-shadow duration-500",
          done ? "border-amber-400/70 shadow-[0_0_36px_rgba(251,191,36,0.4)]" : "border-amber-400/25",
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-1 -translate-y-1/2 bg-white shadow-[0_0_14px_white]" />
        <div className="pointer-events-none absolute -left-1 top-1/2 z-10 h-3 w-3 -translate-y-1/2 rotate-45 bg-white" />
        <div className="pointer-events-none absolute -right-1 top-1/2 z-10 h-3 w-3 -translate-y-1/2 rotate-45 bg-white" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-bg-950 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-bg-950 to-transparent" />

        <div className="absolute left-0 w-full" style={{ transform: `translateY(${-offset}px)` }}>
          {fullStrip.map((seg, i) => (
            <div
              key={i}
              ref={(el) => {
                segmentRefs.current[i] = el;
              }}
              className="jackpot-seg flex w-full flex-col items-center justify-center border-b border-black/30 text-xs font-bold text-white transition-all duration-150"
              style={{ height: seg.height, background: `linear-gradient(90deg, ${seg.ticket.color}dd, ${seg.ticket.color}88)` }}
            >
              <span className="truncate px-1">{seg.ticket.name}</span>
              <span className="text-[10px] font-normal opacity-80">{(seg.ticket.weight * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center gap-1.5 sm:w-32">
        {tickets.map((t) => (
          <div
            key={t.playerId}
            className={clsx(
              "flex items-center justify-between rounded-lg border px-2 py-1 text-[11px] transition-all duration-300",
              done && winnerId === t.playerId
                ? "scale-105 border-amber-400/70 bg-amber-400/10 font-bold text-amber-200"
                : "border-white/10 bg-black/20 text-slate-300",
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
              {t.name}
            </span>
            <span>{(t.weight * 100).toFixed(1)}%</span>
          </div>
        ))}
        {done && winnerId && (
          <p className="mt-1 text-center text-xs font-semibold text-amber-300">
            🎉 {tickets.find((t) => t.playerId === winnerId)?.name} wins!
          </p>
        )}
      </div>
    </div>
  );
}
