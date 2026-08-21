import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { CoinStackArt, TreasureChestArt } from "../components/rewards/DropArt";
import { formatCredits, formatPercent, formatRakeback } from "../lib/format";
import { RAKEBACK_OF_EDGE } from "../lib/rakeback";
import { sound } from "../lib/sound";
import { formatDropCountdown, progressFromXp } from "../lib/xp";
import { useDemoProfileStore } from "../store/demoProfileStore";
import { useEconomyStore } from "../store/economyStore";
import { MONTHLY_DROP_SH, useRewardsStore, WEEKLY_DROP_SH } from "../store/rewardsStore";
import { useToastStore } from "../store/toastStore";

function DropInfo({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          sound.click();
          setOpen(true);
        }}
        className="grid h-6 w-6 place-items-center rounded-full border border-white/20 bg-black/35 text-xs font-black text-white/80 hover:bg-black/55"
        aria-label={title}
      >
        ?
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
            <div className="surface max-h-[85vh] w-full max-w-md overflow-y-auto bg-bg-900 p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function DropCard({
  word,
  variant,
  info,
  footer,
  footerDisabled,
  onFooter,
  art,
  amount,
}: {
  word: string;
  variant: "green" | "lime" | "gold";
  info?: ReactNode;
  footer: string;
  footerDisabled: boolean;
  onFooter?: () => void;
  art: ReactNode;
  amount?: string;
}) {
  const border =
    variant === "green"
      ? "border-[#019201]/70"
      : variant === "lime"
        ? "border-lime-400/45"
        : "border-amber-400/45";
  const glow =
    variant === "green"
      ? "from-emerald-500/15"
      : variant === "lime"
        ? "from-lime-400/15"
        : "from-amber-400/15";
  const wordTone =
    variant === "green" ? "drop-word-green" : variant === "lime" ? "drop-word-lime" : "drop-word-gold";
  const footerClass = footerDisabled
    ? "border-white/10 bg-[#0a100c] text-slate-400"
    : "border-lime-300/50 bg-gradient-to-b from-lime-400 to-green-700 text-[#052e16] shadow-[0_3px_0_#14532d]";

  return (
    <article
      className={clsx(
        "drop-card relative flex min-h-[420px] flex-col overflow-hidden rounded-xl border-2 bg-[#0c1410] shadow-[4px_4px_0_#050805]",
        border,
      )}
    >
      <div className={clsx("pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent", glow)} />
      <div className="relative flex h-10 items-start justify-end px-4 pt-4">{info}</div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-2 pb-2 pt-2">
        <p className={clsx("drop-word", wordTone, word.length >= 7 && "drop-word-long")}>{word}</p>
        <div className="relative -mt-5">{art}</div>
        {amount ? <p className="mt-1 font-mono text-sm font-bold text-cyan-300">{amount}</p> : null}
      </div>
      <button
        type="button"
        disabled={footerDisabled}
        onClick={onFooter}
        className={clsx(
          "relative mx-3 mb-3 rounded-full border-2 px-4 py-2.5 text-center text-sm font-black uppercase tracking-[0.14em]",
          footerClass,
        )}
      >
        {footer}
      </button>
    </article>
  );
}

