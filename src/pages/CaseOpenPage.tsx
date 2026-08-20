import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
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
import { formatCredits, formatPercent } from "../lib/format";
import type { CaseItem } from "../data/items";
import type { CaseOddsEntry } from "../data/cases";

export function CaseOpenPage() {
  const { caseId } = useParams();
  const c = caseId ? getCase(caseId) : undefined;

  const [goldSpin, setGoldSpin] = useState(true);
  const [spinToken, setSpinToken] = useState(0);
  const [pendingResult, setPendingResult] = useState<CaseOddsEntry | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<{ item: CaseItem; id: number }[]>([]);

  const spend = useEconomyStore((s) => s.spend);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);

  const goldPool = useMemo(() => (c ? c.odds.filter((o) => o.goldTier).map((o) => o.item) : []), [c]);
  const pool = useMemo(() => (c ? c.odds.map((o) => o.item) : []), [c]);

  if (!c) return <Navigate to="/cases" replace />;

  async function openCase() {
    if (spinning || !c) return;
    if (!spend(c.price)) {
      push("Not enough Shards to open this case.", "danger");
      return;
    }
    setSpinning(true);
    const [roll] = await play(1);
    const result = rollCaseItem(c, roll);
    setPendingResult(result);
    setSpinToken((t) => t + 1);
  }

  function handleLanded(item: CaseItem) {
    if (!c) return;
    credit(item.value);
    recordRound(c.price, item.value);
    setHistory((h) => [{ item, id: Date.now() }, ...h].slice(0, 20));
    setSpinning(false);
    const profit = item.value - c.price;
    push(
      profit >= 0 ? `Unboxed ${item.name} worth ${formatCredits(item.value)} SH!` : `Unboxed ${item.name} (${formatCredits(item.value)} SH).`,
      profit >= 0 ? "success" : "info",
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/cases" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to cases
      </Link>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-bg-800/60">
        <CaseThumb c={c} className="h-40 sm:h-48" />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{c.name}</h1>
              <RiskBadge risk={c.risk} />
            </div>
            <p className="text-sm text-slate-400">{c.blurb}</p>
          </div>
          <InfoButton title={`${c.name} — Odds & House Edge`}>
            <StatRow label="Price" value={`${formatCredits(c.price)} SH`} />
            <StatRow label="Return to player (RTP)" value={formatPercent(c.rtp)} />
            <StatRow label="House edge" value={formatPercent(c.houseEdge)} />
          </InfoButton>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <CaseReel
            pool={pool}
            goldPool={goldPool}
            result={pendingResult}
            spinToken={spinToken}
            goldSpinEnabled={goldSpin}
            orientation="horizontal"
            onLanded={handleLanded}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-bg-800/60 p-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Switch checked={goldSpin} onChange={setGoldSpin} color="#fbbf24" />
              <Sparkles className="h-4 w-4 text-amber-300" /> Gold Spin
            </div>
            <button
              onClick={openCase}
              disabled={spinning}
              className="rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 px-8 py-2.5 font-bold text-bg-950 shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {spinning ? "Opening…" : `Open · ${formatCredits(c.price)} SH`}
            </button>
          </div>

          {history.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your unboxed items</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {history.map((h) => (
                  <ItemCard key={h.id} item={h.item} size="sm" showChance={false} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ProvablyFairPanel />
          <div className="rounded-xl border border-white/10 bg-bg-800/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Odds table</p>
            <div className="max-h-72 space-y-1 overflow-y-auto scrollbar-thin pr-1">
              {[...c.odds]
                .sort((a, b) => b.probability - a.probability)
                .map((o) => (
                  <div key={o.item.id} className="flex items-center justify-between rounded bg-black/20 px-2 py-1.5 text-xs">
                    <span className="truncate pr-2">{o.item.name}</span>
                    <span className="shrink-0 text-slate-400">
                      {(o.probability * 100).toFixed(o.probability < 0.001 ? 4 : 2)}%{o.goldTier && " ✨"}
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
