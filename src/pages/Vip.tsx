import { Link } from "react-router-dom";
import { PlayerVipPanel } from "../components/loyalty/PlayerVipPanel";
import { RankRewardsGrid } from "../components/loyalty/RankRewardsGrid";
import { formatPercent } from "../lib/format";
import { LOCAL_XP_USER, resolveVip } from "../lib/loyalty";
import { useLoyaltyStore } from "../store/loyaltyStore";

export function Vip() {
  const mode = useLoyaltyStore((s) => s.config.mode);
  const originalsRate = useLoyaltyStore((s) => s.config.flatRates.originals);
  const lifetimeXp = useLoyaltyStore((s) => s.xpByUser[LOCAL_XP_USER] ?? 0);
  const tiers = useLoyaltyStore((s) => s.config.tiers);
  const currentId = resolveVip(lifetimeXp, tiers).current.id;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">VIP & XP</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
          Lifetime XP from World Lock wagers only — never Shards, never demo (0) stakes, never wins or losses.
          Current mode:{" "}
          <span className="font-semibold text-emerald-200">
            {mode === "flat" ? `flat ${originalsRate} XP / 1 WL on originals` : "house-edge × 100 × category"}
          </span>
          . Instant Drop and Daily Drop rakeback can gain a VIP bonus. Rank order: Unranked → Silver 1–3 → Gold 1–3 →
          Diamond 1–3 → Emerald → Sapphire → Ruby → Elite → Grandmaster → Obsidian → Emperor.
        </p>
      </div>
      <PlayerVipPanel />
      <RankRewardsGrid tiers={tiers} currentId={currentId} lifetimeXp={lifetimeXp} />
      <p className="text-xs text-slate-500">
        House-edge XP uses each game’s actual or assumed edge (blackjack {formatPercent(0.0059)}, jackpot{" "}
        {formatPercent(0.09)}, most originals {formatPercent(0.04)}, keno {formatPercent(0.06)}). Live Casino
        category is 3× in house-edge mode.
      </p>
      <Link to="/rewards" className="text-sm text-slate-400 hover:text-white">
        ← Rewards drops
      </Link>
    </div>
  );
}