export function Rewards() {
  const displayName = useDemoProfileStore((s) => s.displayName);
  const pendingRakeback = useEconomyStore((s) => s.pendingRakeback);
  const claimRakeback = useEconomyStore((s) => s.claimRakeback);
  const credit = useEconomyStore((s) => s.credit);
  const xp = useRewardsStore((s) => s.xp);
  const weeklyReadyAt = useRewardsStore((s) => s.weeklyReadyAt);
  const monthlyReadyAt = useRewardsStore((s) => s.monthlyReadyAt);
  const claimWeekly = useRewardsStore((s) => s.claimWeekly);
  const claimMonthly = useRewardsStore((s) => s.claimMonthly);
  const push = useToastStore((s) => s.push);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const progress = useMemo(() => progressFromXp(xp), [xp]);
  const pending = pendingRakeback ?? 0;
  const canClaimInstant = pending > 0;
  const weeklyReady = now >= weeklyReadyAt;
  const monthlyReady = now >= monthlyReadyAt;
  const initial = (displayName.trim()[0] || "V").toUpperCase();
  const barPct = Math.max(0, Math.min(100, progress.ratio * 100));

  function handleClaimInstant() {
    const amt = claimRakeback();
    if (amt <= 0) {
      push("Nothing to claim yet — play a real stake first.", "info");
      return;
    }
    sound.win("small");
    push(`Claimed ${formatRakeback(amt)} SH rakeback.`, "success");
  }

  function handleWeekly() {
    const amt = claimWeekly();
    if (amt <= 0) return;
    credit(amt);
    sound.win("small");
    push(`Claimed weekly drop: ${formatCredits(amt)} SH.`, "success");
  }

  function handleMonthly() {
    const amt = claimMonthly();
    if (amt <= 0) return;
    credit(amt);
    sound.win("big");
    push(`Claimed monthly drop: ${formatCredits(amt)} SH.`, "success");
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-xl border-2 border-[#3d5a3a] bg-[#101810] px-4 py-3 shadow-[4px_4px_0_#050805] lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3 lg:w-[220px]">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#019201] bg-[#152018] text-2xl font-black text-emerald-300">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-200">{displayName}</p>
            <p className="pixel-label text-3xl leading-none text-emerald-300 sm:text-4xl">LEVEL {progress.level}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-400">Progress</p>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-3.5 min-w-0 flex-1 overflow-hidden rounded-full border border-[#019201]/40 bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#016b01] via-[#019201] to-[#a3e635] transition-[width] duration-500"
                style={{ width: `${barPct}%` }}
              />
            </div>
            <p className="shrink-0 font-mono text-xs font-bold tabular-nums text-emerald-100 sm:text-sm">
              {formatCredits(progress.intoLevel)} / {formatCredits(progress.required)} XP
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <DropCard
          word="Instant"
          variant="green"
          art={<CoinStackArt accent="green" />}
          amount={canClaimInstant ? `${formatRakeback(pending)} SH` : undefined}
          footer={canClaimInstant ? "Claim" : "Not claimable"}
          footerDisabled={!canClaimInstant}
          onFooter={handleClaimInstant}
        />
        <DropCard
          word="Weekly"
          variant="lime"
          art={<CoinStackArt accent="lime" />}
          amount={weeklyReady ? `${formatCredits(WEEKLY_DROP_SH)} SH` : undefined}
          footer={weeklyReady ? "Claim" : formatDropCountdown(weeklyReadyAt - now)}
          footerDisabled={!weeklyReady}
          onFooter={handleWeekly}
          info={
            <DropInfo title="Weekly drop">
              <p>
                A play-money Shard drop on a weekly timer. Claim when the countdown hits zero. After a claim the
                timer resets for another week.
              </p>
              <p>Prize: {formatCredits(WEEKLY_DROP_SH)} SH. No deposits, no cash value.</p>
            </DropInfo>
          }
        />
        <DropCard
          word="Monthly"
          variant="gold"
          art={<TreasureChestArt />}
          amount={monthlyReady ? `${formatCredits(MONTHLY_DROP_SH)} SH` : undefined}
          footer={monthlyReady ? "Claim" : formatDropCountdown(monthlyReadyAt - now)}
          footerDisabled={!monthlyReady}
          onFooter={handleMonthly}
          info={
            <DropInfo title="Monthly drop">
              <p>
                A larger play-money Shard drop on a monthly timer. Claim when ready; the chest then locks until the
                next cycle.
              </p>
              <p>Prize: {formatCredits(MONTHLY_DROP_SH)} SH. Demo balance only — never a real payout.</p>
            </DropInfo>
          }
        />
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Instant Drop is rakeback: {formatPercent(RAKEBACK_OF_EDGE)} of the house-edge slice from real demo stakes
        (bet &gt; 0). Chat rain still lives in the chat sidebar.
      </p>

      <Link to="/" className="text-sm text-slate-400 hover:text-white">
        ← Back to lobby
      </Link>
    </div>
  );
}
