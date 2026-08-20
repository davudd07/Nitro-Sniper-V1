import { Link } from "react-router-dom";
import { CASES } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { RiskBadge } from "../components/cases/RiskBadge";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { formatCredits, formatPercent } from "../lib/format";
import { RARITIES } from "../data/rarities";

const SORTED_CASES = [...CASES].sort((a, b) => a.price - b.price);

export function Cases() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Cases</h1>
        <p className="mt-1 text-sm text-slate-400">
          Nine original cases spanning low, medium, and high risk — all with fully transparent, price-derived odds.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SORTED_CASES.map((c) => (
          <div key={c.id} className="surface group overflow-hidden">
            <Link to={`/cases/${c.id}`}>
              <CaseThumb c={c} className="h-36" />
            </Link>
            <div className="p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-semibold text-white">{c.name}</p>
                <InfoButton title={`${c.name} — Odds & House Edge`}>
                  <StatRow label="Price" value={`${formatCredits(c.price)} SH`} />
                  <StatRow label="Return to player (RTP)" value={formatPercent(c.rtp)} />
                  <StatRow label="House edge" value={formatPercent(c.houseEdge)} />
                  <p className="pt-1">{c.blurb}</p>
                  <div className="pt-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Full odds table</p>
                    <div className="max-h-56 space-y-1 overflow-y-auto scrollbar-thin pr-1">
                      {[...c.odds]
                        .sort((a, b) => b.probability - a.probability)
                        .map((o) => (
                          <div key={o.item.id} className="flex items-center justify-between rounded bg-black/20 px-2 py-1 text-xs">
                            <span style={{ color: RARITIES[o.item.rarity].text }}>{o.item.name}</span>
                            <span className="text-slate-400">
                              {formatCredits(o.item.value)} SH · {(o.probability * 100).toFixed(o.probability < 0.001 ? 4 : 2)}%
                              {o.goldTier && " · ✨ gold"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </InfoButton>
              </div>
              <RiskBadge risk={c.risk} className="mb-2" />
              <p className="mb-3 text-xs text-slate-500">{c.blurb}</p>
              <Link
                to={`/cases/${c.id}`}
                className="btn-primary block w-full py-2 text-center text-sm"
              >
                Open · {formatCredits(c.price)} SH
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
