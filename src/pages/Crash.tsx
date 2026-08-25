import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { clsx } from "clsx";
import { CrashGraph, type CrashSample } from "../components/crash/CrashGraph";
import { LockAmountInput } from "../components/ui/LockAmountInput";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { DemoBetBadge } from "../components/ui/DemoBetBadge";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { WinLeaderStageMark } from "../components/layout/WinLeaderBadge";
import { PlayerTag } from "../components/identity/PlayerTag";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { localWinName } from "../store/winLeaderStore";
import { takeStake } from "../lib/stake";
import { sound } from "../lib/sound";
import { formatCash, formatPercent } from "../lib/format";
import { houseEdgeForGame } from "../lib/loyalty";
import { randomBotName } from "../data/botNames";
import {
  CRASH_BETTING_MS,
  CRASH_CRASH_HOLD_MS,
  CRASH_HOUSE_EDGE,
  CRASH_MAX_MULTI,
  CRASH_MIN_CASHOUT,
  CRASH_RTP,
  clampCashout,
  crashPayout,
  crashPointFromFloat,
  displayedMultiplier,
  flightDurationMs,
  formatCrashMulti,
  roundCrash,
  type CrashPhase,
} from "../lib/crash";

type Seat = {
  id: string;
  name: string;
  you: boolean;
  stake: number;
  target: number;
  cashedAt: number | null;
};

const BOT_STAKES = [10, 25, 50, 75, 100, 150, 200, 250, 400, 500, 750, 1000, 1500, 2500, 5000];

function randomBotTarget(): number {
  const r = Math.random();
  if (r < 0.48) return clampCashout(1.1 + Math.random() * 0.9);
  if (r < 0.78) return clampCashout(2 + Math.random() * 3);
  if (r < 0.93) return clampCashout(5 + Math.random() * 12);
  return clampCashout(15 + Math.random() * 80);
}

function spawnBots(): Seat[] {
  const n = 3 + Math.floor(Math.random() * 8);
  const used = new Set<string>();
  const seats: Seat[] = [];
  for (let i = 0; i < n; i++) {
    const name = randomBotName(used);
    used.add(name);
    seats.push({
      id: `bot-${name}-${i}`,
      name,
      you: false,
      stake: BOT_STAKES[Math.floor(Math.random() * BOT_STAKES.length)] ?? 100,
      target: randomBotTarget(),
      cashedAt: null,
    });
  }
  return seats.sort((a, b) => b.stake - a.stake);
}

