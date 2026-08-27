import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Lock,
  Plus,
  Share2,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { PlayerAvatar } from "../components/identity/PlayerAvatar";
import { CashAmount } from "../components/ui/CurrencyIcon";
import {
  AFFILIATE_CODE_MAX,
  AFFILIATE_CODE_MIN,
  AFFILIATE_PAGE_SIZE,
  AFFILIATE_SHARE,
  COMMISSION_EXAMPLE,
  DEMO_BOARD,
  PROGRAM_STATS,
  colorForName,
  referralCommission,
  referralStatusAt,
  type AffiliateBoardRow,
} from "../lib/affiliate";
import { formatCash, formatPercent } from "../lib/format";
import { sound } from "../lib/sound";
import { assertBalanceUsable } from "../lib/stake";
import { isLocalOwner } from "../lib/owner";
import { useIdentityStore } from "../store/identityStore";
import { useLeaderboardStore } from "../store/leaderboardStore";
import { localWinName } from "../store/winLeaderStore";
import {
  affiliateAvailable,
  affiliateLifetime,
  ledgerFor,
  useAffiliateStore,
} from "../store/affiliateStore";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";

function FormulaChip({ label, accent }: { label: string; accent: "cyan" | "slate" | "emerald" }) {
  const tone =
    accent === "cyan"
      ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
      : accent === "emerald"
        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
        : "border-white/15 bg-white/5 text-slate-200";
  return (
    <span
      className={clsx(
        "inline-flex rounded-md border-2 px-2.5 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-wide",
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function Affiliate() {
  const session = useAuthStore((s) => s.session);
  const openGate = useAuthStore((s) => s.openGate);
  const ownerId = session?.trim().toLowerCase() ?? "";
  const myCodes = useAffiliateStore((s) => s.myCodes);
  const code = ownerId ? myCodes[ownerId] ?? "" : "";
  const push = useToastStore((s) => s.push);
  const ledgers = useAffiliateStore((s) => s.ledgers);
  const attributedCode = useAffiliateStore((s) => s.attributedCode);
  const applyCode = useAffiliateStore((s) => s.applyCode);
  const claimCustomCode = useAffiliateStore((s) => s.claimCustomCode);
  const claim = useAffiliateStore((s) => s.claim);
  const boardCreated = useAffiliateStore((s) => s.boardCreated);
  const createBoard = useAffiliateStore((s) => s.createBoard);
  const ledger = ledgerFor(ledgers, code);
  const referrals = ledger.referrals;
  const available = affiliateAvailable(ledger);
  const lifetime = affiliateLifetime(ledger);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [page, setPage] = useState(0);
  const [codeInput, setCodeInput] = useState("");
  const [pickInput, setPickInput] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = code ? `${origin}/?ref=${encodeURIComponent(code)}` : "";
  const pages = Math.max(1, Math.ceil(referrals.length / AFFILIATE_PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const rows = referrals.slice(safePage * AFFILIATE_PAGE_SIZE, (safePage + 1) * AFFILIATE_PAGE_SIZE);
  const usingOwnCode = Boolean(attributedCode && code && attributedCode === code);
  const example = COMMISSION_EXAMPLE;
  const ownerRole = useIdentityStore((s) => s.roleFor("You"));
  const weeklyWager = useLeaderboardStore((s) => s.you.weekly);
  const raceRows: AffiliateBoardRow[] = (() => {
    const rows = DEMO_BOARD.map((row) => ({ ...row }));
    if (ownerRole !== "owner" && !isLocalOwner()) {
      const name = localWinName();
      const color = colorForName(name);
      const existing = rows.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
      if (existing >= 0) rows[existing] = { ...rows[existing]!, wagerWl: Math.max(rows[existing]!.wagerWl, weeklyWager) };
      else rows.push({ name, color, wagerWl: weeklyWager, place: 0, prizeWl: 0 });
    }
    const prizes = [250, 120, 50];
    return rows
      .sort((a, b) => b.wagerWl - a.wagerWl || a.name.localeCompare(b.name))
      .map((row, i) => ({ ...row, place: i + 1, prizeWl: prizes[i] ?? 0 }));
  })();

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
    if (!link) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "SeedBET affiliate",
          text: "Play-money vault invite — World Locks, no cash.",
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
    if (!assertBalanceUsable("claim affiliate earnings")) return;
    const amt = claim();
    if (amt <= 0) {
      push(code ? "Nothing to claim yet." : "Lock your affiliate code before claiming.", "info");
      return;
    }
    push(`Claimed ${formatCash(amt)} from affiliate cut.`, "success");
  }

  function handleApplyCode() {
    sound.click();
    const result = applyCode(codeInput);
    if (result === "ok") {
      push("Affiliate code saved. Real World Lock bets will pay that code.", "success");
      setCodeInput("");
      return;
    }
    if (result === "already") {
      push(`Already attributed to ${attributedCode} (first touch).`, "info");
      return;
    }
    if (result === "unknown") {
      push("No affiliate owns that code.", "warning");
      return;
    }
    push(`Enter a valid affiliate code (${AFFILIATE_CODE_MIN}–${AFFILIATE_CODE_MAX} letters or numbers).`, "warning");
  }

  function handlePickCode() {
    sound.click();
    if (!session) {
      openGate();
      return;
    }
    const err = claimCustomCode(pickInput);
    if (err) {
      push(err, "warning");
      return;
    }
    push("Affiliate code locked. It cannot be changed.", "success");
    setPickInput("");
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
          Join the SeedBET affiliate program and get a World Lock cut every time your friends play. Play-money only —
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
            value={<CashAmount currency="wl" wl={PROGRAM_STATS.earnedAllTimeWl} iconClassName="h-5 w-5" />}
            label="Total earned all time"
          />
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Program-wide showcase totals. Your personal cut is below.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface flex flex-col p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Available to claim</p>
          <p className="mt-3 text-3xl font-black text-white">
            <CashAmount currency="wl" wl={available} iconClassName="h-7 w-7" />
          </p>
          <button
            type="button"
            disabled={available <= 0}
            onClick={handleClaim}
            className="btn-cyan mt-4 w-full py-2.5 text-sm disabled:opacity-40"
          >
            Claim now
          </button>
          <p className="mt-2 text-[11px] text-slate-500">Credits World Locks to your balance immediately.</p>
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Total earnings</p>
          <p className="mt-3 text-3xl font-black text-white">
            <CashAmount currency="wl" wl={lifetime} iconClassName="h-7 w-7" />
          </p>
          <p className="mt-3 text-xs text-slate-400">All-time commissions on this browser</p>
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Referrals</p>
          <p className="mt-3 font-mono text-3xl font-black text-white">{referrals.length}</p>
          <p className="mt-3 text-xs text-slate-400">Players who wagered with your code</p>
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Affiliate code</p>
          {code ? (
            <>
              <p className="mt-3 font-mono text-2xl font-black tracking-wide text-cyan-200">{code}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Lock className="h-3 w-3" />
                Locked forever — cannot be changed
              </p>
              <button
                type="button"
                onClick={() => void copyText("code", code)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-cyan-300 hover:text-cyan-100"
              >
                {copied === "code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "code" ? "Copied" : "Share this code"}
              </button>
            </>
          ) : !session ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Pick a custom code once. After you lock it, it can never be changed.
              </p>
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  openGate();
                }}
                className="btn-cyan mt-4 w-full py-2.5 text-sm"
              >
                Sign in to pick a code
              </button>
            </>
          ) : (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                handlePickCode();
              }}
            >
              <input
                value={pickInput}
                onChange={(e) => setPickInput(e.target.value)}
                placeholder="e.g. zapp"
                maxLength={AFFILIATE_CODE_MAX}
                className="w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-slate-200 outline-none"
              />
              <button type="submit" className="btn-cyan w-full py-2.5 text-sm">
                Lock this code
              </button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {AFFILIATE_CODE_MIN}–{AFFILIATE_CODE_MAX} letters or numbers. One chance — locked forever.
              </p>
            </form>
          )}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your affiliate link</p>
          {code ? (
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
          ) : (
            <p className="mt-3 text-sm text-slate-400">Lock your affiliate code first to get a shareable link.</p>
          )}
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Have a code?</p>
          {attributedCode ? (
            <p className="mt-2 text-sm text-slate-300">
              First-touch attribution: <span className="font-mono font-bold text-cyan-200">{attributedCode}</span>
              {usingOwnCode ? " — that’s your own code, so self-referrals are not paid." : ". Real World Lock bets pay that affiliate."}
            </p>
          ) : (
            <form
              className="mt-2 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                handleApplyCode();
              }}
            >
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter affiliate code"
                className="min-w-0 flex-1 rounded-md border-2 border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-slate-200 outline-none"
              />
              <button type="submit" className="btn-cyan shrink-0 px-3 py-2 text-sm">
                Apply code
              </button>
            </form>
          )}
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">How you earn</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Commission = Your Share % × Total Bets by Referrals × House Edge of the Game. This pays on the{" "}
            <span className="font-semibold text-white">theoretical house edge</span> of every real bet (bet &gt; 0), not
            actual player losses. Demo / 0 bets do not count. Paid in World Locks.
          </p>
          <p className="mt-3 font-mono text-sm text-cyan-100">
            Example: {formatPercent(example.share, 0)} × {example.wagerWl.toLocaleString("en-US")} WL bets ×{" "}
            {formatPercent(example.houseEdge, 0)} edge = {example.payout.toLocaleString("en-US")} WL.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FormulaChip label={`${formatPercent(AFFILIATE_SHARE, 0)} your share`} accent="cyan" />
            <span className="text-slate-500">×</span>
            <FormulaChip label="Total bets by referrals" accent="slate" />
            <span className="text-slate-500">×</span>
            <FormulaChip label="House edge of the game" accent="slate" />
            <span className="text-slate-500">=</span>
            <FormulaChip label="Your commission" accent="emerald" />
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b-2 border-white/10 px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Referral performance</p>
          <p className="mt-1 text-xs text-slate-500">Live players who wagered with your code on this browser.</p>
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-200">No referred players yet</p>
                    <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
                      Share your link. When someone opens it (or enters your code) and places a real World Lock bet, they
                      appear here with wager, bet count, and your theoretical-edge commission.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const status = referralStatusAt(row);
                  return (
                    <tr key={row.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2">
                          <PlayerAvatar name={row.name} color={row.color} size={28} />
                          <span className="font-semibold text-white">{row.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-200">
                        <CashAmount currency="wl" wl={row.wagerWl} />
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-300">{row.bets.toLocaleString("en-US")}</td>
                      <td className="px-3 py-3 text-emerald-200">
                        <CashAmount currency="wl" wl={referralCommission(row)} iconClassName="h-4 w-4" />
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={clsx(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                            status === "active" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-400",
                          )}
                        >
                          {status === "active" ? "Active" : "Idle"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md border border-white/10 p-1.5 text-slate-300 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs text-slate-400">
            {safePage + 1} / {pages}
          </span>
          <button
            type="button"
            disabled={safePage >= pages - 1}
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
              Showcase race for this demo. Offer World Lock prizes to the top of the board — still play-money, still local.
              Owner World Locks are never counted here.
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
                    {raceRows.map((row) => (
                      <tr key={row.name} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 pr-3 font-mono font-bold text-cyan-200">#{row.place}</td>
                        <td className="py-2.5 pr-3">
                          <span className="inline-flex items-center gap-2">
                            <PlayerAvatar name={row.name} color={row.color} size={24} />
                            {row.name}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <CashAmount currency="wl" wl={row.wagerWl} />
                        </td>
                        <td className="py-2.5 text-amber-200">
                          <CashAmount currency="wl" wl={row.prizeWl} iconClassName="h-4 w-4" />
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
        Personal available / lifetime / referral rows are live demo data on this browser. Program totals and the
        leaderboard are labeled showcase figures. Claiming credits World Locks here only. SeedBET never pays cash and never
        tracks real affiliate traffic.
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
      <div className="flex items-center gap-1.5 text-2xl font-black text-white">
        {icon}
        {value}
      </div>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
