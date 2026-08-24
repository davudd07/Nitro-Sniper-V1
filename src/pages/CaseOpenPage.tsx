import { useMemo, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { getCase, rollCaseItem } from "../data/cases";
import { CaseReel } from "../components/cases/CaseReel";
import { CaseThumb } from "../components/cases/CaseThumb";
import { RiskBadge } from "../components/cases/RiskBadge";
import { ItemCard } from "../components/ui/ItemCard";
import { Switch } from "../components/ui/Switch";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { useAdminViewStore } from "../store/adminViewStore";
import { useCommunityCaseStore } from "../store/communityCaseStore";
import { takeStake } from "../lib/stake";
import { HOUSE_EDGE } from "../lib/rakeback";
import { formatCredits, formatCash, formatPercent } from "../lib/format";
import { formatTicketRange } from "../lib/caseTickets";
import { COMMUNITY_COMMISSION_OF_EDGE, communityCommissionPerOpen } from "../lib/communityCases";
import type { CaseItem } from "../data/items";
import { isMaxxxWin } from "../data/items";
import type { CaseOddsEntry } from "../data/cases";
import { useMaxxxWinStore } from "../store/maxxxWinStore";

const MAX_OPENS = 4;

export function CaseOpenPage() {
  const { caseId } = useParams();
  const c = caseId ? getCase(caseId) : undefined;

  const [goldSpin, setGoldSpin] = useState(true);
  const [openCount, setOpenCount] = useState(1);
  const [spinToken, setSpinToken] = useState(0);
  const [pendingResults, setPendingResults] = useState<(CaseOddsEntry | null)[]>([null]);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<{ item: CaseItem; id: string }[]>([]);
  const landedRef = useRef(0);
  const roundCountRef = useRef(1);
  const roundItemsRef = useRef<CaseItem[]>([]);
  const demoRoundRef = useRef(false);

  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);
  const adminView = useAdminViewStore((s) => s.active);

  const goldPool = useMemo(() => (c ? c.odds.filter((o) => o.goldTier).map((o) => o.item) : []), [c]);
  const goldIds = useMemo(() => new Set(goldPool.map((item) => item.id)), [goldPool]);
  const pool = useMemo(() => (c ? c.odds.map((o) => o.item) : []), [c]);

  if (!c) return <Navigate to="/cases" replace />;

  const totalPrice = c.price * openCount;
  const reelSize = openCount >= 3 ? "md" : "lg";

  async function openCase(demo = false) {
    if (spinning || !c) return;
    const n = openCount;
    const stake = demo ? 0 : c.price * n;
    if (!takeStake(stake, HOUSE_EDGE.cases)) {
      push(`You need ${formatCash(c.price * n)} to open this case.`, "danger");
      return;
    }
    if (!demo && c.community) {
      useCommunityCaseStore.getState().accrue(c.id, n);
    }
    demoRoundRef.current = demo;
    setSpinning(true);
    landedRef.current = 0;
    roundCountRef.current = n;
    roundItemsRef.current = [];
    const rolls = await play(n);
    setPendingResults(rolls.map((roll) => rollCaseItem(c, roll)));
    setSpinToken((t) => t + 1);
  }

  function handleLanded(item: CaseItem) {
    if (!c) return;
    if (isMaxxxWin(item)) useMaxxxWinStore.getState().fire();
    const demo = demoRoundRef.current;
    if (!demo) {
      credit(item.value);
      recordRound(c.price, item.value, "cases");
    } else {
      recordRound(0, 0, "cases");
    }
    roundItemsRef.current.push(item);
    setHistory((h) => [{ item, id: `${Date.now()}-${h.length}-${item.id}` }, ...h].slice(0, 24));
    landedRef.current += 1;
    if (landedRef.current < roundCountRef.current) return;
    setSpinning(false);
    const items = roundItemsRef.current;
    const totalValue = items.reduce((s, i) => s + i.value, 0);
    const cost = demo ? 0 : c.price * items.length;
    const profit = totalValue - cost;
    const prefix = demo ? "Demo · " : "";
    if (items.length === 1) {
      const it = items[0];
      push(
        `${prefix}Unboxed ${it.name} worth ${formatCash(it.value)}${demo ? " (no stake)" : "!"}`,
        profit >= 0 ? "success" : "info",
      );
    } else {
      push(
        `${prefix}Unboxed ${items.length} items worth ${formatCash(totalValue)}${demo ? " (no stake)" : ` (${profit >= 0 ? "+" : ""}${formatCredits(profit)})`}.`,
        profit >= 0 ? "success" : "info",
      );
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/cases" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to cases
      </Link>

      <div className="surface overflow-hidden">
        <CaseThumb c={c} className="h-40 sm:h-48" />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-white">{c.name}</h1>
              <RiskBadge risk={c.risk} />
            </div>
            <p className="text-sm text-slate-400">{c.blurb}</p>
            {c.community && c.creatorName ? (
              <p className="text-[11px] text-slate-500">Community · {c.creatorName}</p>
            ) : null}
          </div>
          <InfoButton title={`${c.name} — Odds & House Edge`}>
            <StatRow label="Price" value={`${formatCash(c.price)}`} />
            <StatRow label="Return to player (RTP)" value={formatPercent(c.rtp)} />
            <StatRow label="House edge" value={formatPercent(c.houseEdge)} />
            <StatRow label="Ticket pool" value="1,000,000" />
            <StatRow label="Rarest 1%" value="tickets 990,000–1,000,000" />
            {c.community && (
              <StatRow
                label="Creator commission"
                value={`${formatCash(communityCommissionPerOpen(c.price, c.houseEdge))}/open · ${formatPercent(c.commissionRate ?? COMMUNITY_COMMISSION_OF_EDGE)} of house edge to ${c.creatorName ?? "creator"}`}
              />
            )}
          </InfoButton>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <div className="surface min-w-0 space-y-3 overflow-hidden p-3">
            {Array.from({ length: openCount }, (_, i) => (
              <CaseReel
                key={i}
                pool={pool}
                goldPool={goldPool}
                result={pendingResults[i] ?? null}
                spinToken={spinToken}
                goldSpinEnabled={goldSpin}
                requireGoldConfirm
                size={reelSize}
                orientation="horizontal"
                laneSeed={i + 1}
                onLanded={handleLanded}
              />
            ))}
          </div>

          <div className="surface flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Switch checked={goldSpin} onChange={setGoldSpin} disabled={spinning} color="#fbbf24" />
                <Sparkles className="h-4 w-4 text-amber-300" /> Gold Spin
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Open</span>
                {Array.from({ length: MAX_OPENS }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={spinning}
                    onClick={() => {
                      if (spinning) return;
                      setOpenCount(n);
                      setPendingResults(Array.from({ length: n }, () => null));
                      setSpinToken(0);
                    }}
                    className={clsx(
                      "h-8 w-8 rounded-lg text-sm font-bold transition-colors disabled:opacity-40",
                      openCount === n ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void openCase(true)}
                disabled={spinning}
                className="rounded-md border-2 border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
                title="Same reel and odds — no SH spent or credited"
              >
                {spinning ? "Opening…" : "Demo spin"}
              </button>
              <button
                onClick={() => void openCase(false)}
                disabled={spinning}
                className="btn-primary px-8 py-2.5 disabled:opacity-50"
              >
                {spinning
                  ? "Opening…"
                  : openCount === 1
                    ? `Open · ${formatCash(c.price)}`
                    : `Open ${openCount}× · ${formatCash(totalPrice)}`}
              </button>
            </div>
          </div>

          {history.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your unboxed items</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {history.map((h) => (
                  <ItemCard
                    key={h.id}
                    item={h.item}
                    size="sm"
                    showChance={false}
                    highlightGold={adminView && goldIds.has(h.item.id)}
                    className={adminView && !goldIds.has(h.item.id) ? "opacity-55" : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ProvablyFairPanel />
          <div className="surface p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Odds table</p>
            {adminView && (
              <p className="mb-2 text-[10px] font-medium text-amber-200/80">Admin view: gold-spin pool highlighted</p>
            )}
            <div className="max-h-72 space-y-1 overflow-y-auto scrollbar-thin pr-1">
              {[...c.odds]
                .sort((a, b) => b.probability - a.probability)
                .map((o) => (
                  <div
                    key={o.item.id}
                    className={clsx(
                      "flex items-center justify-between rounded px-2 py-1.5 text-xs",
                      adminView && o.goldTier
                        ? "bg-amber-400/15 ring-1 ring-amber-300/70"
                        : "bg-black/20",
                      adminView && !o.goldTier && "opacity-55",
                    )}
                  >
                    <span className="truncate pr-2">{o.item.name}</span>
                    <span className="shrink-0 text-slate-400">
                      {(o.probability * 100).toFixed(o.probability < 0.001 ? 4 : 2)}%
                      <span className="ml-1.5 font-mono text-[10px] text-slate-500">
                        #{formatTicketRange(o.ticketStart, o.ticketEnd)}
                      </span>
                      {adminView && o.goldTier ? (
                        <span className="ml-1.5 font-bold uppercase tracking-wide text-amber-200">Gold spin</span>
                      ) : (
                        o.goldTier && " ✨"
                      )}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}