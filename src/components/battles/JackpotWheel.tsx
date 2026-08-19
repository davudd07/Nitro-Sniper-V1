import { useEffect, useRef, useState } from "react";
import { easeOutQuint } from "../../lib/easing";
import { sound } from "../../lib/sound";

export interface JackpotTicket {
  playerId: string;
  name: string;
  color: string;
  weight: number; // 0..1, sums to 1 across all tickets
}

const LOOP_BASE_WIDTH = 1400;
const MIN_SEGMENT_WIDTH = 46;
const LOOPS = 5;
const LAND_LOOP = 3;

function buildLoopSegments(tickets: JackpotTicket[]) {
  return tickets.map((t) => ({ ticket: t, width: Math.max(MIN_SEGMENT_WIDTH, t.weight * LOOP_BASE_WIDTH) }));
}

export function JackpotWheel({
  tickets,
  spinToken,
  winnerId,
  duration = 8000,
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
  const rafRef = useRef<number | null>(null);
  const lastBoundaryRef = useRef(-1);

  const loopSegments = buildLoopSegments(tickets);
  const loopWidth = loopSegments.reduce((s, seg) => s + seg.width, 0);
  const fullStrip = Array.from({ length: LOOPS }, () => loopSegments).flat();

  useEffect(() => {
    if (spinToken === 0 || !winnerId) return;
    setDone(false);
    const containerWidth = containerRef.current?.clientWidth ?? 320;

    const winnerIdxInLoop = loopSegments.findIndex((s) => s.ticket.playerId === winnerId);
    if (winnerIdxInLoop === -1) return;

    let xBeforeWinner = LAND_LOOP * loopWidth;
    for (let i = 0; i < winnerIdxInLoop; i++) xBeforeWinner += loopSegments[i].width;
    const winnerWidth = loopSegments[winnerIdxInLoop].width;
    const jitter = (Math.random() * 0.5 + 0.25) * winnerWidth;
    const landingCenter = xBeforeWinner + jitter;
    const targetOffset = landingCenter - containerWidth / 2;

    const start = performance.now();
    lastBoundaryRef.current = -1;

    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutQuint(t);
      const pos = targetOffset * eased;
      setOffset(pos);

      const boundaryIndex = Math.floor(pos / MIN_SEGMENT_WIDTH);
      if (boundaryIndex !== lastBoundaryRef.current && t < 1) {
        lastBoundaryRef.current = boundaryIndex;
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
    <div>
      <div ref={containerRef} className="relative h-20 w-full overflow-hidden rounded-xl border border-amber-400/30 bg-bg-950/80">
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-1 -translate-x-1/2 bg-white shadow-[0_0_12px_white]" />
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-bg-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-bg-950 to-transparent" />
        <div className="absolute top-0 flex h-full" style={{ transform: `translateX(${-offset}px)` }}>
          {fullStrip.map((seg, i) => (
            <div
              key={i}
              className="flex h-full shrink-0 flex-col items-center justify-center border-r border-black/30 text-xs font-bold text-white"
              style={{ width: seg.width, background: `linear-gradient(180deg, ${seg.ticket.color}dd, ${seg.ticket.color}77)` }}
            >
              <span className="truncate px-1">{seg.ticket.name}</span>
              <span className="text-[10px] font-normal opacity-80">{(seg.ticket.weight * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
      {done && winnerId && (
        <p className="mt-2 text-center text-sm font-semibold text-amber-300">
          🎉 {tickets.find((t) => t.playerId === winnerId)?.name} takes the jackpot!
        </p>
      )}
    </div>
  );
}
