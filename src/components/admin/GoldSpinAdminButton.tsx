import { Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { isFillerLoot } from "../../lib/caseTickets";
import { getRawCase } from "../../data/cases";
import { useGoldSpinStore } from "../../store/goldSpinStore";
import { useToastStore } from "../../store/toastStore";
import { sound } from "../../lib/sound";
import type { CaseItem } from "../../data/items";

export function GoldSpinAdminButton({
  caseId,
  item,
  goldTier,
}: {
  caseId: string;
  item: CaseItem;
  goldTier: boolean;
}) {
  const setGold = useGoldSpinStore((s) => s.setGold);
  const push = useToastStore((s) => s.push);
  const filler = isFillerLoot(item);

  return (
    <button
      type="button"
      disabled={filler}
      title={
        filler
          ? "Junk filler cannot be Gold Spin"
          : goldTier
            ? "Remove from Gold Spin (saved)"
            : "Add to Gold Spin (saved)"
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const raw = getRawCase(caseId);
        const baseGold = raw?.odds.find((o) => o.item.id === item.id)?.goldTier ?? false;
        const result = setGold(caseId, item.id, item, baseGold, !goldTier);
        if (!result.ok) {
          push(result.reason, "warning");
          return;
        }
        sound.click();
        push(
          goldTier ? `Removed ${item.name} from Gold Spin.` : `Added ${item.name} to Gold Spin.`,
          "success",
        );
      }}
      className={clsx(
        "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
        filler
          ? "cursor-not-allowed border-white/10 text-slate-600"
          : goldTier
            ? "border-amber-300/50 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25"
            : "border-white/15 text-slate-300 hover:bg-white/10",
      )}
    >
      <span className="inline-flex items-center gap-0.5">
        <Sparkles className="h-2.5 w-2.5" />
        {filler ? "No gold" : goldTier ? "Remove gold" : "Add gold"}
      </span>
    </button>
  );
}
