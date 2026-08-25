import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, ChevronDown, Lamp, Menu, ShieldCheck, Trees } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { sound } from "../lib/sound";
import { formatCash } from "../lib/format";
import { LockAmountInput } from "../components/ui/LockAmountInput";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { DemoBetBadge } from "../components/ui/DemoBetBadge";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { WinLeaderStageMark } from "../components/layout/WinLeaderBadge";
import { HOUSE_EDGE } from "../lib/rakeback";
import { takeStake } from "../lib/stake";
import {
  ROAD_DIFFICULTIES,
  formatRoadHit,
  formatRoadMulti,
  formatRoadMultiShort,
  roadDifficulty,
  roadLaneHits,
  roadMultiplier,
  roadPayout,
  roadSeedMaxMulti,
  roadSeedMaxSteps,
  type RoadDifficulty,
} from "../lib/road";

const WALKER = "/images/road/walker.png";
const LANE_W = 112;
const SIDEWALK_W = 108;
const WALKER_SIZE = 88;
const JUMP_MS = 420;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function walkerLeft(steps: number): number {
  if (steps <= 0) return (SIDEWALK_W - WALKER_SIZE) / 2;
  return SIDEWALK_W + (steps - 1) * LANE_W + (LANE_W - WALKER_SIZE) / 2;
}

type Phase = "idle" | "playing" | "busted" | "cashed";

