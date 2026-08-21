import { Link } from "react-router-dom";
import { PlayerVipPanel } from "../components/loyalty/PlayerVipPanel";
import { formatPercent } from "../lib/format";
import { useLoyaltyStore } from "../store/loyaltyStore";

export function Vip() {
  const mode = useLoyaltyStore((s) => s.config.mode);
  const originalsRate = useLoyaltyStore((s) => s.config.flatRates.originals);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">VIP & XP</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
          Lifetime XP from Shard wagers only — never Fun Coins, never demo (0) stakes, never wins or losses.
          Current mode:{" "}
          <span className="font-semibold text-emerald-200">
            {mode === "flat" ? `flat ${originalsRate} XP / 1 SH on originals` : "house-edge × 100 × category"}
          </span>
          . Instant Drop rakeback can gain a VIP bonus.
        </p>
      </div>
      <PlayerVipPanel />
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
