import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { CoinStackArt, TreasureChestArt } from "../components/rewards/DropArt";
import { PlayerVipPanel } from "../components/loyalty/PlayerVipPanel";
import { RankRewardsGrid } from "../components/loyalty/RankRewardsGrid";
import { formatCredits, formatPercent, formatRakeback } from "../lib/format";
import { LOCAL_XP_USER, resolveVip } from "../lib/loyalty";
import { RAKEBACK_OF_EDGE } from "../lib/rakeback";
import { sound } from "../lib/sound";
import { formatDropCountdown } from "../lib/xp";
import { RAKEBACK_EARLY_PCT, useEconomyStore } from "../store/economyStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
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
  secondary,
  onSecondary,
  art,
  amount,
}: {
  word: string;
  variant: "green" | "lime" | "gold";
  info?: ReactNode;
  footer: string;
  footerDisabled: boolean;
  onFooter?: () => void;
  secondary?: string;
  onSecondary?: () => void;
  art: ReactNode;
  amount?: string;
}) {
  const border =
    variant === "green"
      ? "border-[#4af1f1]/70"
      : variant === "lime"
        ? "border-lime-400/45"
        : "border-amber-400/45";
  const glow =
    variant === "green"
      ? "from-cyan-400/15"
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
        "drop-card relative flex min-h-[420px] flex-col overflow-hidden rounded-xl border-2 bg-[#0c1414] shadow-[4px_4px_0_#050808]",
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
      <div className="relative mx-3 mb-3 space-y-2">
        <button
          type="button"
          disabled={footerDisabled}
          onClick={onFooter}
          className={clsx(
            "w-full rounded-full border-2 px-4 py-2.5 text-center text-sm font-black uppercase tracking-[0.14em]",
            footerClass,
          )}
        >
          {footer}
        </button>
        {secondary ? (
          <button
            type="button"
            onClick={onSecondary}
            className="w-full rounded-full border-2 border-amber-300/40 bg-amber-400/10 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-amber-100 hover:bg-amber-400/20"
          >
            {secondary}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function Rewards() {
  const pendingRakeback = useEconomyStore((s) => s.pendingRakeback);
  const rakebackMatureAt = useEconomyStore((s) => s.rakebackMatureAt);
  const pendingDailyRakeback = useEconomyStore((s) => s.pendingDailyRakeback);
  const dailyMatureAt = useEconomyStore((s) => s.dailyMatureAt);
  const claimRakeback = useEconomyStore((s) => s.claimRakeback);
  const claimEarlyRakeback = useEconomyStore((s) => s.claimEarlyRakeback);
  const claimDailyRakeback = useEconomyStore((s) => s.claimDailyRakeback);
  const credit = useEconomyStore((s) => s.credit);
  const weeklyReadyAt = useRewardsStore((s) => s.weeklyReadyAt);
  const monthlyReadyAt = useRewardsStore((s) => s.monthlyReadyAt);
  const claimWeekly = useRewardsStore((s) => s.claimWeekly);
  const claimMonthly = useRewardsStore((s) => s.claimMonthly);
  const lifetimeXp = useLoyaltyStore((s) => s.xpByUser[LOCAL_XP_USER] ?? 0);
  const tiers = useLoyaltyStore((s) => s.config.tiers);
  const vip = resolveVip(lifetimeXp, tiers);
  const push = useToastStore((s) => s.push);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const pending = pendingRakeback ?? 0;
  const matureAt = rakebackMatureAt ?? 0;
  const instantMature = pending > 0 && matureAt <= now;
  const canClaimEarly = pending > 0 && !instantMature;
  const dailyPending = pendingDailyRakeback ?? 0;
  const dailyAt = dailyMatureAt ?? 0;
  const dailyMature = dailyPending > 0 && dailyAt <= now;
  const weeklyReady = now >= weeklyReadyAt;
  const monthlyReady = now >= monthlyReadyAt;

  function handleClaimInstant() {
    const amt = claimRakeback();
    if (amt <= 0) {
      push(
        pending > 0
          ? "Instant Drop is still maturing — wait for the timer or claim early at 70%."
          : "Nothing to claim yet — play a real stake first.",
        "info",
      );
      return;
    }
    sound.win("small");
    push(`Claimed ${formatRakeback(amt)} SH rakeback.`, "success");
  }

  function handleClaimEarly() {
    const amt = claimEarlyRakeback();
    if (amt <= 0) {
      push("Nothing to claim early.", "info");
      return;
    }
    sound.win("small");
    push(`Claimed ${formatRakeback(amt)} SH early (70% of Instant Drop).`, "success");
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

  function handleDaily() {
    const amt = claimDailyRakeback();
    if (amt <= 0) {
      push(
        dailyPending > 0
          ? "Daily rakeback is still maturing — wait for the 24h timer."
          : "Nothing to claim yet — play a real stake first.",
        "info",
      );
      return;
    }
    sound.win("small");
    push(`Claimed ${formatRakeback(amt)} SH daily rakeback.`, "success");
  }

  return (
    <div className="space-y-5">
      <PlayerVipPanel compact />
      <div className="flex justify-end">
        <Link to="/vip" className="text-xs font-semibold uppercase tracking-wide text-emerald-300 hover:text-emerald-200">
          XP history & missions →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DropCard
          word="Instant"
          variant="green"
          art={<CoinStackArt accent="green" />}
          amount={pending > 0 ? `${formatRakeback(pending)} SH` : undefined}
          footer={
            pending <= 0 ? "Not claimable" : instantMature ? "Claim" : formatDropCountdown(matureAt - now)
          }
          footerDisabled={pending <= 0 || !instantMature}
          onFooter={handleClaimInstant}
          secondary={
            canClaimEarly
              ? `Claim early · ${formatRakeback(pending * RAKEBACK_EARLY_PCT)} SH`
              : undefined
          }
          onSecondary={handleClaimEarly}
          info={
            <DropInfo title="Instant drop">
              <p>
                Rakeback from real demo stakes (bet &gt; 0). Wait 24 hours after the first pending accrual to
                claim 100%. Claim early and you only receive {formatPercent(RAKEBACK_EARLY_PCT)} of that amount —
                the rest is forfeited.
              </p>
            </DropInfo>
          }
        />
        <DropCard
          word="Daily"
          variant="green"
          art={<CoinStackArt accent="green" />}
          amount={dailyPending > 0 ? `${formatRakeback(dailyPending)} SH` : undefined}
          footer={
            dailyPending <= 0 ? "Not claimable" : dailyMature ? "Claim" : formatDropCountdown(dailyAt - now)
          }
          footerDisabled={dailyPending <= 0 || !dailyMature}
          onFooter={handleDaily}
          info={
            <DropInfo title="Daily drop">
              <p>
                A separate rakeback bucket from real demo stakes (bet &gt; 0). It accrues with Instant Drop from the
                same house-edge slice, plus your VIP rakeback bonus. Claim 100% after 24 hours from the first pending
                accrual of the cycle. After a claim, new stakes start a fresh daily timer. No early claim.
              </p>
            </DropInfo>
          }
        />
        <DropCard
          word="Weekly"
          variant="lime"
          art={<CoinStackArt accent="lime" extra />}
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
        Instant Drop and Daily Drop each accrue {formatPercent(RAKEBACK_OF_EDGE)} of the house-edge slice from real
        demo stakes (bet &gt; 0), plus your VIP rakeback bonus. Instant: full claim after 24 hours, or claim early for{" "}
        {formatPercent(RAKEBACK_EARLY_PCT)} of the pending amount. Daily: 24h mature, 100% claim only. Game RTP is
        unchanged. Chat rain still lives in the chat sidebar.
      </p>

      <RankRewardsGrid tiers={tiers} currentId={vip.current.id} lifetimeXp={lifetimeXp} />

      <Link to="/" className="text-sm text-slate-400 hover:text-white">
        ← Back to lobby
      </Link>
    </div>
  );
}
