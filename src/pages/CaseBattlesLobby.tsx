import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shuffle, Coins, Sparkles, Flag, Users, Plus } from "lucide-react";
import { clsx } from "clsx";
import { sound } from "../lib/sound";
import { useBattleStore } from "../store/battleStore";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { BATTLE_MODES, totalPlayers } from "../data/battleModes";
import { getCase } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { formatCredits } from "../lib/format";

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
  const battlesMap = useBattleStore((s) => s.battles);
  const battles = useMemo(
    () => Object.values(battlesMap).sort((a, b) => b.createdAt - a.createdAt),
    [battlesMap],
  );
  const spend = useEconomyStore((s) => s.spend);
  const push = useToastStore((s) => s.push);

  const rows = useMemo(() => {
    return battles.filter((b) => {
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

  function join(b: (typeof battles)[number]) {
    sound.click();
    if (b.source !== "you") {
      if (!spend(b.costPerPlayer)) {
        push(`You need ${formatCredits(b.costPerPlayer)} SH to join that battle.`, "danger");
        return;
      }
    }
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
        <div className="hidden grid-cols-[1fr_90px_110px_140px_120px_100px] border-b border-white/8 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
          <span>Cases</span>
          <span>Mode</span>
          <span>Cost / seat</span>
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
              return (
                <div
                  key={b.id}
                  className="grid items-center gap-3 px-4 py-3 md:grid-cols-[1fr_90px_110px_140px_120px_100px]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex -space-x-2">
                      {b.cases.slice(0, 4).map((e, i) => {
                        const c = getCase(e.caseId);
                        if (!c) return null;
                        return (
                          <div key={`${e.caseId}-${i}`} className="relative" title={`${c.name} ×${e.count}`}>
                            <CaseThumb c={c} className="h-10 w-10 rounded-lg ring-2 ring-bg-800" />
                            {e.count > 1 && (
                              <span className="absolute -bottom-1 -right-1 rounded bg-black/80 px-1 text-[9px] font-bold text-white">
                                ×{e.count}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="min-w-0 md:hidden">
                      <p className="truncate text-sm font-semibold text-white">{mode?.label} · {formatCredits(b.costPerPlayer)} SH</p>
                      <p className="text-[11px] text-slate-500">
                        {filled}/{seats} players
                      </p>
                    </div>
                  </div>
                  <p className="hidden text-sm font-semibold text-white md:block">{mode?.label}</p>
                  <p className="hidden font-mono text-sm font-semibold text-amber-200 md:block">
                    {formatCredits(b.costPerPlayer)}
                  </p>
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
                    {b.source === "you" && (
                      <span className="rounded-full bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">Yours</span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => join(b)}
                      className={clsx(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95",
                        waiting ? "bg-emerald-500 text-bg-950" : "border border-white/15 text-white hover:bg-white/5",
                      )}
                    >
                      {b.source === "you" ? "Open" : waiting ? "Join" : "Watch"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}