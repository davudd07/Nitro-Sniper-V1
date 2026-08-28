import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { clsx } from "clsx";
import { ExternalLink } from "lucide-react";
import { providerLaunchUrl, providerSlotById, type SlotPlayMode } from "../lib/slots";
import { isPragmaticOrigin, ppCreditsToLedger, readPpRoundMsg } from "../lib/ppEvents";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { WinLeaderStageMark } from "../components/layout/WinLeaderBadge";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { sound } from "../lib/sound";
import { formatPercent, formatPlayCash } from "../lib/format";
import { LOCK_META } from "../lib/money";
import { HOUSE_EDGE } from "../lib/rakeback";
import { playCurrencyLabel, type PlayCurrency } from "../lib/playWallet";
import { stakeNeedMessage, takeStakeFor } from "../lib/stake";
import { useSettingsStore } from "../store/settingsStore";

function formatMulti(n: number): string {
  if (!(n > 0)) return "0×";
  if (n >= 10) return `${Number.isInteger(n) ? n : n.toFixed(1)}×`;
  return `${n}×`;
}

type PendingRound = { betWl: number; currency: PlayCurrency } | "skip";

export function SlotPlayPage() {
  const { slotId } = useParams();
  const slot = slotId ? providerSlotById(slotId) : undefined;
  const [blocked, setBlocked] = useState(false);
  const [mode, setMode] = useState<SlotPlayMode>("wl");
  const [nextBet, setNextBet] = useState(0);
  const [last, setLast] = useState<{ multi: number; paid: number; stake: number; currency: PlayCurrency } | null>(null);

  const shardBal = useEconomyStore((s) => s.funCoins);
  const lockBal = useEconomyStore((s) => s.balance);
  const lockUnit = useSettingsStore((s) => s.lockUnit);
  const lockLabel = LOCK_META[lockUnit].shortName;
  const creditLedger = useEconomyStore((s) => s.creditLedger);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);

  const src = useMemo(() => (slot ? providerLaunchUrl(slot) : ""), [slot]);
  const showShards = shardBal > 0 || mode === "shards";
  const walletMode = mode !== "fun";
  const currency: PlayCurrency = mode === "shards" ? "shards" : "wl";
  const wallet = currency === "shards" ? shardBal : lockBal;
  const walletLabel = currency === "shards" ? playCurrencyLabel("shards") : lockLabel;
  const modes: { id: SlotPlayMode; label: string }[] = [
    { id: "wl", label: LOCK_META[lockUnit].ticker },
    { id: "shards", label: "Shards" },
    { id: "fun", label: "Fun" },
  ];

  const frameRef = useRef<HTMLIFrameElement>(null);
  const modeRef = useRef(mode);
  const currencyRef = useRef(currency);
  const pendingRef = useRef<PendingRound | null>(null);
  const lastSettleAt = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
    currencyRef.current = currency;
  }, [mode, currency]);

  useEffect(() => {
    function haltGame(origin: string) {
      const w = frameRef.current?.contentWindow;
      if (!w) return;
      w.postMessage("stopAutoplay", origin);
      w.postMessage("requestPause", origin);
    }

    function onMsg(ev: MessageEvent) {
      if (!isPragmaticOrigin(ev.origin)) return;
      const msg = readPpRoundMsg(ev.data);
      const playCurrency = currencyRef.current;
      const playingWallet = modeRef.current !== "fun";

      if (msg.kind === "bet") {
        setNextBet(ppCreditsToLedger(msg.bet, playCurrency));
        return;
      }

      if (!playingWallet) return;

      if (msg.kind === "start") {
        const betWl = ppCreditsToLedger(msg.bet, playCurrency);
        if (betWl <= 0) {
          pendingRef.current = "skip";
          return;
        }
        if (!takeStakeFor(betWl, HOUSE_EDGE.slots, playCurrency)) {
          pendingRef.current = "skip";
          haltGame(ev.origin);
          push(stakeNeedMessage(betWl, playCurrency), "danger");
          return;
        }
        pendingRef.current = { betWl, currency: playCurrency };
        sound.click();
        return;
      }

      if (msg.kind === "end") {
        const pending = pendingRef.current;
        pendingRef.current = null;
        const winWl = ppCreditsToLedger(msg.win, playCurrency);
        if (pending === "skip") return;
        if (pending) {
          if (winWl > 0) creditLedger(winWl, pending.currency);
          recordRound(pending.betWl, winWl, "slots", pending.currency);
          const multi = pending.betWl > 0 ? winWl / pending.betWl : 0;
          setLast({ multi, paid: winWl, stake: pending.betWl, currency: pending.currency });
          lastSettleAt.current = Date.now();
          if (winWl > 0) sound.win(multi >= 10 ? "big" : "small");
          else sound.lose();
          return;
        }
        if (winWl > 0 && Date.now() - lastSettleAt.current > 1500) {
          creditLedger(winWl, playCurrency);
          recordRound(0, winWl, "slots", playCurrency);
          setLast({ multi: winWl, paid: winWl, stake: 0, currency: playCurrency });
          lastSettleAt.current = Date.now();
          sound.win(winWl >= 10 ? "big" : "small");
        }
      }
    }

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [creditLedger, recordRound, push]);

  if (!slot) return <Navigate to="/slots" replace />;

  const resultLine = walletMode
    ? last
      ? last.stake > 0
        ? last.multi > 0
          ? `${formatMulti(last.multi)} · +${formatPlayCash(last.paid, last.currency)}`
          : "Miss"
        : `Bonus · +${formatPlayCash(last.paid, last.currency)}`
      : "Spin in the game. This stack moves with the result."
    : "Studio credits. Switch back to use your stack.";

  return (
    <div className="flex min-h-[70vh] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
            {mode === "fun" ? "Fun play" : walletLabel} · {slot.provider}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-white">{slot.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {walletMode ? <WinLeaderStageMark game="slots" inline /> : null}
          <InfoButton title="Slots — your stack">
            <StatRow label="In-game $1.00" value={`100 ${LOCK_META.wl.ticker}`} />
            <StatRow label="House edge (rakeback)" value={formatPercent(HOUSE_EDGE.slots)} />
            <p>
              Spin, win, and lose in the slot. SeedBET World Locks (or Shards) move with that result. Studio demo
              credits stay in the reels.
            </p>
          </InfoButton>
          {mode === "fun" ? (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/15 hover:bg-white/5"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
            </a>
          ) : null}
          <Link to="/slots" className="text-xs font-semibold text-slate-400 hover:text-white">
            All slots
          </Link>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="surface h-fit space-y-3 p-4">
          <div className={clsx("grid gap-1 rounded-lg bg-black/35 p-1", showShards ? "grid-cols-3" : "grid-cols-2")}>
            {modes.filter((m) => m.id !== "shards" || showShards).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  sound.click();
                  setMode(m.id);
                }}
                className={clsx(
                  "rounded-md px-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wide",
                  mode === m.id ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-white",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {walletMode ? (
            <>
              <div className="rounded-lg bg-black/35 px-3 py-2.5 ring-1 ring-white/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Your stack</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  <CashAmount wl={wallet} currency={currency} iconClassName="h-5 w-5" />
                </p>
              </div>
              {nextBet > 0 ? (
                <p className="text-[11px] text-slate-400">
                  Next spin · <CashAmount wl={nextBet} currency={currency} iconClassName="h-3 w-3" />
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">Bet size comes from the slot.</p>
              )}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-slate-400">
              Studio credits. Switch to {lockLabel}
              {showShards ? " or Shards" : ""} to use your stack.
            </p>
          )}

          <p className={clsx("text-center text-[11px]", last && last.paid > 0 ? "font-semibold text-cyan-200" : "text-slate-500")}>
            {resultLine}
          </p>
        </div>

        <div className="relative min-h-[560px] overflow-hidden rounded-xl border-2 border-cyan-400/25 bg-[#050808] shadow-[4px_4px_0_#050808]">
          {walletMode ? (
            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-white/10 bg-black/75 px-3 py-2 shadow-[3px_3px_0_#050808] backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Your stack</p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                <CashAmount wl={wallet} currency={currency} iconClassName="h-4 w-4" />
              </p>
            </div>
          ) : null}
          {blocked ? (
            <div className="grid h-full min-h-[560px] place-items-center p-6 text-center">
              <div>
                <p className="text-sm text-slate-300">This demo wouldn’t load in the frame.</p>
                <a href={src} target="_blank" rel="noreferrer" className="btn-cyan mt-3 inline-flex px-4 py-2 text-sm">
                  Play {slot.name} in a new tab
                </a>
              </div>
            </div>
          ) : (
            <iframe
              ref={frameRef}
              title={slot.name}
              src={src}
              className="h-full min-h-[560px] w-full bg-black"
              allow="autoplay; fullscreen; clipboard-write"
              onError={() => setBlocked(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