export function CrossRoad() {
  const [bet, setBet] = useState(100);
  const [diff, setDiff] = useState<RoadDifficulty>("easy");
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState(0);
  const [hits, setHits] = useState<boolean[]>([]);
  const [roundId, setRoundId] = useState(0);
  const [jumpToken, setJumpToken] = useState(0);
  const [splat, setSplat] = useState(false);
  const [splatLane, setSplatLane] = useState<number | null>(null);
  const [panning, setPanning] = useState(false);

  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const def = roadDifficulty(diff);
  const currentMulti = roadMultiplier(steps, diff);
  const nextMulti = roadMultiplier(steps + 1, diff);
  const potential = roadPayout(bet, steps, diff);
  const locked = phase === "playing" || busy;
  const roundOver = phase === "busted" || phase === "cashed";
  const seedMaxSteps = hits.length ? roadSeedMaxSteps(hits) : 0;
  const seedMaxMulti = hits.length ? roadSeedMaxMulti(hits, diff) : 1;
  const seedDeathLane = hits.findIndex(Boolean);
  const lastSafeLane = seedDeathLane < 0 ? (hits.length ? hits.length - 1 : -1) : seedDeathLane - 1;

  const walkerRef = useRef<HTMLDivElement>(null);
  const deathLaneRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ pointer: number; startX: number; startScroll: number; moved: boolean } | null>(null);

  useEffect(() => {
    const ahead = roundOver && seedDeathLane >= 0 && seedDeathLane + 1 > steps;
    const el = ahead ? deathLaneRef.current : walkerRef.current;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [steps, phase, roundId, seedDeathLane, roundOver, splat]);

  async function startGame() {
    if (phase === "playing" || busy) return;
    if (!takeStake(bet, HOUSE_EDGE.road)) {
      if (bet > 0) push(`You need ${formatCash(bet)} to cross.`, "danger");
      return;
    }
    setBusy(true);
    const rolls = await play(def.lanes);
    setHits(roadLaneHits(rolls, def.hit));
    setSteps(0);
    setJumpToken(0);
    setSplat(false);
    setSplatLane(null);
    setRoundId((n) => n + 1);
    setPhase("playing");
    setBusy(false);
    sound.chip();
  }

  function cashOut() {
    if (phase !== "playing" || steps <= 0 || busy) return;
    const paid = roadPayout(bet, steps, diff);
    if (paid > 0) credit(paid);
    recordRound(bet, paid, "road");
    setPhase("cashed");
    sound.win(currentMulti >= 10 ? "big" : "small");
    push(
      bet > 0 ? `Cashed out ${formatRoadMulti(currentMulti)} · ${formatCash(paid)}.` : `Demo · cashed at ${formatRoadMulti(currentMulti)}.`,
      "success",
    );
  }

  async function stepLane(index: number) {
    if (phase !== "playing" || busy || index !== steps) return;
    setBusy(true);
    sound.click();
    const dies = Boolean(hits[index]);
    if (dies) {
      setSplatLane(index);
      setSplat(true);
      sound.lose();
    }
    setJumpToken((n) => n + 1);
    setSteps(index + 1);
    await sleep(JUMP_MS);
    if (dies) {
      await sleep(220);
      setPhase("busted");
      recordRound(bet, 0, "road");
      const maxM = roadSeedMaxMulti(hits, diff);
      const maxSteps = roadSeedMaxSteps(hits);
      push(
        maxSteps <= 0
          ? bet > 0
            ? `Hit on lane 1. Lost ${formatCash(bet)}.`
            : "Demo · busted on lane 1."
          : `Hit on lane ${index + 1}. Seed max was ${formatRoadMulti(maxM)}.`,
        "danger",
      );
      setBusy(false);
      return;
    }
    const next = index + 1;
    sound.tick(Math.min(1, next / 10));
    if (next >= def.lanes) {
      const paid = roadPayout(bet, next, diff);
      if (paid > 0) credit(paid);
      recordRound(bet, paid, "road");
      setPhase("cashed");
      sound.win("big");
      push(`Cleared the road at ${formatRoadMulti(roadMultiplier(next, diff))}!`, "success");
    }
    setBusy(false);
  }

  const primaryIdle = bet > 0 ? "Bet" : "Demo bet";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Cross the Road</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Step lane by lane. Survive for a higher multiplier, or cash out before a car comes down the next lane.
          </p>
        </div>
        <InfoButton title="Cross the Road — Hit odds">
          <StatRow label="Easy hit" value={formatRoadHit(roadDifficulty("easy"))} />
          <StatRow label="Medium hit" value={formatRoadHit(roadDifficulty("medium"))} />
          <StatRow label="Hard hit" value={formatRoadHit(roadDifficulty("hard"))} />
          <StatRow label="Expert hit" value={formatRoadHit(roadDifficulty("expert"))} />
          <p>
            Each lane is rolled from the provably-fair seed. Hit chance is the same on every lane of a difficulty.
            Multipliers are the posted table for that difficulty — they are not derived from a flat RTP formula.
          </p>
        </InfoButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="surface p-5">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Bet amount</label>
            <div className="mb-4 flex items-center gap-2">
              <LockAmountInput
                valueWl={bet}
                onChangeWl={(wl) => setBet(Math.max(0, wl))}
                disabled={locked}
                className="min-w-0 flex-1"
                inputClassName="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={locked}
                onClick={() => setBet((b) => Math.max(0, Math.floor(b / 2)))}
                className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
              >
                ½
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => setBet((b) => b * 2)}
                className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
              >
                2×
              </button>
            </div>

            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Difficulty</label>
            <div className="relative mb-4">
              <select
                value={diff}
                disabled={locked}
                onChange={(e) => setDiff(e.target.value as RoadDifficulty)}
                className="w-full appearance-none rounded-lg bg-bg-900 px-3 py-2.5 pr-9 text-sm font-semibold text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
              >
                {ROAD_DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>

            {phase !== "playing" ? (
              <button type="button" onClick={() => void startGame()} disabled={busy} className="btn-cyan w-full py-3 disabled:opacity-50">
                {busy ? "Starting…" : primaryIdle}
              </button>
            ) : (
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={busy || steps >= def.lanes}
                  onClick={() => void stepLane(steps)}
                  className="btn-cyan w-full py-3 disabled:opacity-50"
                >
                  Go · {formatRoadMulti(nextMulti)}
                </button>
                <button
                  type="button"
                  onClick={cashOut}
                  disabled={steps === 0 || busy}
                  className="w-full rounded-lg bg-gradient-to-b from-lime-300 to-emerald-500 py-3 text-sm font-extrabold text-emerald-950 shadow-[0_4px_0_#14532d] hover:brightness-110 disabled:opacity-40"
                >
                  {steps > 0 ? (
                    <span className="inline-flex items-center justify-center gap-1">
                      Cash out · <CashAmount wl={potential} iconClassName="h-4 w-4" />
                    </span>
                  ) : (
                    "Cash out"
                  )}
                </button>
              </div>
            )}
            <DemoBetBadge active={bet <= 0} className="mt-3" />
            {phase === "playing" && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg bg-black/35 p-2 ring-1 ring-white/8">
                  <p className="text-slate-500">Now</p>
                  <p className="font-mono text-base font-bold text-emerald-300">{formatRoadMulti(currentMulti)}</p>
                </div>
                <div className="rounded-lg bg-black/35 p-2 ring-1 ring-white/8">
                  <p className="text-slate-500">Next</p>
                  <p className="font-mono text-base font-bold text-cyan-300">{formatRoadMulti(nextMulti)}</p>
                </div>
              </div>
            )}
            {roundOver && hits.length > 0 && (
              <p className="mt-3 text-center text-xs text-amber-200/90">
                This seed maxed at <span className="font-mono font-bold">{formatRoadMulti(seedMaxMulti)}</span>
                {seedMaxSteps >= def.lanes ? " (full clear)" : ` · first hit on lane ${seedMaxSteps + 1}`}
              </p>
            )}
          </div>
          <ProvablyFairPanel compact />
        </div>

        <div className="relative surface overflow-hidden pb-11">
          <WinLeaderStageMark game="road" anchor="top-right" />
          <div
            ref={scrollerRef}
            className={clsx("overflow-x-auto scrollbar-thin", panning ? "cursor-grabbing" : "cursor-grab")}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              const el = scrollerRef.current;
              if (!el) return;
              panRef.current = {
                pointer: e.pointerId,
                startX: e.clientX,
                startScroll: el.scrollLeft,
                moved: false,
              };
              el.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const pan = panRef.current;
              const el = scrollerRef.current;
              if (!pan || !el || pan.pointer !== e.pointerId) return;
              const dx = e.clientX - pan.startX;
              if (Math.abs(dx) > 6) {
                pan.moved = true;
                if (!panning) setPanning(true);
              }
              if (pan.moved) el.scrollLeft = pan.startScroll - dx;
            }}
            onPointerUp={(e) => {
              const pan = panRef.current;
              if (pan && pan.pointer === e.pointerId) panRef.current = pan.moved ? { ...pan, pointer: -1 } : null;
              setPanning(false);
              window.setTimeout(() => {
                panRef.current = null;
              }, 0);
            }}
            onPointerCancel={() => {
              panRef.current = null;
              setPanning(false);
            }}
          >
            <div
              className="relative flex h-[280px] select-none sm:h-[320px]"
              style={{ width: SIDEWALK_W + def.lanes * LANE_W }}
            >
              <Sidewalk active={steps === 0} />
              {Array.from({ length: def.lanes }, (_, i) => (
                <Lane
                  key={`${roundId}-${i}`}
                  index={i}
                  multi={roadMultiplier(i + 1, diff)}
                  clickable={phase === "playing" && i === steps && !busy}
                  cleared={i < steps && i !== seedDeathLane}
                  hit={roundOver && seedDeathLane === i}
                  droppingCar={splat && splatLane === i}
                  seedPeak={roundOver && lastSafeLane === i}
                  deathRef={seedDeathLane === i ? deathLaneRef : undefined}
                  onStep={() => {
                    if (panRef.current?.moved) return;
                    void stepLane(i);
                  }}
                />
              ))}
              <motion.div
                key={roundId}
                ref={walkerRef}
                className="pointer-events-none absolute bottom-10 z-20"
                style={{ width: WALKER_SIZE, height: WALKER_SIZE }}
                initial={false}
                animate={{ left: walkerLeft(steps) }}
                transition={{ left: { duration: jumpToken > 0 ? JUMP_MS / 1000 : 0, ease: [0.22, 0.8, 0.36, 1] } }}
              >
                <motion.div
                  key={jumpToken}
                  initial={{ y: 0, scaleX: 1, scaleY: 1, rotate: 0 }}
                  animate={
                    splat
                      ? { y: [0, -56, 12, 26], scaleX: [1, 1, 1.2, 1.48], scaleY: [1, 1.06, 0.62, 0.18], rotate: [0, -8, 10, 20] }
                      : { y: jumpToken > 0 ? [0, -52, 0] : 0, scaleX: 1, scaleY: 1, rotate: 0 }
                  }
                  transition={
                    splat
                      ? { duration: 0.64, times: [0, 0.36, 0.58, 1], ease: "easeOut" }
                      : { duration: JUMP_MS / 1000, times: [0, 0.45, 1], ease: "easeOut" }
                  }
                  style={{ originY: 1, originX: 0.5 }}
                >
                  <img
                    src={WALKER}
                    alt=""
                    className="pixelated h-[88px] w-[88px] object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.55)]"
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
              <ShieldCheck className="h-3.5 w-3.5" /> Provably Fair
            </span>
            <span className="font-medium text-slate-500">
              {phase === "idle" && "Bet, then step"}
              {phase === "playing" && `Lane ${steps} / ${def.lanes}`}
              {phase === "busted" && "Busted"}
              {phase === "cashed" && "Cashed out"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidewalk({ active }: { active: boolean }) {
  return (
    <div
      className={clsx(
        "relative flex w-[108px] shrink-0 flex-col items-center justify-end gap-2 border-r-2 border-[#3a5c5c] pb-6",
        active ? "bg-[#1a2a24]" : "bg-[#15201c]",
      )}
    >
      <div className="absolute left-3 top-4 text-amber-200">
        <Lamp className="h-8 w-8 drop-shadow-[0_0_10px_rgba(250,204,21,0.55)]" />
      </div>
      <div className="absolute right-2 top-10 text-emerald-600">
        <Trees className="h-7 w-7" />
      </div>
      <div className="absolute right-3 top-24 grid h-9 w-9 place-items-center rounded-full border-2 border-rose-400 bg-[#1a1010] text-rose-300">
        <Ban className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Start</p>
    </div>
  );
}

function Lane({
  index,
  multi,
  clickable,
  cleared,
  hit,
  droppingCar,
  seedPeak,
  deathRef,
  onStep,
}: {
  index: number;
  multi: number;
  clickable: boolean;
  cleared: boolean;
  hit: boolean;
  droppingCar: boolean;
  seedPeak: boolean;
  deathRef?: RefObject<HTMLButtonElement | null>;
  onStep: () => void;
}) {
  const odd = index % 2 === 1;
  return (
    <button
      ref={deathRef}
      type="button"
      disabled={!clickable}
      onClick={onStep}
      className={clsx(
        "relative flex h-full w-[112px] shrink-0 flex-col items-center justify-center overflow-hidden border-r border-white/10 disabled:cursor-default",
        odd ? "bg-[#161c1c]" : "bg-[#121818]",
        clickable && "hover:bg-cyan-400/10",
        seedPeak && "bg-amber-400/10",
      )}
    >
      <div className="pointer-events-none absolute inset-y-3 left-1/2 w-0 border-l-2 border-dashed border-slate-500/35" />
      <AnimatePresence>
        {droppingCar && (
          <motion.div
            initial={{ bottom: "108%", opacity: 0.2 }}
            animate={{ bottom: "2.35rem", opacity: 1 }}
            transition={{ duration: JUMP_MS / 1000, ease: [0.18, 0.72, 0.2, 1] }}
            className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
          >
            <HitCar />
          </motion.div>
        )}
      </AnimatePresence>
      {seedPeak && (
        <span className="absolute top-3 z-10 rounded-full bg-amber-300/90 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-950">
          Seed max
        </span>
      )}
      {hit && (
        <span className="absolute top-3 z-10 rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
          First hit
        </span>
      )}
      <span
        className={clsx(
          "relative z-10 grid h-12 w-12 place-items-center rounded-full border-2",
          clickable
            ? "border-cyan-300 bg-cyan-400/15 text-cyan-100"
            : hit
              ? "border-rose-400/70 bg-rose-500/20 text-rose-200"
              : seedPeak
                ? "border-amber-300/80 bg-amber-400/20 text-amber-100"
                : cleared
                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                  : "border-white/15 bg-black/40 text-slate-400",
        )}
      >
        <Menu className="h-5 w-5" />
      </span>
      <span
        className={clsx(
          "relative z-10 mt-2 font-mono text-xs font-bold",
          clickable
            ? "text-cyan-200"
            : hit
              ? "text-rose-300"
              : seedPeak
                ? "text-amber-200"
                : cleared
                  ? "text-emerald-300"
                  : "text-slate-500",
        )}
      >
        {formatRoadMultiShort(multi)}
      </span>
    </button>
  );
}

function HitCar() {
  return (
    <div className="relative h-24 w-[4.25rem] drop-shadow-[0_10px_14px_rgba(0,0,0,0.7)]">
      <div className="absolute inset-x-2 top-8 h-14 rounded-md bg-gradient-to-b from-rose-500 via-orange-500 to-amber-700" />
      <div className="absolute inset-x-3 top-2 h-10 rounded-t-[1.35rem] bg-gradient-to-b from-rose-200 to-rose-500" />
      <div className="absolute inset-x-4 top-3 h-5 rounded-t-xl bg-sky-200/80" />
      <span className="absolute left-1 top-[3.35rem] h-3.5 w-2.5 rounded-sm bg-slate-950 ring-2 ring-amber-200" />
      <span className="absolute right-1 top-[3.35rem] h-3.5 w-2.5 rounded-sm bg-slate-950 ring-2 ring-amber-200" />
      <span className="absolute left-2.5 bottom-2 h-2 w-2 rounded-full bg-amber-100 shadow-[0_0_10px_#fde68a]" />
      <span className="absolute right-2.5 bottom-2 h-2 w-2 rounded-full bg-amber-100 shadow-[0_0_10px_#fde68a]" />
    </div>
  );
}
