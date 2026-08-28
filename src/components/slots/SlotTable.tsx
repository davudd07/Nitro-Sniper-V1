import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { Cherry, Sparkles } from "lucide-react";
import { useEconomyStore } from "../../store/economyStore";
import { useToastStore } from "../../store/toastStore";
import { useFairnessStore } from "../../store/fairnessStore";
import { sound } from "../../lib/sound";
import { formatPercent, formatPlayCash, formatShards } from "../../lib/format";
import { LockAmountInput } from "../ui/LockAmountInput";
import { CashAmount } from "../ui/CurrencyIcon";
import { InfoButton, StatRow } from "../ui/InfoModal";
import { DemoBetBadge } from "../ui/DemoBetBadge";
import { ProvablyFairPanel } from "../ui/ProvablyFairPanel";
import { WinLeaderStageMark } from "../layout/WinLeaderBadge";
import { takeStakeFor, stakeNeedMessage } from "../../lib/stake";
import { HOUSE_EDGE } from "../../lib/rakeback";
import {
  SLOT_BET_PRESETS,
  SLOT_CURRENCY,
  SLOT_DEFAULT_BET,
  evaluateLine,
  payRows,
  slotPayout,
  slotRtp,
  spinStops,
  spinSymbols,
  type SlotDef,
  type SlotLineWin,
} from "../../lib/slots";
import { SlotGlyph } from "./SlotGlyph";
import { SlotReels } from "./SlotReels";
import type { ActivityGame } from "../../store/activityStore";

type Mode = "manual" | "auto";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function idleSymbols(def: SlotDef): string[] {
  return Array.from({ length: def.reels }, (_, i) => def.symbols[i % def.symbols.length]!.id);
}