export function Crash() {
  const [bet, setBet] = useState(100);
  const [autoCashout, setAutoCashout] = useState(2);
  const [phase, setPhase] = useState<CrashPhase>("betting");
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState(1);
  const [samples, setSamples] = useState<CrashSample[]>([]);
  const [bettingLeftMs, setBettingLeftMs] = useState(CRASH_BETTING_MS);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [youPlaced, setYouPlaced] = useState(false);
  const [youCashed, setYouCashed] = useState(false);

  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);
  const houseEdges = useLoyaltyStore((s) => s.config.houseEdges);
  const liveEdge = houseEdgeForGame("crash", houseEdges);
  const youName = localWinName();
  const infoWrap = useRef<HTMLDivElement>(null);

  const phaseRef = useRef<CrashPhase>("betting");
  const bettingOpenRef = useRef(true);
  const youPlacedRef = useRef(false);
  const youCashedRef = useRef(false);
  const youSettledRef = useRef(false);
  const youStakeRef = useRef(0);
  const autoRef = useRef(autoCashout);
  const liveEdgeRef = useRef(liveEdge);
  const playRef = useRef(play);
  const crashPointRef = useRef(1);
  const multiRef = useRef(1);
  const seatsRef = useRef<Seat[]>([]);
  const cashYouRef = useRef<(at: number) => void>(() => {});

  phaseRef.current = phase;
  autoRef.current = autoCashout;
  liveEdgeRef.current = liveEdge;
  playRef.current = play;
  seatsRef.current = seats;

  const pot = useMemo(() => seats.reduce((s, row) => s + row.stake, 0), [seats]);
  const shownMulti = roundCrash(multiplier);
  const youPayout = youPlaced && !youCashed ? crashPayout(youStakeRef.current, Math.max(1, shownMulti)) : 0;
  const canBet = phase === "betting" && !youPlaced;
  const canCash = phase === "running" && youPlaced && !youCashed;
  const betLocked = youPlaced && phase !== "crashed";

  function patchSeats(next: Seat[]) {
    seatsRef.current = next;
    setSeats(next);
  }

  function cashYou(at: number) {
    if (!youPlacedRef.current || youCashedRef.current || youSettledRef.current) return;
    if (phaseRef.current !== "running") return;
    const crash = crashPointRef.current;
    const paidAt = roundCrash(Math.min(at, crash));
    if (!(paidAt >= CRASH_MIN_CASHOUT) || paidAt > crash) return;
    youCashedRef.current = true;
    youSettledRef.current = true;
    setYouCashed(true);
    const stake = youStakeRef.current;
    const payout = crashPayout(stake, paidAt);
    if (payout > 0) credit(payout);
    recordRound(stake, payout, "crash");
    patchSeats(
      seatsRef.current.map((row) => (row.you ? { ...row, cashedAt: paidAt } : row)),
    );
    sound.win(paidAt >= 10 ? "big" : "small");
    push(
      stake > 0
        ? `Cashed out ${formatCrashMulti(paidAt)} — +${formatCash(payout)}.`
        : `Demo · cashed out ${formatCrashMulti(paidAt)} (no stake).`,
      "success",
    );
  }
  cashYouRef.current = cashYou;

  function cashBots(m: number) {
    let changed = false;
    const next = seatsRef.current.map((row) => {
      if (row.you || row.cashedAt != null) return row;
      if (m + 1e-9 >= row.target && row.target <= crashPointRef.current) {
        changed = true;
        return { ...row, cashedAt: row.target };
      }
      return row;
    });
    if (changed) patchSeats(next);
  }

  function settleLoss() {
    if (!youPlacedRef.current || youSettledRef.current) return;
    youSettledRef.current = true;
    const stake = youStakeRef.current;
    recordRound(stake, 0, "crash");
    sound.lose();
    if (stake <= 0) push("Demo · rode to crash.", "info");
    else push(`Crashed — lost ${formatCash(stake)}.`, "danger");
  }

  function placeBet() {
    if (!canBet) return;
    if (bet < 0) return;
    if (!takeStake(bet, liveEdgeRef.current)) {
      if (bet > 0) push(`You need ${formatCash(bet)} to bet.`, "danger");
      return;
    }
    sound.click();
    youPlacedRef.current = true;
    youCashedRef.current = false;
    youSettledRef.current = false;
    youStakeRef.current = bet;
    setYouPlaced(true);
    setYouCashed(false);
    const seat: Seat = {
      id: "you",
      name: youName,
      you: true,
      stake: bet,
      target: clampCashout(autoRef.current),
      cashedAt: null,
    };
    patchSeats([seat, ...seatsRef.current.filter((s) => !s.you)]);
  }

  function onPrimary() {
    if (canCash) {
      cashYou(multiRef.current);
      return;
    }
    if (canBet) {
      placeBet();
    }
  }

  useEffect(() => {
    const ctl = { alive: true, raf: 0, timeout: 0, interval: 0 };

    function clearTimers() {
      if (ctl.raf) cancelAnimationFrame(ctl.raf);
      if (ctl.timeout) window.clearTimeout(ctl.timeout);
      if (ctl.interval) window.clearInterval(ctl.interval);
      ctl.raf = 0;
      ctl.timeout = 0;
      ctl.interval = 0;
    }

    function beginBetting() {
      if (!ctl.alive) return;
      clearTimers();
      youPlacedRef.current = false;
      youCashedRef.current = false;
      youSettledRef.current = false;
      youStakeRef.current = 0;
      bettingOpenRef.current = true;
      phaseRef.current = "betting";
      setYouPlaced(false);
      setYouCashed(false);
      setPhase("betting");
      setMultiplier(1);
      setSamples([]);
      multiRef.current = 1;
      const bots = spawnBots();
      patchSeats(bots);
      const ends = Date.now() + CRASH_BETTING_MS;
      setBettingLeftMs(CRASH_BETTING_MS);
      ctl.interval = window.setInterval(() => {
        setBettingLeftMs(Math.max(0, ends - Date.now()));
      }, 80);
      ctl.timeout = window.setTimeout(() => {
        void beginFlying();
      }, CRASH_BETTING_MS);
    }

    async function beginFlying() {
      if (!ctl.alive) return;
      clearTimers();
      bettingOpenRef.current = false;
      setBettingLeftMs(0);
      phaseRef.current = "running";
      setPhase("running");
      const [u] = await playRef.current(1);
      if (!ctl.alive) return;
      const point = crashPointFromFloat(u ?? 0, liveEdgeRef.current);
      crashPointRef.current = point;
      setCrashPoint(point);
      const start = performance.now();
      const duration = flightDurationMs(point);
      const pts: CrashSample[] = [{ t: 0, m: 1 }];
      setSamples(pts);
      setMultiplier(1);
      multiRef.current = 1;
      let lastPaint = 0;
      let lastTickBucket = 0;

      const step = (now: number) => {
        if (!ctl.alive) return;
        const elapsed = now - start;
        const m = displayedMultiplier(elapsed, point);
        multiRef.current = m;
        cashBots(m);
        if (youPlacedRef.current && !youCashedRef.current) {
          const target = clampCashout(autoRef.current);
          if (m + 1e-9 >= target && target <= point) cashYouRef.current(target);
        }
        const t = elapsed / 1000;
        const last = pts[pts.length - 1];
        if (!last || t - last.t >= 0.04 || elapsed >= duration) {
          pts.push({ t, m });
        }
        const bucket = Math.floor(m * 5);
        if (bucket !== lastTickBucket) {
          lastTickBucket = bucket;
          if (bucket > 5 && Math.random() < 0.35) sound.tick(Math.min(1, (m - 1) / 8));
        }
        if (now - lastPaint > 32 || elapsed >= duration) {
          lastPaint = now;
          setMultiplier(m);
          setSamples(pts.slice());
        }
        if (elapsed >= duration) {
          finishCrash();
          return;
        }
        ctl.raf = requestAnimationFrame(step);
      };
      ctl.raf = requestAnimationFrame(step);
    }

    function finishCrash() {
      if (!ctl.alive) return;
      clearTimers();
      const point = crashPointRef.current;
      phaseRef.current = "crashed";
      setPhase("crashed");
      setMultiplier(point);
      multiRef.current = point;
      if (youPlacedRef.current && !youCashedRef.current) settleLoss();
      ctl.timeout = window.setTimeout(() => beginBetting(), CRASH_CRASH_HOLD_MS);
    }

    beginBetting();

    return () => {
      ctl.alive = false;
      clearTimers();
      if (!youPlacedRef.current || youSettledRef.current) return;
      if (phaseRef.current === "betting" && bettingOpenRef.current) {
        const stake = youStakeRef.current;
        if (stake > 0) credit(stake);
        youSettledRef.current = true;
        return;
      }
      if (phaseRef.current === "running" || !bettingOpenRef.current) {
        recordRound(youStakeRef.current, 0, "crash");
        youSettledRef.current = true;
      }
    };
    // Round loop is tied to mount; store fns are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const primaryLabel = canCash
    ? `Cash out ${youPayout > 0 ? formatCash(youPayout) : formatCrashMulti(shownMulti)}`
    : canBet
      ? bet > 0
        ? "Bet"
        : "Demo bet"
      : "Wait for the next round";

  return (
    <div className="space-y-5">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)]">
        <div className="surface flex min-h-0 flex-col p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-white">Crash</h1>
            <div ref={infoWrap}>
              <InfoButton title="Crash — RTP & House Edge">
                <StatRow label="RTP" value={formatPercent(1 - liveEdge)} />
                <StatRow label="House edge" value={formatPercent(liveEdge)} />
                <StatRow label="Default edge" value={formatPercent(CRASH_HOUSE_EDGE)} />
                <StatRow label="Max multiplier" value={`${CRASH_MAX_MULTI}×`} />
                <StatRow label="Min cashout" value={`${CRASH_MIN_CASHOUT.toFixed(2)}×`} />
                <p>
                  Cash out before the round crashes to lock the current multiplier. Auto cashout pays your target if the
                  curve reaches it. Instant 1.00× busts equal the house edge, so any cashout still returns about{" "}
                  {formatPercent(CRASH_RTP, 0)} RTP. Bet 0 is a demo round with no World Lock stake.
                </p>
              </InfoButton>
            </div>
          </div>

          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Bet amount
          </label>
          <div className="mb-3 flex items-center gap-2">
            <LockAmountInput
              valueWl={bet}
              onChangeWl={(wl) => setBet(Math.max(0, wl))}
              disabled={betLocked}
              className="min-w-0 flex-1"
              inputClassName="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={betLocked}
              onClick={() => {
                sound.click();
                setBet((b) => Math.max(0, Math.floor(b / 2)));
              }}
              className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              ½
            </button>
            <button
              type="button"
              disabled={betLocked}
              onClick={() => {
                sound.click();
                setBet((b) => b * 2);
              }}
              className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
            >
              2×
            </button>
          </div>

          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Auto cashout
          </label>
          <div className="mb-4 flex items-stretch overflow-hidden rounded-lg bg-bg-900 ring-1 ring-white/10">
            <span className="grid place-items-center px-2.5 font-mono text-sm font-bold text-slate-500">x</span>
            <input
              type="number"
              min={CRASH_MIN_CASHOUT}
              max={CRASH_MAX_MULTI}
              step={0.01}
              value={autoCashout}
              onChange={(e) => setAutoCashout(clampCashout(Number(e.target.value)))}
              className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-white outline-none disabled:opacity-50"
            />
            <div className="flex flex-col border-l border-white/10">
              <button
                type="button"
                aria-label="Increase auto cashout"
                onClick={() => {
                  sound.click();
                  setAutoCashout((v) => clampCashout(roundCrash(v + 0.01)));
                }}
                className="grid flex-1 place-items-center px-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Decrease auto cashout"
                onClick={() => {
                  sound.click();
                  setAutoCashout((v) => clampCashout(roundCrash(v - 0.01)));
                }}
                className="grid flex-1 place-items-center px-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onPrimary}
            disabled={!canBet && !canCash}
            className={clsx(
              "w-full py-3.5 text-sm font-extrabold uppercase tracking-wide disabled:opacity-50",
              canCash
                ? "rounded-xl bg-emerald-500 text-bg-950 shadow-[0_4px_0_#166534] transition-[filter,transform] hover:brightness-110 active:translate-y-px"
                : "btn-cyan",
            )}
          >
            {primaryLabel}
          </button>
          <DemoBetBadge active={(!youPlaced && bet <= 0) || (youPlaced && youStakeRef.current <= 0)} className="mt-2 self-start" />

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/8 pt-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-cyan-300" />
              {seats.length} {seats.length === 1 ? "player" : "players"}
            </span>
            <span className="inline-flex items-center gap-1">
              Total
              <CashAmount wl={pot} iconClassName="h-3.5 w-3.5" />
            </span>
          </div>

          <ul className="mt-2 min-h-[160px] flex-1 space-y-1 overflow-y-auto pr-0.5 scrollbar-thin">
            {seats.length === 0 && <li className="py-6 text-center text-xs text-slate-500">Waiting for bets…</li>}
            {seats.map((row) => {
              const cashed = row.cashedAt != null;
              const lost = phase === "crashed" && !cashed;
              return (
                <li
                  key={row.id}
                  className={clsx(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs",
                    row.you && "bg-cyan-400/10 ring-1 ring-cyan-400/25",
                    cashed && "bg-emerald-400/8",
                    lost && "opacity-55",
                  )}
                >
                  <PlayerTag
                    name={row.you ? youName : row.name}
                    you={row.you}
                    kind={row.you ? "you" : "bot"}
                    size={18}
                    nameClassName="text-[12px] font-semibold text-slate-200"
                  />
                  <span className="flex shrink-0 items-center gap-2 font-mono">
                    {cashed ? (
                      <>
                        <span className="text-emerald-300">{formatCrashMulti(row.cashedAt!)}</span>
                        <CashAmount wl={crashPayout(row.stake, row.cashedAt!)} iconClassName="h-3 w-3" className="text-emerald-200" />
                      </>
                    ) : (
                      <>
                        <span className={lost ? "text-rose-300" : "text-slate-500"}>{formatCrashMulti(row.target)}</span>
                        <CashAmount wl={row.stake} iconClassName="h-3 w-3" className={lost ? "text-rose-200" : "text-slate-200"} />
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="surface relative flex min-h-0 flex-col overflow-hidden">
          <CrashGraph
            phase={phase}
            multiplier={multiplier}
            crashPoint={crashPoint}
            samples={samples}
            bettingLeftMs={bettingLeftMs}
            onFairness={() => document.getElementById("crash-fairness")?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
            onStats={() => infoWrap.current?.querySelector("button")?.click()}
          />
          <div className="relative flex items-center justify-between gap-3 border-t border-white/8 px-4 py-2.5">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide text-white">Crash</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">SeedBET Originals</p>
            </div>
            <WinLeaderStageMark game="crash" inline />
          </div>
        </div>
      </div>

      <div id="crash-fairness">
        <ProvablyFairPanel />
      </div>
    </div>
  );
}
