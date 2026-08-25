import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CASES } from "../../data/cases";
import { CashAmount } from "../ui/CurrencyIcon";
import { AdminCaseActions } from "./AdminCaseActions";
import { listHydratedCommunityCases, useCommunityCaseStore } from "../../store/communityCaseStore";
import { useCatalogModerationStore } from "../../store/catalogModerationStore";
import { CaseCreatorLine } from "../cases/CaseCreatorLine";

export function CasesDesk() {
  const records = useCommunityCaseStore((s) => s.cases);
  const hidden = useCatalogModerationStore((s) => s.hiddenOfficialIds);
  const community = useMemo(() => listHydratedCommunityCases(), [records]);
  const hiddenSet = new Set(hidden);

  return (
    <div className="space-y-5">
      <section className="surface p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-white">Official cases</h2>
        <p className="mt-1 text-xs text-slate-400">Hide a case from the public catalog. Restore it later. In-flight battles still resolve.</p>
        <ul className="mt-3 space-y-2">
          {CASES.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2">
              <div className="min-w-0">
                <Link to={`/cases/${c.id}`} className="truncate font-semibold text-white hover:underline">
                  {c.name}
                </Link>
                <p className="flex items-center gap-2 text-[11px] text-slate-500">
                  <CashAmount wl={c.price} iconClassName="h-3 w-3" />
                  {hiddenSet.has(c.id) && <span className="font-bold uppercase text-amber-300">Hidden</span>}
                </p>
              </div>
              <AdminCaseActions c={c} force />
            </li>
          ))}
        </ul>
      </section>
      <section className="surface p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-white">Community cases</h2>
        <p className="mt-1 text-xs text-slate-400">Delete any published community case. This cannot be undone.</p>
        {community.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">None published.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {community.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2">
                <div className="min-w-0">
                  <Link to={`/cases/${c.id}`} className="truncate font-semibold text-white hover:underline">
                    {c.name}
                  </Link>
                  <CaseCreatorLine c={c} className="truncate text-[11px] text-slate-500" />
                </div>
                <AdminCaseActions c={c} force afterCommunityDelete={() => undefined} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
