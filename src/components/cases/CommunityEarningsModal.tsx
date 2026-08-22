import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { formatCredits, formatPercent, formatRakeback } from "../../lib/format";
import { COMMUNITY_COMMISSION_OF_EDGE } from "../../lib/communityCases";
import { requireAccount } from "../../lib/stake";
import { sound } from "../../lib/sound";
import { useAuthStore } from "../../store/authStore";
import { useCommunityCaseStore } from "../../store/communityCaseStore";
import { useToastStore } from "../../store/toastStore";

export function CommunityEarningsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useAuthStore((s) => s.session);
  const claimableByCreator = useCommunityCaseStore((s) => s.claimableByCreator);
  const totalEarnedByCreator = useCommunityCaseStore((s) => s.totalEarnedByCreator);
  const opensByCreator = useCommunityCaseStore((s) => s.opensByCreator);
  const claimEarnings = useCommunityCaseStore((s) => s.claimEarnings);
  const push = useToastStore((s) => s.push);

  if (!open) return null;

  const total = session ? (totalEarnedByCreator[session] ?? 0) : 0;
  const claimable = session ? (claimableByCreator[session] ?? 0) : 0;
  const opens = session ? (opensByCreator[session] ?? 0) : 0;

  function handleClaim() {
    if (!requireAccount()) return;
    if (!session) return;
    const amt = claimEarnings(session);
    if (amt <= 0) {
      push("Nothing to claim yet — paid opens of your cases accrue 5% of the house edge.", "info");
      return;
    }
    sound.win("small");
    push(`Claimed ${formatRakeback(amt)} SH community case earnings.`, "success");
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="surface w-full max-w-md overflow-hidden bg-[#101810] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Community Case Earnings</h3>
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
        <p className="text-sm leading-relaxed text-slate-400">
          Every time a person opens your community case you get{" "}
          <span className="font-semibold text-emerald-200">
            {formatPercent(COMMUNITY_COMMISSION_OF_EDGE)} of the house edge
          </span>{" "}
          as commission — not {formatPercent(COMMUNITY_COMMISSION_OF_EDGE)} of the whole pot, and not a cut of the case
          price. Demo 0-stakes, battle replays, and bot seats do not pay.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[#3d5a3a]/60 bg-black/30 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Earned</p>
            <p className="mt-1 font-mono text-lg font-bold text-white">{formatRakeback(total)} SH</p>
          </div>
          <div className="rounded-xl border border-[#3d5a3a]/60 bg-black/30 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Your Cases Opened</p>
            <p className="mt-1 font-mono text-lg font-bold text-white">{formatCredits(opens)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300/80">Claimable Earnings</p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-100">{formatRakeback(claimable)} SH</p>
          </div>
          <button
            type="button"
            disabled={!(claimable > 0)}
            onClick={handleClaim}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-40"
          >
            Claim
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Claim credits Shards to your play-money wallet.</p>
      </div>
    </div>,
    document.body,
  );
}
