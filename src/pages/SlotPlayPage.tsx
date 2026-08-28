import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { clsx } from "clsx";
import { ExternalLink } from "lucide-react";
import {
  providerLaunchUrl,
  providerSlotById,
  SLOT_RTP,
  slotWalletMultiplier,
  slotWalletPayout,
  type SlotPlayMode,
} from "../lib/slots";
import { LockAmountInput } from "../components/ui/LockAmountInput";
import { DemoBetBadge } from "../components/ui/DemoBetBadge";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { WinLeaderStageMark } from "../components/layout/WinLeaderBadge";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
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

export function SlotPlayPage() {
  const { slotId } = useParams();
  const slot = slotId ? providerSlotById(slotId) : undefined;
  const [blocked, setBlocked] = useState(false);
  const [mode, setMode] = useState<SlotPlayMode>("wl");
  const [bet, setBet] = useState(100);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ multi: number; paid: number; stake: number; currency: PlayCurrency } | null>(null);
  const busyRef = useRef(false);

  const shardBal = useEconomyStore((s) => s.funCoins);
  const lockBal = useEconomyStore((s) => s.balance);
  const lockUnit = useSettingsStore((s) => s.lockUnit);
  const lockLabel = LOCK_META[lockUnit].shortName;
  const creditLedger = useEconomyStore((s) => s.creditLedger);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

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

  if (!slot) return <Navigate to="/slots" replace />;

  async function spinWallet() {
    if (mode === "fun" || busyRef.current) return;
    if (bet < 0) return;
    if (!takeStakeFor(bet, HOUSE_EDGE.slots, currency)) {
      if (bet > 0) push(stakeNeedMessage(bet, currency), "danger");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const [float] = await play(1);
      const multi = slotWalletMultiplier(float ?? 0);
      const paid = slotWalletPayout(bet, multi);
      if (paid > 0) creditLedger(paid, currency);
      recordRound(bet, paid, "slots", currency);
      setLast({ multi, paid, stake: bet, currency });
      if (multi > 0) {
        sound.win(multi >= 10 ? "big" : "small");
        push(
          bet > 0
            ? `${formatMulti(multi)} · +${formatPlayCash(paid, currency)}`
            : `Demo · ${formatMulti(multi)} (no stake).`,
          "success",
        );
      } else {
        sound.lose();
        if (bet <= 0) push("Demo · miss.", "info");
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const resultLine = walletMode
    ? last
      ? last.stake > 0
        ? last.multi > 0
          ? `${formatMulti(last.multi)} · +${formatPlayCash(last.paid, last.currency)}`
          : "Miss"
        : `Demo · ${formatMulti(last.multi)}`
      : `Spin spends this ${walletLabel} stack.`
    : "Studio credits. Switch back to stake your wallet.";

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
            <StatRow label="Wallet RTP" value={formatPercent(SLOT_RTP)} />
            <StatRow label="House edge" value={formatPercent(HOUSE_EDGE.slots)} />
            <p>
              Spin spends your SeedBET {lockLabel} or Shards. The Fun tab is studio demo credits — those reels do not
              debit this wallet.
            </p>
          </InfoButton>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/15 hover:bg-white/5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </a>
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
                disabled={busy}
                onClick={() => {
                  sound.click();
                  setMode(m.id);
                }}
                className={clsx(
                  "rounded-md px-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wide disabled:opacity-50",
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
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Spin · {walletLabel}
                </span>
                <div className="flex items-center gap-2">
                  <LockAmountInput
                    valueWl={bet}
                    onChangeWl={(wl) => setBet(Math.max(0, wl))}
                    disabled={busy}
                    currency={currency}
                    className="min-w-0 flex-1"
                    inputClassName="w-full rounded-lg bg-bg-900 px-3 py-2.5 font-mono text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setBet((b) => Math.max(0, Math.floor(b / 2)))}
                    className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setBet((b) => b * 2)}
                    className="rounded-lg bg-bg-900 px-2.5 py-2.5 text-xs font-extrabold text-slate-200 ring-1 ring-white/10 hover:bg-bg-700 disabled:opacity-50"
                  >
                    2×
                  </button>
                </div>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  sound.click();
                  setBet(Math.max(0, Math.floor(wallet)));
                }}
                className="w-full rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 ring-1 ring-white/10 hover:bg-white/5 disabled:opacity-50"
              >
                Max{" "}
                <CashAmount wl={wallet} currency={currency} iconClassName="h-3 w-3" className="align-middle" />
              </button>
              <button type="button" onClick={() => void spinWallet()} disabled={busy} className="btn-cyan w-full py-3 disabled:opacity-50">
                {busy ? "Spinning…" : bet > 0 ? "Spin" : "Demo spin"}
              </button>
              <DemoBetBadge active={bet <= 0} />
            </>
          ) : (
            <p className="text-xs leading-relaxed text-slate-400">
              Studio credits. Switch to {lockLabel}
              {showShards ? " or Shards" : ""} to use your stack.
            </p>
          )}

          <p className={clsx("text-center text-[11px]", last && last.multi > 0 ? "font-semibold text-cyan-200" : "text-slate-500")}>
            {resultLine}
          </p>
        </div>

        <div className="relative min-h-[560px] overflow-hidden rounded-xl border-2 border-cyan-400/25 bg-[#050808] shadow-[4px_4px_0_#050808]">
          {walletMode ? (
            <div className="absolute left-3 top-3 z-10 rounded-lg border border-white/10 bg-black/75 px-3 py-2 shadow-[3px_3px_0_#050808] backdrop-blur-sm">
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
