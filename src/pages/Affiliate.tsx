import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Share2,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { PlayerAvatar } from "../components/identity/PlayerAvatar";
import { CashAmount, CurrencyIcon } from "../components/ui/CurrencyIcon";
import {
  AFFILIATE_PAGE_SIZE,
  AFFILIATE_SHARE,
  DEMO_BOARD,
  DEMO_REFERRALS,
  makeAffiliateCode,
  PROGRAM_STATS,
  referralCommission,
} from "../lib/affiliate";
import { formatFunCoins, formatPercent } from "../lib/format";
import { sound } from "../lib/sound";
import { useAffiliateStore, affiliateAvailable, affiliateLifetime } from "../store/affiliateStore";
import { useAuthStore } from "../store/authStore";
import { useDemoProfileStore } from "../store/demoProfileStore";
import { useToastStore } from "../store/toastStore";

function ShardAmount({
  value,
  className,
  iconClassName = "h-5 w-5",
}: {
  value: number;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <span className="font-mono tabular-nums">{formatFunCoins(value)}</span>
      <CurrencyIcon kind="shards" className={iconClassName} />
    </span>
  );
}

function FormulaChip({ label, accent }: { label: string; accent: "cyan" | "slate" | "emerald" }) {
  const tone =
    accent === "cyan"
      ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
      : accent === "emerald"
        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
        : "border-white/15 bg-white/5 text-slate-200";
  return (
    <span className={clsx("inline-flex rounded-md border-2 px-2.5 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-wide", tone)}>
      {label}
    </span>
  );
}

