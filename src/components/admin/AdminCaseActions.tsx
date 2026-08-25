import { Eye, EyeOff, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useNavigate } from "react-router-dom";
import { useAdminViewStore } from "../../store/adminViewStore";
import { useCatalogModerationStore } from "../../store/catalogModerationStore";
import { useCommunityCaseStore } from "../../store/communityCaseStore";
import { useToastStore } from "../../store/toastStore";
import { sound } from "../../lib/sound";
import type { Case } from "../../data/cases";

export function AdminCaseActions({
  c,
  className,
  afterCommunityDelete,
  force = false,
}: {
  c: Case;
  className?: string;
  afterCommunityDelete?: () => void;
  /** Show on the warden desk even if live Admin view is off. */
  force?: boolean;
}) {
  const adminView = useAdminViewStore((s) => s.active);
  const hidden = useCatalogModerationStore((s) => s.hiddenOfficialIds.includes(c.id));
  const hideOfficial = useCatalogModerationStore((s) => s.hideOfficial);
  const restoreOfficial = useCatalogModerationStore((s) => s.restoreOfficial);
  const deleteCase = useCommunityCaseStore((s) => s.deleteCase);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();

  if (!adminView && !force) return null;

  if (c.community) {
    return (
      <button
        type="button"
        title="Delete community case"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!window.confirm(`Delete community case "${c.name}"? This cannot be undone.`)) return;
          const err = deleteCase(c.id);
          if (err) {
            push(err, "danger");
            return;
          }
          sound.click();
          push(`Deleted ${c.name}.`, "success");
          afterCommunityDelete?.();
          if (!afterCommunityDelete) navigate("/cases?catalog=community");
        }}
        className={clsx(
          "inline-flex items-center gap-1 rounded-md border-2 border-rose-400/40 bg-rose-500/15 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-rose-100 hover:bg-rose-500/25",
          className,
        )}
      >
        <Trash2 className="h-3 w-3" /> Delete
      </button>
    );
  }

  return (
    <button
      type="button"
      title={hidden ? "Restore official case" : "Hide official case from the catalog"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        sound.click();
        if (hidden) {
          restoreOfficial(c.id);
          push(`Restored ${c.name} to the official catalog.`, "success");
        } else {
          if (!window.confirm(`Hide official case "${c.name}" from the catalog?`)) return;
          hideOfficial(c.id);
          push(`Hid ${c.name} from the official catalog.`, "success");
        }
      }}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide",
        hidden
          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
          : "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
        className,
      )}
    >
      {hidden ? (
        <>
          <Eye className="h-3 w-3" /> Restore
        </>
      ) : (
        <>
          <EyeOff className="h-3 w-3" /> Hide
        </>
      )}
    </button>
  );
}
