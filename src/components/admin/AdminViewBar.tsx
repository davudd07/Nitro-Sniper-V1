import { Link } from "react-router-dom";
import { Eye, LogOut, Sparkles } from "lucide-react";
import { useAdminViewStore } from "../../store/adminViewStore";
import { sound } from "../../lib/sound";

export function AdminViewBar() {
  const active = useAdminViewStore((s) => s.active);
  const exit = useAdminViewStore((s) => s.exit);
  if (!active) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-amber-400/40 bg-amber-400/15 px-4 py-2 text-amber-50">
      <p className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Eye className="h-4 w-4 shrink-0" />
        Admin view
        <span className="hidden font-medium normal-case tracking-normal text-amber-100/80 sm:inline">
          Ban, mute, and purge from chat or live bets. Hide official cases and delete community cases from the catalog.
        </span>
        <Sparkles className="hidden h-3.5 w-3.5 text-amber-200 sm:block" />
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/admin"
          className="rounded-md border border-amber-300/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide hover:bg-amber-400/20"
        >
          Warden desk
        </Link>
        <button
          type="button"
          onClick={() => {
            sound.click();
            exit();
          }}
          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide hover:bg-black/20"
        >
          <LogOut className="h-3 w-3" /> Exit view
        </button>
      </div>
    </div>
  );
}
