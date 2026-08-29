import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shuffle, Coins, Sparkles, Flag, Users, Plus, Banknote, Lock, Eye, Circle, Dices } from "lucide-react";
import { clsx } from "clsx";
import { sound } from "../lib/sound";
import { useBattleStore, type BattleConfig } from "../store/battleStore";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { BATTLE_MODES } from "../data/battleModes";
import { ModeGlyph, SeatStrip } from "../components/battles/ModeGlyph";
import { getCase } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { CasePreviewModal } from "../components/cases/CasePreviewModal";
import { CaseSearchInput } from "../components/cases/CaseSearchInput";
import { JoinBattleModal } from "../components/battles/JoinBattleModal";
import { matchesCaseName } from "../lib/caseSearch";
import { fundedSeatCost, joinCost, pctLabel } from "../lib/battleFinance";
import { HOUSE_EDGE } from "../lib/rakeback";
import { firstEmptySeat, occupiedCount, occupiedSeatFlags } from "../lib/battleSeats";
import { requireAccount, takeStakeFor, stakeNeedMessage } from "../lib/stake";
import { battlePlayCurrency, playCurrency, playCurrencyLabel, usePlayCurrency } from "../lib/playWallet";
import { BattleCost, BorrowBadge, FinishedBattleCostPaid } from "../components/battles/BattleCost";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { WinLeaderBadge } from "../components/layout/WinLeaderBadge";
import { FundedBattleBanner } from "../components/battles/FundedBattleBanner";

const FILTERS = [
  { id: "active", label: "Active battles" },
  { id: "open", label: "Open battles" },
  { id: "finished", label: "Finished battles" },
] as const;

