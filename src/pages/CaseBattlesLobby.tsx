import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shuffle, Coins, Sparkles, Flag, Users, Plus, Banknote, Lock } from "lucide-react";
import { clsx } from "clsx";
import { sound } from "../lib/sound";
import { useBattleStore, type BattleConfig } from "../store/battleStore";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { BATTLE_MODES, totalPlayers } from "../data/battleModes";
import { getCase } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { CasePreviewModal } from "../components/cases/CasePreviewModal";
import { JoinBattleModal } from "../components/battles/JoinBattleModal";
import { formatCredits } from "../lib/format";
import { fundedSeatCost, joinCost, pctLabel } from "../lib/battleFinance";
import { HOUSE_EDGE } from "../lib/rakeback";
import { BattleCost, BorrowBadge } from "../components/battles/BattleCost";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "1v1", label: "1v1" },
  { id: "2v2", label: "2v2" },
  { id: "crazy", label: "Crazy" },
  { id: "jackpot", label: "Jackpot" },
] as const;

export function CaseBattlesLobby() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [joinTarget, setJoinTarget] = useState<BattleConfig | null>(null);
  const battlesMap = useBattleStore((s) => s.battles);
  const setJoinIntent = useBattleStore((s) => s.setJoinIntent);
  const battles = useMemo(
    () => Object.values(battlesMap).sort((a, b) => b.createdAt - a.createdAt),
    [battlesMap],
  );
  const spend = useEconomyStore((s) => s.spend);
  const awardRakeback = useEconomyStore((s) => s.awardRakeback);
  const push = useToastStore((s) => s.push);

  const rows = useMemo(() => {
    return battles.filter((b) => {
      if (b.isPrivate && b.source !== "you") return false;
      if (filter === "all") return true;
      if (filter === "crazy") return b.crazy;
      if (filter === "jackpot") return b.jackpot;
      return b.modeId.startsWith(filter);
    });
  }, [battles, filter]);

  function occupied(b: (typeof battles)[number]) {
    const mode = BATTLE_MODES.find((m) => m.id === b.modeId);
    const seats = mode ? totalPlayers(mode) : 0;
    const filled = b.source === "you" ? 1 : Math.min(seats, b.prefillBots);
    return { filled, seats };
  }

  function openJoin(b: BattleConfig) {
    sound.click();
    if (b.source === "you") {
      navigate(`/battles/${b.id}`);
      return;
    }
    const { filled, seats } = occupied(b);
    if (filled >= seats) {
      navigate(`/battles/${b.id}`);
      return;
    }
    setJoinTarget(b);
  }

  function confirmJoin(borrowPct: number) {
    const b = joinTarget;
    if (!b) return;
    const cost = joinCost(b.costPerPlayer, b.fundedPct, b.fundedPct > 0 ? 0 : borrowPct);
    if (!spend(cost)) {
      push(`You need ${formatCredits(cost)} SH to join that battle.`, "danger");
      return;
    }
    awardRakeback(cost, HOUSE_EDGE.battles);
    setJoinIntent(b.id, { borrowPct: b.fundedPct > 0 ? 0 : borrowPct });
    setJoinTarget(null);
    navigate(`/battles/${b.id}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Case Battles</h1>
          <p className="mt-1 text-sm text-slate-400">Join a live room or create one. Everyone pays their own seat.</p>
        </div>
        <Link to="/battles/create" onClick={() => sound.click()} className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5">
          <Plus className="h-4 w-4" /> Create Battle
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              sound.click();
              setFilter(f.id);
            }}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
              filter === f.id ? "bg-white/12 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{rows.length} active</span>
      </div>

      <div className="surface overflow-hidden">
        <div className="hidden grid-cols-[1fr_80px_170px_140px_150px_110px] border-b border-white/8 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
          <span>Cases</span>
          <span>Mode</span>
          <span>Cost</span>
          <span>Players</span>
          <span>Modifiers</span>
          <span className="text-right">Action</span>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No battles in this filter. Create one to get started.</p>
        ) : (
          <div className="divide-y divide-white/6">
            {rows.map((b) => {
              const mode = BATTLE_MODES.find((m) => m.id === b.modeId);
              const { filled, seats } = occupied(b);
              const waiting = filled < seats;
              const joinerPrice = fundedSeatCost(b.costPerPlayer, b.fundedPct);
              return (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openJoin(b)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openJoin(b);
                    }
                  }}
                  className="grid cursor-pointer items-center gap-3 px-4 py-3 md:grid-cols-[1fr_80px_170px_140px_150px_110px] hover:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex -space-x-2">
                      {b.cases.slice(0, 4).map((e, i) => {
                        const c = getCase(e.caseId);
                        if (!c) return null;
                        return (
                          <button
                            key={`${e.caseId}-${i}`}
                            type="button"
                            title={`Inspect ${c.name}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              sound.click();
                              setPreviewId(c.id);
                            }}
                            className="relative rounded-lg transition-transform hover:z-10 hover:scale-110"
                          >
                            <CaseThumb c={c} className="h-10 w-10 rounded-lg ring-2 ring-bg-800" />
                            {e.count > 1 && (
                              <span className="absolute -bottom-1 -right-1 rounded bg-black/80 px-1 text-[9px] font-bold text-white">
                                ×{e.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="min-w-0 md:hidden">
                      <p className="truncate text-sm font-semibold text-white">{mode?.label}</p>
                      <p className="text-[11px] text-slate-500">
                        {filled}/{seats} players
                      </p>
                    </div>
                  </div>
                  <p className="hidden text-sm font-semibold text-white md:block">{mode?.label}</p>
                  <div className="hidden md:block">
                    {b.source === "you" ? (
                      <BattleCost costPerPlayer={b.costPerPlayer} borrowPct={b.creatorBorrowPct} align="left" compact />
                    ) : b.fundedPct > 0 ? (
                      <p className="font-mono text-sm font-semibold text-amber-200">
                        <span className="mr-1 text-[11px] font-normal text-slate-500 line-through">
                          {formatCredits(b.costPerPlayer)}
                        </span>
                        {formatCredits(joinerPrice)}
                      </p>
                    ) : (
                      <p className="font-mono text-sm font-semibold text-amber-200">{formatCredits(b.costPerPlayer)}</p>
                    )}
                  </div>
                  <div className="hidden items-center gap-1.5 md:flex">
                    {Array.from({ length: seats }).map((_, i) => (
                      <span
                        key={i}
                        className={clsx(
                          "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold",
                          i < filled ? "bg-white/15 text-white" : "border border-dashed border-white/20 text-slate-600",
                        )}
                      >
                        {i < filled ? <Users className="h-3 w-3" /> : ""}
                      </span>
                    ))}
                    <span className="text-[11px] text-slate-500">
                      {filled}/{seats}
                    </span>
                  </div>
                  <div className="hidden flex-wrap gap-1 md:flex">
                    {b.crazy && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-300">
                        <Shuffle className="h-2.5 w-2.5" /> Crazy
                      </span>
                    )}
                    {b.jackpot && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        <Coins className="h-2.5 w-2.5" /> JP
                      </span>
                    )}
                    {b.terminal && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-medium text-pink-300">
                        <Flag className="h-2.5 w-2.5" /> Term
                      </span>
                    )}
                    {b.goldSpin && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-medium text-yellow-300">
                        <Sparkles className="h-2.5 w-2.5" /> Gold
                      </span>
                    )}
                    {b.shared && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                        <Users className="h-2.5 w-2.5" /> Shared
                      </span>
                    )}
                    {b.fundedPct > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        <Banknote className="h-2.5 w-2.5" /> {pctLabel(b.fundedPct)} funded
                      </span>
                    )}
                    {b.creatorBorrowPct > 0 && <BorrowBadge pct={b.creatorBorrowPct} />}
                    {b.isPrivate && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">
                        <Lock className="h-2.5 w-2.5" /> Private
                      </span>
                    )}
                    {b.source === "you" && (
                      <span className="rounded-full bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">Yours</span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openJoin(b);
                      }}
                      className={clsx(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95",
                        waiting ? "bg-emerald-500 text-bg-950" : "border border-white/15 text-white hover:bg-white/5",
                      )}
                    >
                      {b.source === "you" ? "Open" : waiting ? (b.fundedPct > 0 ? "Join" : "Join / Borrow") : "Watch"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <CasePreviewModal caseId={previewId} onClose={() => setPreviewId(null)} />
      {joinTarget && (
        <JoinBattleModal
          battle={joinTarget}
          onClose={() => setJoinTarget(null)}
          onConfirm={confirmJoin}
        />
      )}
    </div>
  );
}