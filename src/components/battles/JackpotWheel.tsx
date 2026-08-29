import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { slowBrake } from "../../lib/easing";
import { sound } from "../../lib/sound";
import { PlayerAvatar } from "../identity/PlayerAvatar";
import { RoleBadge } from "../identity/RoleBadge";
import { useIdentityStore } from "../../store/identityStore";

export interface JackpotTicket {
  playerId: string;
  name: string;
  color: string;
  weight: number; // 0..1, sums to 1 across all tickets
  avatar?: string | null;
  kind?: "you" | "bot" | "player";
}

const LOOP_BASE_WIDTH = 1400;
const MIN_SEGMENT_WIDTH = 52;
const CIRCLE_SLOT = 80;
const CIRCLE_SLOT_COMPACT = 68;
const LOOPS = 5;
const LAND_LOOP = 3;

/** Battle jackpot strip (not the circle jackpot game): spin + slow brake. */
export const BATTLE_JACKPOT_SPIN_MS = 14000;
/**
 * Pause after the strip is visually parked before overlay / payout.
 * Previously the overlay waited until t=1 — about 4900ms after remaining
 * travel dropped under 1px with slowBrake^8 on a 14s spin.
 */
export const BATTLE_JACKPOT_SETTLE_MS = 400;
const VISUAL_STOP_PX = 1;

type LoopSeg = { ticket: JackpotTicket; width: number };

function buildLoopSegments(tickets: JackpotTicket[], variant: "bars" | "circles", compact: boolean): LoopSeg[] {
  if (variant !== "circles") {
    return tickets.map((t) => ({ ticket: t, width: Math.max(MIN_SEGMENT_WIDTH, t.weight * LOOP_BASE_WIDTH) }));
  }
  if (tickets.length === 0) return [];
  const slot = compact ? CIRCLE_SLOT_COMPACT : CIRCLE_SLOT;
  // Repeat the player row so one loop stays ~LOOP_BASE_WIDTH — same travel, same 14s roll.
  const repeats = Math.max(1, Math.ceil(LOOP_BASE_WIDTH / (tickets.length * slot)));
  const segs: LoopSeg[] = [];
  for (let r = 0; r < repeats; r++) {
    for (const t of tickets) segs.push({ ticket: t, width: slot });
  }
  return segs;
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
  duration = BATTLE_JACKPOT_SPIN_MS,
  compact = false,
  settleDelayMs = BATTLE_JACKPOT_SETTLE_MS,
  finishVerb = "takes the jackpot",
  variant = "bars",
  onFinished,
}: {
  tickets: JackpotTicket[];
  spinToken: number;
  winnerId: string | null;
  duration?: number;
  compact?: boolean;
  settleDelayMs?: number;
  finishVerb?: string;
  variant?: "bars" | "circles";
  onFinished?: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndexRef = useRef(-1);

  const loopSegments = buildLoopSegments(tickets, variant, compact);
  const loopWidth = loopSegments.reduce((s, seg) => s + seg.width, 0);
  const fullStrip = Array.from({ length: LOOPS }, () => loopSegments).flat();
  const activeSeg = activeIndex >= 0 ? fullStrip[activeIndex] : undefined;
  const activeColor = variant === "circles" ? "#f8fafc" : (activeSeg?.ticket.color ?? "#ffffff");

  useEffect(() => {
    if (spinToken === 0 || !winnerId) return;
    setDone(false);
    setActiveIndex(-1);
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
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
    let parked = false;

    function parkAndSettle() {
      if (parked) return;
      parked = true;
      setOffset(targetOffset);
      const landed = segmentAt(targetOffset + containerWidth / 2, fullStrip);
      if (landed) setActiveIndex(landed.index);
      setDone(true);
      sound.jackpotWin();
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        onFinished?.();
      }, settleDelayMs);
    }

    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = slowBrake(t);
      const pos = targetOffset * eased;
      setOffset(pos);

      const hit = segmentAt(pos + containerWidth / 2, fullStrip);
      if (hit && hit.index !== lastIndexRef.current) {
        lastIndexRef.current = hit.index;
        setActiveIndex(hit.index);
        if (t < 1 && !parked) sound.jackpotSpin();
      }

      const remaining = Math.abs(targetOffset - pos);
      if (!parked && (remaining <= VISUAL_STOP_PX || t >= 1)) {
        parkAndSettle();
        return;
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        parkAndSettle();
      }
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tickets.map((t) => {
          const lit = activeSeg?.ticket.playerId === t.playerId;
          return <TicketChip key={t.playerId} ticket={t} lit={lit} variant={variant} />;
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
            if (variant === "circles") {
              return <CircleSlot key={i} ticket={seg.ticket} width={seg.width} lit={lit} compact={compact} />;
            }
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
          <span className="font-semibold" style={{ color: variant === "circles" ? "#e2e8f0" : activeColor }}>
            {activeSeg.ticket.name}
          </span>
        </p>
      )}
      {done && winnerId && (
        <p className="text-center text-sm font-semibold text-amber-300">
          {tickets.find((t) => t.playerId === winnerId)?.name} {finishVerb}!
        </p>
      )}
    </div>
  );
}

function CircleSlot({
  ticket,
  width,
  lit,
  compact,
}: {
  ticket: JackpotTicket;
  width: number;
  lit: boolean;
  compact: boolean;
}) {
  const avatar = useIdentityStore((s) => s.avatarFor(ticket.name));
  const size = compact ? (lit ? 52 : 44) : lit ? 64 : 54;
  return (
    <div
      className="relative flex h-full shrink-0 items-center justify-center"
      style={{ width, zIndex: lit ? 2 : 1 }}
    >
      <span
        className="rounded-full transition-[transform,box-shadow,opacity] duration-75"
        style={{
          transform: lit ? "scale(1.12)" : "scale(0.92)",
          opacity: lit ? 1 : 0.55,
          boxShadow: lit ? "0 0 0 3px rgba(248,250,252,0.95), 0 0 22px rgba(248,250,252,0.45)" : "none",
        }}
      >
        <PlayerAvatar
          src={ticket.avatar ?? avatar}
          name={ticket.name}
          color={ticket.color}
          size={size}
          kind={ticket.kind ?? (ticket.name === "You" ? "you" : "player")}
        />
      </span>
    </div>
  );
}

function TicketChip({
  ticket,
  lit,
  variant,
}: {
  ticket: JackpotTicket;
  lit: boolean;
  variant: "bars" | "circles";
}) {
  const role = useIdentityStore((s) => s.roleFor(ticket.name));
  const avatar = useIdentityStore((s) => s.avatarFor(ticket.name));
  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150",
        lit ? "scale-105 text-white shadow-lg" : "border-white/10 text-slate-400",
      )}
      style={
        lit
          ? variant === "circles"
            ? { borderColor: "rgba(248,250,252,0.55)", background: "rgba(248,250,252,0.08)", boxShadow: "0 0 18px rgba(248,250,252,0.18)" }
            : { borderColor: ticket.color, background: `${ticket.color}28`, boxShadow: `0 0 18px ${ticket.color}55` }
          : undefined
      }
    >
      {variant === "circles" ? (
        <PlayerAvatar
          src={ticket.avatar ?? avatar}
          name={ticket.name}
          color={ticket.color}
          size={16}
          kind={ticket.kind ?? (ticket.name === "You" ? "you" : "player")}
        />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: ticket.color }} />
      )}
      {ticket.name}
      <RoleBadge role={role} />
      <span className="font-mono text-[10px] opacity-80">{(ticket.weight * 100).toFixed(1)}%</span>
    </div>
  );
}
