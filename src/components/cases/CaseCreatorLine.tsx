import { caseCreatorLabel, caseOpenCount, formatOpenCount } from "../../lib/caseMeta";
import { useCaseStatsStore } from "../../store/caseStatsStore";
import { useCommunityCaseStore } from "../../store/communityCaseStore";
import { useDemoProfileStore } from "../../store/demoProfileStore";
import type { Case } from "../../data/cases";

export function CaseCreatorLine({ c, className = "text-[11px] text-slate-500" }: { c: Case; className?: string }) {
  useCaseStatsStore((s) => s.opensByCase[c.id]);
  useCommunityCaseStore((s) => s.cases);
  useDemoProfileStore((s) => s.anonymous);
  const creator = caseCreatorLabel(c);
  const opens = caseOpenCount(c);
  const kind = c.community ? "Community" : "Official";
  return (
    <p className={className}>
      {kind} · made by {creator} · {formatOpenCount(opens)}
    </p>
  );
}