export function Affiliate() {
  const displayName = useDemoProfileStore((s) => s.displayName);
  const session = useAuthStore((s) => s.session);
  const code = useMemo(() => makeAffiliateCode(session || displayName), [session, displayName]);
  const push = useToastStore((s) => s.push);
  const claimedShards = useAffiliateStore((s) => s.claimedShards);
  const claim = useAffiliateStore((s) => s.claim);
  const boardCreated = useAffiliateStore((s) => s.boardCreated);
  const createBoard = useAffiliateStore((s) => s.createBoard);
  const available = affiliateAvailable(claimedShards);
  const lifetime = affiliateLifetime();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [page, setPage] = useState(0);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/?ref=${encodeURIComponent(code)}`;
  const pages = Math.max(1, Math.ceil(DEMO_REFERRALS.length / AFFILIATE_PAGE_SIZE));
  const rows = DEMO_REFERRALS.slice(page * AFFILIATE_PAGE_SIZE, (page + 1) * AFFILIATE_PAGE_SIZE);

  async function copyText(kind: "code" | "link", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      sound.click();
      push(kind === "code" ? "Affiliate code copied." : "Affiliate link copied.", "success");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      push("Could not copy. Select the text instead.", "warning");
    }
  }

  async function shareLink() {
    sound.click();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "SeedBET affiliate",
          text: "Play-money vault invite — Shards only, no cash.",
          url: link,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyText("link", link);
  }

  function handleClaim() {
    sound.click();
    const amt = claim();
    if (amt <= 0) {
      push("Nothing to claim yet.", "info");
      return;
    }
    push(`Claimed ${formatFunCoins(amt)} Shards from affiliate cut.`, "success");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-xl border-2 border-cyan-400/35 bg-gradient-to-br from-cyan-500/12 via-[#0e1818] to-[#0a1010] p-6 shadow-[4px_4px_0_#050808]">
        <Users className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 text-cyan-300/10" />
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">Affiliate program</p>
        <h1 className="pixel-label mt-1 text-3xl font-extrabold uppercase text-white sm:text-4xl">
          Invite your friends. Earn <span className="text-cyan-300">rewards</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Join the SeedBET affiliate program and get a Shard cut every time your friends play. Play-money only —
          no cash, no withdrawals, no real-money payouts.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat value={formatPercent(AFFILIATE_SHARE, 0)} label="Commission rate" />
          <HeroStat value="Instant" label="Payouts" icon={<Zap className="h-4 w-4 text-cyan-300" />} />
          <HeroStat
            value={PROGRAM_STATS.referredPlayersAllTime.toLocaleString("en-US")}
            label="Referred players all time"
          />
          <HeroStat
            value={<ShardAmount value={PROGRAM_STATS.earnedAllTimeShards} iconClassName="h-5 w-5" />}
            label="Total earned all time"
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface flex flex-col p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Available to claim</p>
          <p className="mt-3 text-3xl font-black text-white">
            <ShardAmount value={available} iconClassName="h-7 w-7" />
          </p>
          <button
            type="button"
            disabled={available <= 0}
            onClick={handleClaim}
            className="btn-cyan mt-4 w-full py-2.5 text-sm disabled:opacity-40"
          >
            Claim now
          </button>
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Total earnings</p>
          <p className="mt-3 text-3xl font-black text-white">
            <ShardAmount value={lifetime} iconClassName="h-7 w-7" />
          </p>
          <p className="mt-3 text-xs text-slate-400">All-time commissions</p>
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Referrals</p>
          <p className="mt-3 font-mono text-3xl font-black text-white">{DEMO_REFERRALS.length}</p>
          <p className="mt-3 text-xs text-slate-400">Total registered players</p>
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Affiliate code</p>
          <p className="mt-3 font-mono text-2xl font-black tracking-wide text-cyan-200">{code}</p>
          <button
            type="button"
            onClick={() => void copyText("code", code)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-cyan-300 hover:text-cyan-100"
          >
            {copied === "code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === "code" ? "Copied" : "Share this code"}
          </button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your affiliate link</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={link}
              className="min-w-0 flex-1 rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-slate-200 outline-none"
            />
            <button type="button" onClick={() => void copyText("link", link)} className="btn-cyan shrink-0 gap-1.5 px-3 py-2 text-sm">
              {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border-2 border-white/15 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/5"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">How you earn</p>
          <p className="mt-3 text-sm text-slate-300">Commission is a Shard cut of the house-edge slice on referred World Lock wagers.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FormulaChip label={`${formatPercent(AFFILIATE_SHARE, 0)} your share`} accent="cyan" />
            <span className="text-slate-500">×</span>
            <FormulaChip label="Total wager by referrals" accent="slate" />
            <span className="text-slate-500">×</span>
            <FormulaChip label="House edge by game" accent="slate" />
            <span className="text-slate-500">=</span>
            <FormulaChip label="Your commission" accent="emerald" />
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b-2 border-white/10 px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Referral performance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-5 py-3 font-bold">Player</th>
                <th className="px-3 py-3 font-bold">Wager</th>
                <th className="px-3 py-3 font-bold">Bets</th>
                <th className="px-3 py-3 font-bold">Commission</th>
                <th className="px-5 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <PlayerAvatar name={row.name} color={row.color} size={28} />
                      <span className="font-semibold text-white">{row.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-200">
                    <CashAmount wl={row.wagerWl} />
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-300">{row.bets.toLocaleString("en-US")}</td>
                  <td className="px-3 py-3 text-emerald-200">
                    <ShardAmount value={referralCommission(row)} iconClassName="h-4 w-4" />
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={clsx(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                        row.status === "active" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-400",
                      )}
                    >
                      {row.status === "active" ? "Active" : "Idle"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md border border-white/10 p-1.5 text-slate-300 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs text-slate-400">
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            className="rounded-md border border-white/10 p-1.5 text-slate-300 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="surface p-5">
        <div className="flex items-start gap-3">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
          <div className="min-w-0 flex-1">
            <h2 className="pixel-label text-xl font-extrabold uppercase text-white">Leaderboard</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
              Track players who wager with your affiliate code. Offer Shard prizes to the top of the board and
              keep the race going — still play-money, still local to this demo.
            </p>
            {boardCreated ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      <th className="py-2 pr-3 font-bold">Place</th>
                      <th className="py-2 pr-3 font-bold">Player</th>
                      <th className="py-2 pr-3 font-bold">Wager</th>
                      <th className="py-2 font-bold">Prize</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_BOARD.map((row) => (
                      <tr key={row.name} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 pr-3 font-mono font-bold text-cyan-200">#{row.place}</td>
                        <td className="py-2.5 pr-3">
                          <span className="inline-flex items-center gap-2">
                            <PlayerAvatar name={row.name} color={row.color} size={24} />
                            {row.name}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <CashAmount wl={row.wagerWl} />
                        </td>
                        <td className="py-2.5 text-amber-200">
                          <ShardAmount value={row.prizeShards} iconClassName="h-4 w-4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  createBoard();
                  push("Vault Race leaderboard is live for this demo.", "success");
                }}
                className="btn-cyan mt-4 w-full gap-1.5 py-3 text-sm sm:w-auto sm:px-8"
              >
                <Plus className="h-4 w-4" /> Create leaderboard
              </button>
            )}
          </div>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-slate-500">
        Showcase referrals and Shard commissions are local demo data. Claiming credits Shards on this browser only.
        SeedBET never pays cash and never tracks real affiliate traffic.
      </p>

      <Link to="/rewards" className="text-sm text-slate-400 hover:text-white">
        ← Rewards & rakeback
      </Link>
    </div>
  );
}

function HeroStat({
  value,
  label,
  icon,
}: {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-2xl font-black text-white">{icon}{value}</div>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
