import { useMemo } from "react";
import { Crown, Flame, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { formatCredits, formatXp } from "../../lib/format";
import { ACTIVITY_GAME_LABELS, type ActivityGame } from "../../store/activityStore";
import { useLoyaltyStore } from "../../store/loyaltyStore";
import { XP_CATEGORY_LABELS, type XpSource } from "../../lib/loyalty";

const SOURCE_LABEL: Record<XpSource, string> = {
  wager: "Wager",
  boost: "Boost",
  mission: "Mission",
  admin: "Warden",
};

function gameLabel(gameType: string): string {
  if (!gameType) return "—";
  return ACTIVITY_GAME_LABELS[gameType as ActivityGame] ?? gameType;
}

export function PlayerVipPanel({ compact = false }: { compact?: boolean }) {
  const xpByUser = useLoyaltyStore((s) => s.xpByUser);
  const ledger = useLoyaltyStore((s) => s.ledger);
  const config = useLoyaltyStore((s) => s.config);
  const boosts = useLoyaltyStore((s) => s.boosts);
  const missionProgress = useLoyaltyStore((s) => s.missionProgress);
  const snapshot = useMemo(
    () => useLoyaltyStore.getState().playerSnapshot(),
    [xpByUser, ledger, config, boosts, missionProgress],
  );
  const { current, next, remaining, ratio, lifetimeXp, history, boosts: active, missions } = snapshot;
  const barPct = Math.max(0, Math.min(100, ratio * 100));
  const liveBoost = useMemo(() => active[0] ?? null, [active]);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-xl border-2 border-[#3a5c5c] bg-[#101818] px-4 py-3 shadow-[4px_4px_0_#050808] lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3 lg:w-[240px]">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 bg-[#152020]"
            style={{ borderColor: current.color, color: current.color }}
          >
            <Crown className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-400">VIP</p>
            <p className="pixel-label truncate text-3xl leading-none sm:text-4xl" style={{ color: current.color }}>
              {current.name}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400">{formatXp(lifetimeXp)} XP lifetime</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-400">
            {next ? `Progress to ${next.name}` : "Max tier"}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-3.5 min-w-0 flex-1 overflow-hidden rounded-full border border-[#4af1f1]/40 bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#164e4e] via-[#4af1f1] to-[#58ffff] transition-[width] duration-500"
                style={{ width: `${barPct}%` }}
              />
            </div>
            <p className="shrink-0 font-mono text-xs font-bold tabular-nums text-emerald-100 sm:text-sm">
              {next ? `${formatXp(remaining)} XP left` : "Complete"}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{current.benefits}</p>
          {liveBoost ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200">
              <Flame className="h-3 w-3" /> {liveBoost.multiplier}× XP · {liveBoost.reason}
            </p>
          ) : null}
        </div>
      </section>

      {!compact && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {missions.map(({ mission, progress }) => {
              const pct = Math.max(0, Math.min(100, (progress.progress / mission.target) * 100));
              return (
                <article key={mission.id} className="surface p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" /> {mission.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{mission.description}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                    <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {formatCredits(Math.min(progress.progress, mission.target))} / {formatCredits(mission.target)} SH
                    {progress.completed ? " · claimed" : ` · +${formatXp(mission.bonusXp)} XP`}
                  </p>
                </article>
              );
            })}
          </div>

          <section className="surface p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">XP history</p>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No XP yet. Place a Shard bet (not Fun Coins, not demo 0) to start.</p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto text-xs">
                {history.slice(0, 80).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-black/25 px-2 py-1.5">
                    <span className="min-w-0">
                      <span
                        className={clsx(
                          "mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          row.source === "wager"
                            ? "bg-emerald-500/15 text-emerald-200"
                            : row.source === "mission"
                              ? "bg-amber-500/15 text-amber-200"
                              : "bg-cyan-500/15 text-cyan-200",
                        )}
                      >
                        {SOURCE_LABEL[row.source]}
                      </span>
                      <span className="font-semibold text-white">{gameLabel(row.gameType)}</span>
                      <span className="ml-2 text-slate-500">{XP_CATEGORY_LABELS[row.category]}</span>
                      <span className="ml-2 font-mono text-slate-600">{new Date(row.timestamp).toLocaleString()}</span>
                    </span>
                    <span className="shrink-0 font-mono font-bold text-emerald-300">+{formatXp(row.calculatedXp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