export function CaseBattlesLobby() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("open");
  const [caseQuery, setCaseQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [joinTarget, setJoinTarget] = useState<BattleConfig | null>(null);
  const battlesMap = useBattleStore((s) => s.battles);
  const setJoinIntent = useBattleStore((s) => s.setJoinIntent);
  const joinIntents = useBattleStore((s) => s.joinIntents);
  const battles = useMemo(
    () => Object.values(battlesMap).sort((a, b) => b.createdAt - a.createdAt),
    [battlesMap],
  );
  const applyTipWager = useEconomyStore((s) => s.applyTipWager);
  const push = useToastStore((s) => s.push);
  const currency = usePlayCurrency();

  const rows = useMemo(() => {
    const q = caseQuery.trim();
    const visible = battles.filter((b) => {
      if (battlePlayCurrency(b) !== currency) return false;
      if (b.isPrivate && b.source !== "you") return false;
      const status = b.status ?? "open";
      if (filter === "finished") {
        if (status !== "finished") return false;
      } else if (filter === "active") {
        if (status !== "active") return false;
      } else if (status !== "open") {
        return false;
      }
      if (!q) return true;
      return b.cases.some((e) => {
        const c = getCase(e.caseId);
        return c ? matchesCaseName(c.name, q) : false;
      });
    });
    if (filter === "finished") {
      return [...visible]
        .sort((a, b) => (b.payout ?? 0) - (a.payout ?? 0) || (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
        .slice(0, 10);
    }
    return [...visible].sort((a, b) => {
      const af = a.eventKind === "funded" ? 1 : 0;
      const bf = b.eventKind === "funded" ? 1 : 0;
      if (bf !== af) return bf - af;
      return b.createdAt - a.createdAt;
    });
  }, [battles, filter, caseQuery, currency]);

  function occupied(b: BattleConfig) {
    return occupiedCount(occupiedSeatFlags(b, joinIntents[b.id]));
  }

  function spectateBattle(b: BattleConfig) {
    sound.click();
    navigate(`/battles/${b.id}?spectate=1`);
  }

  function openJoin(b: BattleConfig) {
    sound.click();
    if (b.status === "finished") {
      navigate(`/battles/${b.id}`);
      return;
    }
    if (b.source === "you") {
      navigate(`/battles/${b.id}`);
      return;
    }
    const { filled, seats } = occupied(b);
    if (filled >= seats) {
      spectateBattle(b);
      return;
    }
    setJoinTarget(b);
  }

  function confirmJoin(borrowPct: number) {
    const b = joinTarget;
    if (!b) return;
    if (!requireAccount()) return;
    const ledger = battlePlayCurrency(b);
    if (ledger !== playCurrency()) {
      push(`Switch to ${playCurrencyLabel(ledger)} to join.`, "warning");
      return;
    }
    const cost = joinCost(b.costPerPlayer, b.fundedPct, b.fundedPct > 0 ? 0 : borrowPct);
    if (!takeStakeFor(cost, HOUSE_EDGE.battles, ledger)) {
      push(stakeNeedMessage(cost, ledger), "danger");
      return;
    }
    if (cost > 0 && ledger === "wl") applyTipWager(cost);
    const seat = firstEmptySeat(occupiedSeatFlags(b, joinIntents[b.id]));
    setJoinIntent(b.id, { borrowPct: b.fundedPct > 0 ? 0 : borrowPct, seat });
    setJoinTarget(null);
    navigate(`/battles/${b.id}`);
  }

  const rowGrid =
    filter === "finished"
      ? "md:grid-cols-[minmax(14rem,1.25fr)_minmax(10rem,auto)_minmax(13rem,17rem)_minmax(8rem,13rem)_minmax(0,1fr)_10.5rem]"
      : "md:grid-cols-[minmax(14rem,1.25fr)_minmax(10rem,auto)_minmax(7.5rem,10rem)_minmax(8rem,13rem)_minmax(0,1fr)_10.5rem]";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-white">
            Case Battles
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                currency === "shards"
                  ? "bg-cyan-400/15 text-cyan-200"
                  : "bg-amber-400/15 text-amber-200",
              )}
            >
              {playCurrencyLabel(currency)} only
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Join a live {playCurrencyLabel(currency)} room or create one.
          </p>
        </div>
        <Link to="/battles/create" onClick={() => sound.click()} className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5">
          <Plus className="h-4 w-4" /> Create Battle
        </Link>
      </div>

      <FundedBattleBanner />

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
        <span className="ml-auto text-xs text-slate-500">
          {filter === "finished" ? `${rows.length} biggest payouts` : `${rows.length} ${filter}`}
        </span>
      </div>

      <CaseSearchInput value={caseQuery} onChange={setCaseQuery} placeholder="Search cases in this lobby" />

      <div className="surface overflow-hidden">
        <div className="flex items-end justify-end border-b border-white/8 px-4 py-1.5">
          <WinLeaderBadge game="battles" />
        </div>
        <div className={clsx("hidden border-b border-white/8 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:grid", rowGrid)}>
          <span>Cases</span>
          <span>Mode</span>
          <span>{filter === "finished" ? "Cost / Paid" : "Cost"}</span>
          <span>Players</span>
          <span>Modifiers</span>
          <span className="text-right">Action</span>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {caseQuery.trim()
              ? "No battles use a case matching that search."
              : filter === "finished"
                ? "No finished battles yet."
              : `No ${playCurrencyLabel(currency)} battles in this filter. Switch wallets in the header or create one.`}
          </p>
        ) : (
          <div className="divide-y divide-white/6">
            {rows.map((b) => {
              const mode = BATTLE_MODES.find((m) => m.id === b.modeId);
              const flags = occupiedSeatFlags(b, joinIntents[b.id]);
              const { filled, seats } = occupiedCount(flags);
              const waiting = filled < seats;
              const joinerPrice = fundedSeatCost(b.costPerPlayer, b.fundedPct);
              return (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (b.status === "finished") {
                      sound.click();
                      navigate(`/battles/${b.id}`);
                      return;
                    }
                    if (b.source === "you") {
                      sound.click();
                      navigate(`/battles/${b.id}`);
                      return;
                    }
                    spectateBattle(b);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (b.status === "finished") {
                        sound.click();
                        navigate(`/battles/${b.id}`);
                        return;
                      }
                      if (b.source === "you") {
                        sound.click();
                        navigate(`/battles/${b.id}`);
                        return;
                      }
                      spectateBattle(b);
                    }
                  }}
                  className={clsx("grid cursor-pointer items-center gap-3 px-4 py-3 hover:bg-white/[0.03]", rowGrid)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
                            className="relative shrink-0 rounded-lg transition-transform hover:z-10 hover:scale-110"
                          >
                            <CaseThumb c={c} size="list" className="h-12 w-12 rounded-lg ring-1 ring-black/40" />
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
                        {b.status === "finished" && (
                          <>
                            {" "}
                            · cost <CashAmount wl={b.costPerPlayer * seats} currency={battlePlayCurrency(b)} iconClassName="h-3 w-3" /> · paid{" "}
                            <CashAmount wl={b.payout ?? 0} currency={battlePlayCurrency(b)} iconClassName="h-3 w-3" />
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="hidden min-w-0 md:block">
                    {mode ? <ModeGlyph mode={mode} hideVs={b.shared} className="flex-wrap" /> : b.modeId}
                  </p>
                  <div className="hidden min-w-0 md:block">
                    {b.status === "finished" ? (
                      <FinishedBattleCostPaid
                        costPerPlayer={b.costPerPlayer}
                        seats={seats}
                        payout={b.payout ?? 0}
                        currency={battlePlayCurrency(b)}
                      />
                    ) : b.source === "you" ? (
                      <BattleCost
                        costPerPlayer={b.costPerPlayer}
                        borrowPct={b.creatorBorrowPct}
                        align="left"
                        compact
                        currency={battlePlayCurrency(b)}
                      />
                    ) : b.fundedPct > 0 ? (
                      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-amber-200">
                        <span className="text-[11px] font-normal text-slate-500 line-through">
                          <CashAmount wl={b.costPerPlayer} currency={battlePlayCurrency(b)} iconClassName="h-3 w-3" />
                        </span>
                        <CashAmount wl={joinerPrice} currency={battlePlayCurrency(b)} iconClassName="h-3.5 w-3.5" />
                      </p>
                    ) : (
                      <p className="font-semibold text-amber-200">
                        <CashAmount wl={b.costPerPlayer} currency={battlePlayCurrency(b)} iconClassName="h-3.5 w-3.5" />
                      </p>
                    )}
                  </div>
                  <div className="hidden min-w-0 md:block">
                    <SeatStrip flags={flags} teamSizes={mode?.teamSizes ?? []} hideVs={b.shared} />
                  </div>
                  <div className="hidden flex-wrap gap-1 md:flex">
                    {b.coinflip && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-400/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-200">
                        <Circle className="h-2.5 w-2.5" /> Flip
                      </span>
                    )}
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
                    {b.wildcard && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        <Dices className="h-2.5 w-2.5" /> Wild
                      </span>
                    )}
                    {b.shared && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                        <Users className="h-2.5 w-2.5" /> Shared
                      </span>
                    )}
                    {b.eventKind === "funded" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-lime-400/20 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-lime-200">
                        <Banknote className="h-2.5 w-2.5" /> House
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
                  <div className="flex justify-end gap-1.5">
                    {b.source !== "you" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          spectateBattle(b);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/5"
                      >
                        <Eye className="h-3 w-3" /> Spectate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openJoin(b);
                      }}
                      className={clsx(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95",
                        b.source === "you"
                          ? "border border-white/15 text-white hover:bg-white/5"
                          : waiting
                            ? "bg-emerald-500 text-bg-950"
                            : "border border-white/15 text-white hover:bg-white/5",
                      )}
                    >
                      {b.status === "finished" ? "View" : b.source === "you" ? "Open" : waiting ? "Join" : "Watch"}
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