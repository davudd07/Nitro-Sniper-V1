import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getCase } from "../../data/cases";
import { CaseThumb } from "./CaseThumb";
import { RiskBadge } from "./RiskBadge";
import { ItemCard } from "../ui/ItemCard";
import { formatCredits, formatPercent } from "../../lib/format";
import { sound } from "../../lib/sound";

export function CasePreviewModal({
  caseId,
  onClose,
}: {
  caseId: string | null;
  onClose: () => void;
}) {
  if (!caseId) return null;
  const c = getCase(caseId);
  if (!c) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="surface max-h-[88vh] w-full max-w-lg overflow-y-auto bg-bg-900 p-5 scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CaseThumb c={c} className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-white">{c.name}</h3>
                <RiskBadge risk={c.risk} />
              </div>
              <p className="text-sm text-slate-400">
                {formatCredits(c.price)} SH · {formatPercent(c.rtp, 0)} RTP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-400">{c.blurb}</p>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">What’s inside</p>
        <p className="mb-2 text-[10px] font-medium text-amber-200/80">
          Gold-spin pool highlighted — same items that can trigger a gold reel on solo opens
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[...c.odds]
            .sort((a, b) => b.item.value - a.item.value)
            .map((o) => (
              <ItemCard
                key={o.item.id}
                item={o.item}
                probability={o.probability}
                size="sm"
                highlightGold={o.goldTier}
                className={!o.goldTier ? "opacity-55" : undefined}
              />
            ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}