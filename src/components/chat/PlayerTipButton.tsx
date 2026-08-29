import { useEffect, useRef, useState } from "react";
import { HandCoins } from "lucide-react";
import { LOCAL_PLAYER, useModerationStore } from "../../store/moderationStore";
import { useChatStore } from "../../store/chatStore";
import { useEconomyStore } from "../../store/economyStore";
import { useToastStore } from "../../store/toastStore";
import { formatCash } from "../../lib/format";
import { parseLockInput } from "../../lib/money";
import { useSettingsStore } from "../../store/settingsStore";
import { sound } from "../../lib/sound";
import { requireAccount, takeStakeFor, stakeNeedMessage } from "../../lib/stake";
import { HOUSE_EDGE } from "../../lib/rakeback";
import { trackSettledWlWager } from "../../lib/wagerTrack";
import { appendBalanceLedger } from "../../store/balanceLedgerStore";
import { isLocalPlayerName } from "../../lib/publicName";

export const MIN_TIP_WL = 50;
const PRESETS = [50, 100, 250, 500];

function sendPlayerTip(to: string, amount: number): boolean {
  const n = Math.floor(amount);
  if (n < MIN_TIP_WL) {
    useToastStore.getState().push(`Minimum tip is ${formatCash(MIN_TIP_WL)}.`, "warning");
    return false;
  }
  if (isLocalPlayerName(to) || to === LOCAL_PLAYER) {
    useToastStore.getState().push("You can't tip yourself.", "warning");
    return false;
  }
  if (!requireAccount()) return false;
  if (useModerationStore.getState().isLocked(LOCAL_PLAYER)) {
    useToastStore.getState().push("This account is locked. You can't tip.", "danger");
    return false;
  }
  if (useModerationStore.getState().isLocked(to)) {
    useToastStore.getState().push(`${to}'s account is locked and can't receive tips.`, "warning");
    return false;
  }
  if (!takeStakeFor(n, HOUSE_EDGE.tips, "wl")) {
    const mod = useModerationStore.getState();
    if (!mod.isBanned(LOCAL_PLAYER) && !mod.isLocked(LOCAL_PLAYER)) {
      useToastStore.getState().push(stakeNeedMessage(n, "wl"), "danger");
    }
    return false;
  }
  trackSettledWlWager(n);
  appendBalanceLedger({
    name: to,
    kind: "tip_received",
    amount: n,
    currency: "wl",
    note: `From You`,
  });
  useChatStore.getState().post({
    name: "You",
    you: true,
    tip: true,
    color: "#d946ef",
    text: `Tipped ${to} ${formatCash(n)}.`,
  });
  useToastStore.getState().push(`Tipped ${to} ${formatCash(n)}.`, "success");
  return true;
}

export function PlayerTipButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(String(MIN_TIP_WL));
  const menuRef = useRef<HTMLDivElement>(null);
  const locked = useModerationStore((s) => s.isLocked(LOCAL_PLAYER));

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (name === LOCAL_PLAYER || name === "You" || isLocalPlayerName(name)) return null;

  function send(amount: number) {
    if (sendPlayerTip(name, amount)) {
      sound.click();
      setOpen(false);
    }
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          sound.click();
          setOpen((v) => !v);
        }}
        className="grid h-5 w-5 place-items-center rounded text-emerald-300/80 hover:bg-emerald-400/15 hover:text-emerald-100"
        title={locked ? "Account locked" : `Tip ${name}`}
        disabled={locked}
      >
        <HandCoins className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-[60] w-56 rounded-lg border-2 border-[#3a5c5c] bg-[#101818] p-3 shadow-[4px_4px_0_#050808]">
          <p className="mb-0.5 text-[11px] font-bold text-white">How much do you want to tip?</p>
          <p className="mb-2 text-[10px] text-slate-500">Min {formatCash(MIN_TIP_WL)}</p>
          <div className="mb-2 grid grid-cols-4 gap-1">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => send(n)}
                className="rounded-md bg-[#4af1f1]/25 py-1.5 text-[10px] font-bold text-cyan-100 hover:bg-[#4af1f1]/40"
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="number"
              min={MIN_TIP_WL}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send(parseLockInput(custom, useSettingsStore.getState().lockUnit));
              }}
              placeholder="Amount"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-white outline-none"
            />
            <button
              type="button"
              onClick={() => send(parseLockInput(custom, useSettingsStore.getState().lockUnit))}
              className="rounded-md bg-emerald-500 px-2.5 text-[10px] font-extrabold text-bg-950"
            >
              Tip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A named player tipping You — amount stays locked until you wager it once. */
export function receiveIncomingTip(from: string, amount: number) {
  const n = Math.floor(amount);
  if (n <= 0) return;
  useEconomyStore.getState().receiveTip(n);
  useChatStore.getState().post({
    name: from,
    tip: true,
    color: "#34d399",
    text: `Tipped you ${formatCash(n)}.`,
  });
}