export function SlotTable({ def }: { def: SlotDef }) {
  const [bet, setBet] = useState(SLOT_DEFAULT_BET);
  const [mode, setMode] = useState<Mode>("manual");
  const [busy, setBusy] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoLimit, setAutoLimit] = useState(10);
  const [result, setResult] = useState(() => idleSymbols(def));
  const [spinId, setSpinId] = useState(0);
  const [win, setWin] = useState<SlotLineWin | null>(null);
  const [lastPaid, setLastPaid] = useState(0);

  const autoStop = useRef(false);
  const spinningRef = useRef(false);
  const autoRunningRef = useRef(false);
  const settleWait = useRef<(() => void) | null>(null);
  const betRef = useRef(bet);
  betRef.current = bet;

  const shards = useEconomyStore((s) => s.funCoins);
  const creditLedger = useEconomyStore((s) => s.creditLedger);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const rtp = useMemo(() => slotRtp(def), [def]);
  const rows = useMemo(() => payRows(def), [def]);
  const edge = 1 - rtp;
  const houseKey = def.id === "lockfruit" ? HOUSE_EDGE.lockfruit : HOUSE_EDGE.gemrush;
  const other = def.id === "lockfruit" ? { to: "/gemrush", name: "Gem Rush" } : { to: "/lockfruit", name: "Lock Fruit" };
  const Icon = def.theme === "fruit" ? Cherry : Sparkles;
  const locked = busy || autoRunning;

  const onReelsSettled = useCallback(() => {
    settleWait.current?.();
    settleWait.current = null;
  }, []);

  async function spinOnce(): Promise<"win" | "lose" | "blocked"> {
    if (spinningRef.current) return "blocked";
    const stake = Math.max(0, Math.round(betRef.current));
    if (!takeStakeFor(stake, houseKey, SLOT_CURRENCY)) {
      if (stake > 0) push(stakeNeedMessage(stake, SLOT_CURRENCY), "danger");
      return "blocked";
    }

    spinningRef.current = true;
    const isAuto = autoRunningRef.current;
    setBusy(true);
    setWin(null);
    if (stake > 0) sound.chip();

    try {
      const floats = await play(def.reels);
      const stops = spinStops(floats, def);
      const ids = spinSymbols(stops, def);
      const line = evaluateLine(ids, def.pays);
      const paid = slotPayout(stake, line.multi);

      const landed = new Promise<void>((resolve) => {
        settleWait.current = resolve;
      });
      setResult(ids);
      setSpinId((n) => n + 1);
      sound.click();
      await landed;

      setWin(line);
      setLastPaid(paid);
      if (paid > 0) creditLedger(paid, SLOT_CURRENCY);
      recordRound(stake, paid, def.id as ActivityGame, SLOT_CURRENCY);

      if (line.multi > 0) {
        sound.win(line.multi >= 50 ? "big" : "small");
        if (!isAuto) {
          push(
            stake > 0
              ? `${line.count}× ${line.symbol} · +${formatPlayCash(paid, SLOT_CURRENCY)}.`
              : `Demo · ${line.count}× ${line.symbol} (${line.multi}×).`,
            "success",
          );
        }
        return "win";
      }
      sound.lose();
      if (!isAuto && stake <= 0) push("Demo · no line.", "info");
      return "lose";
    } finally {
      spinningRef.current = false;
      setBusy(false);
    }
  }

  async function runAuto() {
    if (autoRunningRef.current) return;
    autoStop.current = false;
    autoRunningRef.current = true;
    setAutoRunning(true);
    const max = autoLimit <= 0 ? 200 : Math.min(200, Math.max(1, autoLimit));
    try {
      for (let i = 0; i < max; i++) {
        if (autoStop.current) break;
        const outcome = await spinOnce();
        if (outcome === "blocked") break;
        await sleep(80);
      }
    } finally {
      autoRunningRef.current = false;
      setAutoRunning(false);
    }
  }

  function onPrimary() {
    if (mode === "auto") {
      if (autoRunningRef.current) {
        autoStop.current = true;
        return;
      }
      void runAuto();
      return;
    }
    void spinOnce();
  }

  const primaryLabel = autoRunning
    ? "Stop auto"
    : mode === "auto"
      ? "Start auto"
      : busy
        ? "Spinning…"
        : bet > 0
          ? "Spin"
          : "Demo spin";

  const status = autoRunning
    ? "Auto running…"
    : busy
      ? "Spinning…"
      : win && win.multi > 0
        ? `${win.count}× ${win.symbol} · ${win.multi}×`
        : win
          ? "No line"
          : `${def.reels} reels · one line`;

  const fruitCabinet = def.theme === "fruit";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300/90">Fun spins · Shards</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{def.name}</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">{def.blurb}</p>
          <Link
            to={other.to}
            onClick={() => sound.click()}
            className="mt-2 inline-block text-xs font-semibold text-cyan-300/90 hover:underline"
          >
            Also play {other.name} →
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WinLeaderStageMark game={def.id as ActivityGame} inline />
          <InfoButton title={`${def.name} — RTP`}>
            <StatRow label="RTP" value={formatPercent(rtp)} />
            <StatRow label="House edge" value={formatPercent(edge)} />
            <StatRow label="Reels" value={`${def.reels} · 1 line`} />
            <StatRow label="Wallet" value="Shards" />
            <p>Left-to-right only. Highest consecutive count pays. Bet 0 is a demo spin.</p>
          </InfoButton>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="surface p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-black/35 p-1">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={autoRunning}
                onClick={() => {
                  sound.click();
                  setMode(m);
                }}
                className={clsx(
                  "rounded-md py-1.5 text-xs font-extrabold uppercase tracking-wide disabled:opacity-50",
                  mode === m ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-white",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Stake · Shards
          </label>
          <div className="mb-3 flex items-center gap-2">
            <LockAmountInput
              currency="shards"
              valueWl={bet}
              onChangeWl={(n) => setBet(Math.max(0, Math.round(n)))}
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
          <div className="mb-3 flex flex-wrap gap-1">
            {SLOT_BET_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={locked}
                onClick={() => {
                  sound.click();
                  setBet(n);
                }}
                className={clsx(
                  "rounded-md px-2 py-1 text-[11px] font-bold ring-1 disabled:opacity-50",
                  bet === n ? "bg-cyan-400/20 text-cyan-100 ring-cyan-300/40" : "text-slate-400 ring-white/10 hover:text-white",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <p className="mb-4 flex items-center gap-1.5 text-[11px] text-slate-500">
            Wallet
            <CashAmount wl={shards ?? 0} currency="shards" iconClassName="h-3.5 w-3.5" />
          </p>

          {mode === "auto" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Number of spins
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={autoLimit}
                disabled={autoRunning}
                onChange={(e) => setAutoLimit(Math.min(200, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full rounded-lg bg-bg-900 px-3 py-2 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
              />
            </div>
          )}

          <button type="button" onClick={onPrimary} disabled={mode === "manual" && busy} className="btn-cyan w-full py-3 disabled:opacity-50">
            {primaryLabel}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            {bet > 0 ? `${formatShards(bet)} per spin` : "Demo · no stake"}
          </p>
          <DemoBetBadge active={bet <= 0} className="mt-2" />
        </div>

        <div
          className={clsx(
            "relative surface space-y-5 overflow-hidden p-4 sm:p-6",
            fruitCabinet
              ? "bg-gradient-to-b from-[#1a1410] to-[#101818]"
              : "bg-gradient-to-b from-[#14101c] to-[#101818]",
          )}
        >
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-300">
            <Icon className="h-4 w-4 text-cyan-300" />
            {status}
          </div>

          <SlotReels def={def} result={result} spinId={spinId} win={win} onSettled={onReelsSettled} />

          <div className="min-h-[44px] rounded-xl bg-black/35 px-3 py-2 text-center ring-1 ring-white/8">
            {win && win.multi > 0 ? (
              <p className="text-sm font-extrabold text-emerald-200">
                {win.count} in a row · {win.multi}×
                {lastPaid > 0 ? ` · +${formatPlayCash(lastPaid, SLOT_CURRENCY)}` : ""}
              </p>
            ) : (
              <p className="text-sm font-semibold text-slate-500">Pays left to right on the center line.</p>
            )}
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2">
            {rows.map(({ symbol, counts }) => (
              <div key={symbol.id} className="flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5 ring-1 ring-white/8">
                <SlotGlyph symbol={symbol} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">{symbol.label}</p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {counts.map((c) => `${c.count}→${c.multi}×`).join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProvablyFairPanel />
    </div>
  );
}
