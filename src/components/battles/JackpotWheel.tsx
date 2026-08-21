import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { slowBrake } from "../../lib/easing";
import { sound } from "../../lib/sound";

export interface JackpotTicket {
  playerId: string;
  name: string;
  color: string;
  weight: number; // 0..1, sums to 1 across all tickets
  avatar?: string | null;
}

const LOOP_BASE_WIDTH = 1400;
const MIN_SEGMENT_WIDTH = 52;
const LOOPS = 5;
const LAND_LOOP = 3;

type LoopSeg = { ticket: JackpotTicket; width: number };

function buildLoopSegments(tickets: JackpotTicket[]): LoopSeg[] {
  return tickets.map((t) => ({ ticket: t, width: Math.max(MIN_SEGMENT_WIDTH, t.weight * LOOP_BASE_WIDTH) }));
}

function segmentAt(pointerX: number, strip: LoopSeg[]): { index: number; seg: LoopSeg } | null {
  if (strip.length === 0) return null;
  let acc = 0;
  for (let i = 0; i < strip.length; i++) {
    const next = acc + strip[i].width;
    if (pointerX < next) return { index: i, seg: strip[i] };
    acc = next;
  }
  return { index: strip.length - 1, seg: strip[strip.length - 1] };
}

export function JackpotWheel({
  tickets,
  spinToken,
  winnerId,
  duration = 12000,
  compact = false,
  onFinished,
}: {
  tickets: JackpotTicket[];
  spinToken: number;
  winnerId: string | null;
  duration?: number;
  compact?: boolean;
  onFinished?: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastIndexRef = useRef(-1);

  const loopSegments = buildLoopSegments(tickets);
  const loopWidth = loopSegments.reduce((s, seg) => s + seg.width, 0);
  const fullStrip = Array.from({ length: LOOPS }, () => loopSegments).flat();
  const activeSeg = activeIndex >= 0 ? fullStrip[activeIndex] : undefined;
  const activeColor = activeSeg?.ticket.color ?? "#ffffff";

  useEffect(() => {
    if (spinToken === 0 || !winnerId) return;
    setDone(false);
    setActiveIndex(-1);
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
    lastIndexRef.current = -1;

    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = slowBrake(t);
      const pos = targetOffset * eased;
      setOffset(pos);

      const hit = segmentAt(pos + containerWidth / 2, fullStrip);
      if (hit && hit.index !== lastIndexRef.current) {
        lastIndexRef.current = hit.index;
        setActiveIndex(hit.index);
        if (t < 1) sound.jackpotSpin();
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setOffset(targetOffset);
        const landed = segmentAt(targetOffset + containerWidth / 2, fullStrip);
        if (landed) setActiveIndex(landed.index);
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tickets.map((t) => {
          const lit = activeSeg?.ticket.playerId === t.playerId;
          return (
            <div
              key={t.playerId}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150",
                lit ? "scale-105 text-white shadow-lg" : "border-white/10 text-slate-400",
              )}
              style={
                lit
                  ? { borderColor: t.color, background: `${t.color}28`, boxShadow: `0 0 18px ${t.color}55` }
                  : undefined
              }
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
              {t.name}
              <span className="font-mono text-[10px] opacity-80">{(t.weight * 100).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <div
        ref={containerRef}
        className={clsx(
          "relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-[inset_0_0_28px_rgba(0,0,0,0.55)]",
          compact ? "h-20" : "h-24",
        )}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-1.5 -translate-x-1/2 rounded-full"
          style={{ background: activeColor, boxShadow: `0 0 0 2px ${activeColor}, 0 0 18px ${activeColor}, 0 0 36px ${activeColor}` }}
        />
        <div
          className="pointer-events-none absolute -top-1.5 left-1/2 z-20 h-4 w-4 -translate-x-1/2 rotate-45"
          style={{ background: activeColor, boxShadow: `0 0 12px ${activeColor}` }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black/80 to-transparent" />
        <div className="absolute top-0 flex h-full will-change-transform" style={{ transform: `translateX(${-offset}px)` }}>
          {fullStrip.map((seg, i) => {
            const lit = i === activeIndex;
            return (
              <div
                key={i}
                className="relative flex h-full shrink-0 flex-col items-center justify-center overflow-hidden text-xs font-bold text-white"
                style={{
                  width: seg.width,
                  background: `linear-gradient(180deg, ${seg.ticket.color}ee, ${seg.ticket.color}66)`,
                  filter: lit ? "brightness(1.45) saturate(1.25)" : "brightness(0.42) saturate(0.75)",
                  boxShadow: lit
                    ? `inset 0 0 0 3px rgba(255,255,255,0.9), 0 0 28px ${seg.ticket.color}`
                    : "inset 1px 0 0 #94a3b8, inset -1px 0 0 #94a3b8",
                  zIndex: lit ? 2 : 1,
                  transform: lit ? "scaleY(1.12)" : "scaleY(0.92)",
                  transition: "filter 70ms linear, box-shadow 70ms linear, transform 70ms linear",
                }}
              >
                <span className="truncate px-1 drop-shadow">{seg.ticket.name}</span>
                <span className="text-[10px] font-medium opacity-85">{(seg.ticket.weight * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {activeSeg && !done && (
        <p className="text-center text-sm font-medium text-slate-300">
          Pointer on{" "}
          <span className="font-semibold" style={{ color: activeColor }}>
            {activeSeg.ticket.name}
          </span>
        </p>
      )}
      {done && winnerId && (
        <p className="text-center text-sm font-semibold text-amber-300">
          {tickets.find((t) => t.playerId === winnerId)?.name} takes the jackpot!
        </p>
      )}
    </div>
  );
}
