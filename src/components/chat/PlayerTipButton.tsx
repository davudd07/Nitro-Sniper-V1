import { useState } from "react";
import { HandCoins } from "lucide-react";
import { LOCAL_PLAYER } from "../../store/moderationStore";
import { useChatStore } from "../../store/chatStore";
import { useEconomyStore } from "../../store/economyStore";
import { useToastStore } from "../../store/toastStore";
import { formatCredits } from "../../lib/format";
import { sound } from "../../lib/sound";

const PRESETS = [10, 25, 50, 100];

export function PlayerTipButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("50");
  const spend = useEconomyStore((s) => s.spend);
  const post = useChatStore((s) => s.post);
  const push = useToastStore((s) => s.push);

  if (name === LOCAL_PLAYER || name === "You") return null;

  function send(amount: number) {
    const n = Math.floor(amount);
    if (n <= 0) {
      push("Enter a tip amount.", "warning");
      return;
    }
    if (!spend(n)) {
      push(`You need ${formatCredits(n)} SH to send that tip.`, "danger");
      return;
    }
    sound.click();
    post({
      name: "You",
      you: true,
      tip: true,
      color: "#d946ef",
      text: `Tipped ${name} ${formatCredits(n)} SH — they must wager ${formatCredits(n)} SH to unlock it.`,
    });
    push(`Tipped ${name} ${formatCredits(n)} SH.`, "success");
    setOpen(false);
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
        title={`Tip ${name}`}
      >
        <HandCoins className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-[60] w-44 rounded-md border-2 border-[#3a5c5c] bg-[#101818] p-2 shadow-[4px_4px_0_#050808]">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tip {name}</p>
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
              onClick={() => send(Number(custom) || 0)}
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
    text: `Tipped you ${n} SH. Wager ${n} SH once to unlock it.`,
  });
}
