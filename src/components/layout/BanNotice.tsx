import { Ban } from "lucide-react";
import { LOCAL_PLAYER, useModerationStore } from "../../store/moderationStore";

export function BanNotice() {
  const banned = useModerationStore((s) => s.isBanned(LOCAL_PLAYER));
  if (!banned) return null;
  return (
    <div className="border-b-2 border-rose-500/40 bg-rose-500/15 px-4 py-2 text-center text-xs font-semibold text-rose-100">
      <Ban className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px" />
      This demo account is banned. Stakes and chat are locked until a warden unbans You.
    </div>
  );
}
