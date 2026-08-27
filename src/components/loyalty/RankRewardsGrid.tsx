import { Crown, Lock, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { formatCash, formatPercent, formatXp } from "../../lib/format";
import { sortedTiers, type VipTier } from "../../lib/loyalty";

export function RankRewardsGrid({
  tiers,
  currentId,
  lifetimeXp,
}: {
  tiers: VipTier[];
  currentId: string;
  lifetimeXp: number;
}) {
  const list = sortedTiers(tiers);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Rank rewards</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
          Each rank has rakeback, a title, and a drop. Daily cases and keys are above.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((tier, i) => {
          const unlocked = lifetimeXp >= tier.minXp;
          const current = tier.id === currentId;
          return (
            <article
              key={tier.id}
              className={clsx(
                "relative overflow-hidden rounded-xl border-2 bg-[#0c1414] p-4 shadow-[3px_3px_0_#050808]",
                current ? "border-cyan-200/55" : unlocked ? "border-[#4af1f1]/45" : "border-white/10 opacity-80",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                    Rank {i + 1}
                    {current ? " · current" : unlocked ? " · unlocked" : " · locked"}
                  </p>
                  <p className="pixel-label mt-1 truncate text-2xl leading-none" style={{ color: tier.color }}>
                    {tier.name}
                  </p>
                </div>
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 bg-[#152020]"
                  style={{ borderColor: tier.color, color: tier.color }}
                >
                  {unlocked ? <Crown className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </div>
              </div>
              <p className="mt-2 font-mono text-xs text-slate-400">{formatXp(tier.minXp)} XP</p>
              <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-300">
                <li>
                  Rakeback bonus:{" "}
                  <span className="font-semibold text-emerald-200">+{formatPercent(tier.rakebackBonusPct)}</span> on
                  Instant and Daily
                </li>
                {tier.rankDropSh > 0 ? (
                  <li>
                    One-time rank drop:{" "}
                    <span className="font-semibold text-cyan-200">{formatCash(tier.rankDropSh)}</span>
                  </li>
                ) : (
                  <li className="text-slate-500">No rank Shard drop at this step.</li>
                )}
                <li>Daily case once every 24 hours (unlocked ranks).</li>
                {i > 0 ? <li>Rank-up grants a key for this band’s 2 hour case.</li> : <li>No key until Silver 1.</li>}
                {tier.cosmetic ? (
                  <li className="inline-flex items-start gap-1 text-amber-100/90">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0" /> {tier.cosmetic}
                  </li>
                ) : null}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
