import { useState } from "react";
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

const PRESETS = [10, 25, 50, 100];

function sendPlayerTip(to: string, amount: number): boolean {
  const n = Math.floor(amount);
  if (n <= 0) {
    useToastStore.getState().push("Enter a tip amount.", "warning");
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
    note: `From You · locked until ${to} wagers ${formatCash(n)}`,
  });
  useChatStore.getState().post({
    name: "You",
    you: true,
    tip: true,
    color: "#d946ef",
    text: `Tipped ${to} ${formatCash(n)} — they must wager ${formatCash(n)} to unlock it.`,
  });
  useToastStore.getState().push(`Tipped ${to} ${formatCash(n)}. They must wager that amount to unlock it.`, "success");
  return true;
}

export function PlayerTipButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("50");
  const locked = useModerationStore((s) => s.isLocked(LOCAL_PLAYER));

  if (name === LOCAL_PLAYER || name === "You" || isLocalPlayerName(name)) return null;

  function send(amount: number) {
    if (sendPlayerTip(name, amount)) {
      sound.click();
      setOpen(false);
    }
  }

  return (
    <div className="relative shrink-0">
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
        <div className="absolute right-0 top-6 z-[60] w-48 rounded-md border-2 border-[#3a5c5c] bg-[#101818] p-2 shadow-[4px_4px_0_#050808]">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tip {name}</p>
          <p className="mb-1.5 text-[10px] leading-snug text-slate-500">
            Tips are a World Lock wager. They stay locked for {name} until they wager the same amount.
          </p>
          <div className="mb-1.5 grid grid-cols-4 gap-1">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => send(n)}
                className="rounded bg-[#4af1f1]/25 py-1 text-[10px] font-bold text-cyan-100 hover:bg-[#4af1f1]/40"
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="number"
              min={1}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="min-w-0 flex-1 rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-white outline-none"
            />
            <button
              type="button"
              onClick={() => send(parseLockInput(custom, useSettingsStore.getState().lockUnit))}
              className="rounded bg-emerald-500 px-2 text-[10px] font-extrabold text-bg-950"
            >
              Send
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
    text: `Tipped you ${formatCash(n)}. Wager ${formatCash(n)} once to unlock it.`,
  });
}
