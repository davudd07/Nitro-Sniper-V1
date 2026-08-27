import { clsx } from "clsx";
import type { CaseOddsEntry } from "../../data/cases";
import { RARITIES } from "../../data/rarities";
import { isMissingCatalogItem } from "../../lib/communityCaseAudit";
import { CashAmount } from "../ui/CurrencyIcon";
import { ItemIcon } from "../ui/ItemIcon";
import { GoldSpinAdminButton } from "../admin/GoldSpinAdminButton";

function chanceLabel(probability: number): string {
  return `${(probability * 100).toFixed(probability < 0.001 ? 4 : 2)}%`;
}

export function CaseContentsGrid({
  caseId,
  odds,
  adminView,
}: {
  caseId: string;
  odds: CaseOddsEntry[];
  adminView: boolean;
}) {
  const rows = [...odds].sort((a, b) => b.item.value - a.item.value || b.probability - a.probability);

  return (
    <div className="surface p-3 sm:p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">What’s inside</p>
      {adminView && (
        <p className="mb-3 text-[10px] font-medium text-amber-200/80">
          Admin view: click Add gold / Remove gold on a tile. That Gold Spin pool is saved in this browser forever.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {rows.map((o, i) => {
          const r = RARITIES[o.item.rarity];
          const missing = isMissingCatalogItem(o.item);
          return (
            <div
              key={`${o.item.id}-${i}`}
              className={clsx(
                "flex flex-col items-center rounded-xl border-2 bg-black/30 px-2 py-3 text-center",
                missing && "opacity-50",
              )}
              style={{
                borderColor: r.ring,
                background: `linear-gradient(180deg, ${r.from}28, rgba(0,0,0,0.35))`,
                boxShadow: `0 0 18px ${r.ring}2e, inset 0 0 14px ${r.ring}14`,
              }}
            >
              <ItemIcon icon={o.item.icon} rarity={o.item.rarity} size="lg" glow />
              <p className="mt-2 w-full truncate text-xs font-semibold text-white" title={o.item.name}>
                {o.item.name}
                {missing ? " · catalog removed" : ""}
              </p>
              <p className="mt-0.5 text-sm font-bold" style={{ color: r.text }}>
                <CashAmount wl={o.item.value} className="justify-center" iconClassName="h-3.5 w-3.5" />
              </p>
              <p className="mt-0.5 text-[12px] font-extrabold tabular-nums" style={{ color: r.text }}>
                {chanceLabel(o.probability)}
              </p>
              {adminView ? (
                <div className="mt-2">
                  <GoldSpinAdminButton caseId={caseId} item={o.item} goldTier={o.goldTier} />
                </div>
              ) : o.goldTier ? (
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-amber-200">Gold spin</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
