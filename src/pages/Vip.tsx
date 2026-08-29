import { Link } from "react-router-dom";
import { PlayerVipPanel } from "../components/loyalty/PlayerVipPanel";
import { RankRewardsGrid } from "../components/loyalty/RankRewardsGrid";
import { LOCAL_XP_USER, resolveVip } from "../lib/loyalty";
import { useLoyaltyStore } from "../store/loyaltyStore";

export function Vip() {
  const lifetimeXp = useLoyaltyStore((s) => s.xpByUser[LOCAL_XP_USER] ?? 0);
  const tiers = useLoyaltyStore((s) => s.config.tiers);
  const currentId = resolveVip(lifetimeXp, tiers).current.id;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">VIP & XP</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
          Lifetime XP from World Lock wagers. Shards and demo bets don’t count.
        </p>
      </div>
      <PlayerVipPanel />
      <RankRewardsGrid tiers={tiers} currentId={currentId} lifetimeXp={lifetimeXp} />
      <Link to="/rewards" className="text-sm text-slate-400 hover:text-white">
        ← Rewards drops
      </Link>
    </div>
  );
}
