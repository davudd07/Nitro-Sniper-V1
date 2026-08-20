import { useState, type ReactNode } from "react";
import { Ban, Coins, MoreHorizontal, Volume2, VolumeX, Wallet } from "lucide-react";
import { clsx } from "clsx";
import { LOCAL_PLAYER, useModerationStore } from "../../store/moderationStore";
import { useToastStore } from "../../store/toastStore";
import { sound } from "../../lib/sound";

export function ChatModMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const banned = useModerationStore((s) => s.banned.includes(name));
  const muted = useModerationStore((s) => s.muted.includes(name));
  const ban = useModerationStore((s) => s.ban);
  const unban = useModerationStore((s) => s.unban);
  const mute = useModerationStore((s) => s.mute);
  const unmute = useModerationStore((s) => s.unmute);
  const topUpShards = useModerationStore((s) => s.topUpShards);
  const push = useToastStore((s) => s.push);

  function act(label: string, fn: () => void) {
    fn();
    sound.click();
    push(label, "success");
    setOpen(false);
  }

  const label = name === LOCAL_PLAYER ? "You" : name;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-5 w-5 place-items-center rounded text-amber-200/80 hover:bg-amber-400/15 hover:text-amber-100"
        title="Admin actions"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-[60] w-40 overflow-hidden rounded-md border-2 border-amber-400/30 bg-[#101810] py-1 shadow-[4px_4px_0_#050805]">
          {banned ? (
            <MenuItem onClick={() => act(`Unbanned ${label}`, () => unban(name))}>Unban</MenuItem>
          ) : (
            <MenuItem onClick={() => act(`Banned ${label}`, () => ban(name))} danger>
              <Ban className="h-3 w-3" /> Ban
            </MenuItem>
          )}
          {muted ? (
            <MenuItem onClick={() => act(`Unmuted ${label}`, () => unmute(name))}>
              <Volume2 className="h-3 w-3" /> Unmute
            </MenuItem>
          ) : (
            <MenuItem onClick={() => act(`Muted ${label}`, () => mute(name))}>
              <VolumeX className="h-3 w-3" /> Mute
            </MenuItem>
          )}
          <MenuItem onClick={() => act(`+1,000 SH → ${label}`, () => topUpShards(name, 1000))}>
            <Wallet className="h-3 w-3" /> Top up 1k SH
          </MenuItem>
          <MenuItem onClick={() => act(`+250 SH → ${label}`, () => topUpShards(name, 250))}>
            <Coins className="h-3 w-3" /> Top up 250 SH
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-semibold hover:bg-white/5",
        danger ? "text-rose-200" : "text-slate-200",
      )}
    >
      {children}
    </button>
  );
}
