import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { X, Plus, Minus } from "lucide-react";
import { CASES, getCase } from "../../data/cases";
import { CaseThumb } from "../cases/CaseThumb";
import { CasePreviewModal } from "../cases/CasePreviewModal";
import { RiskBadge } from "../cases/RiskBadge";
import { CatalogSwitch, type CaseCatalogKind } from "../cases/CatalogSwitch";
import { formatCredits } from "../../lib/format";
import type { BattleCaseEntry } from "../../store/battleStore";
import { listHydratedCommunityCases, useCommunityCaseStore } from "../../store/communityCaseStore";
import { sound } from "../../lib/sound";

export const MAX_CASES_PER_BATTLE = 50;

export function AddCasesModal({
  open,
  onClose,
  entries,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  entries: BattleCaseEntry[];
  onChange: (entries: BattleCaseEntry[]) => void;
}) {
  const [draft, setDraft] = useState<BattleCaseEntry[]>(entries);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CaseCatalogKind>("official");
  const communityRecords = useCommunityCaseStore((s) => s.cases);
  const communityCases = useMemo(() => listHydratedCommunityCases(), [communityRecords]);
  const shown = catalog === "official" ? CASES : communityCases;

  useEffect(() => {
    if (open) setDraft(entries);
  }, [open, entries]);

  if (!open) return null;

  const totalCount = draft.reduce((s, e) => s + e.count, 0);

  function setCount(caseId: string, count: number) {
    const clamped = Math.max(0, Math.min(count, MAX_CASES_PER_BATTLE));
    setDraft((d) => {
      const existing = d.find((e) => e.caseId === caseId);
      const currentTotalOthers = d.filter((e) => e.caseId !== caseId).reduce((s, e) => s + e.count, 0);
      const allowed = Math.max(0, Math.min(clamped, MAX_CASES_PER_BATTLE - currentTotalOthers));
      if (existing) {
        return d.map((e) => (e.caseId === caseId ? { ...e, count: allowed } : e)).filter((e) => e.count > 0);
      }
      return allowed > 0 ? [...d, { caseId, count: allowed }] : d;
    });
  }

  function countFor(caseId: string) {
    return draft.find((e) => e.caseId === caseId)?.count ?? 0;
  }

  const perPlayer = draft.reduce((s, e) => s + e.count * (getCase(e.caseId)?.price ?? 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="surface max-h-[88vh] w-full max-w-3xl overflow-y-auto bg-bg-900 p-5 scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Add Cases</h3>
            <p className="text-xs text-slate-500">
              Up to {MAX_CASES_PER_BATTLE} cases per battle · {totalCount}/{MAX_CASES_PER_BATTLE} selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CatalogSwitch value={catalog} onChange={setCatalog} />
            <button
              onClick={() => {
                sound.click();
                onClose();
              }}
              className="rounded-lg p-1 text-slate-400 transition-all duration-150 hover:bg-white/10 active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No community cases yet. Publish one from the Community tab on Cases.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {shown.map((c) => {
              const count = countFor(c.id);
              return (
                <div
                  key={c.id}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl border p-3 transition-colors duration-150",
                    count > 0 ? "border-fuchsia-400/40 bg-fuchsia-500/5" : "border-white/10 bg-bg-800/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      setPreviewId(c.id);
                    }}
                    className="shrink-0"
                    title="Preview case contents"
                  >
                    <CaseThumb c={c} className="h-16 w-16 rounded-lg" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                    <p className="text-xs text-slate-500">{formatCredits(c.price)} SH each</p>
                    <RiskBadge risk={c.risk} className="mt-1" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        sound.click();
                        setCount(c.id, count - 1);
                      }}
                      className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition-all duration-150 hover:bg-white/5 active:scale-90"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center font-mono text-sm text-white">{count}</span>
                    <button
                      onClick={() => {
                        sound.click();
                        setCount(c.id, count + 1);
                      }}
                      className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition-all duration-150 hover:bg-white/5 active:scale-90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            Total cost per player:{" "}
            <span className="font-semibold text-white">{formatCredits(perPlayer)} SH</span>
          </p>
          <button
            onClick={() => {
              sound.click();
              onChange(draft);
              onClose();
            }}
            className="btn-primary px-6 py-2.5"
          >
            Confirm
          </button>
        </div>
      </div>
      <CasePreviewModal caseId={previewId} onClose={() => setPreviewId(null)} />
    </div>,
    document.body,
  );
}
