import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Minus } from "lucide-react";
import { CASES } from "../../data/cases";
import { CaseThumb } from "../cases/CaseThumb";
import { formatCredits } from "../../lib/format";
import type { BattleCaseEntry } from "../../store/battleStore";

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-bg-900 p-5 shadow-2xl scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Add Cases</h3>
            <p className="text-xs text-slate-500">
              Up to {MAX_CASES_PER_BATTLE} cases per battle · {totalCount}/{MAX_CASES_PER_BATTLE} selected
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CASES.map((c) => {
            const count = countFor(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-bg-800/60 p-3">
                <CaseThumb c={c} className="h-16 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-slate-500">{formatCredits(c.price)} SH each</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCount(c.id, count - 1)}
                    className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/5"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center font-mono text-sm text-white">{count}</span>
                  <button
                    onClick={() => setCount(c.id, count + 1)}
                    className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            Total cost per player:{" "}
            <span className="font-semibold text-white">
              {formatCredits(draft.reduce((s, e) => s + e.count * (CASES.find((c) => c.id === e.caseId)?.price ?? 0), 0))} SH
            </span>
          </p>
          <button
            onClick={() => {
              onChange(draft);
              onClose();
            }}
            className="rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 px-6 py-2.5 font-bold text-bg-950"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
