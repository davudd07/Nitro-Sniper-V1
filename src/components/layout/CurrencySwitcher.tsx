import { ChevronDown, Coins, Gem } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { useEconomyStore } from "../../store/economyStore";
import { formatCredits, formatFunCoins } from "../../lib/format";
import { sound } from "../../lib/sound";

export function CurrencySwitcher() {
  const balance = useEconomyStore((s) => s.balance);
  const funCoins = useEconomyStore((s) => s.funCoins);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-w-[168px]">
      <div className="flex flex-col overflow-hidden rounded-md border-2 border-[#2a3a28] bg-[#0c1410] shadow-[3px_3px_0_#050805]">
        <div className="flex items-center gap-1.5 bg-cyan-400/15 px-2 py-1.5 text-white">
          <Gem className="h-3.5 w-3.5 text-cyan-300" />
          <span className="font-mono text-sm font-semibold tabular-nums">{formatCredits(balance)}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">SH</span>
          <button
            type="button"
            onClick={() => {
              sound.click();
              setOpen((v) => !v);
            }}
            className="ml-auto grid h-6 w-6 place-items-center rounded text-cyan-100/80 hover:bg-black/20"
            title={open ? "Hide Fun Coins" : "Show Fun Coins"}
            aria-expanded={open}
          >
            <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </div>
        {open && (
          <div className="flex items-center gap-1.5 border-t border-white/10 px-2 py-1 text-amber-100/80">
            <Coins className="h-3 w-3 text-amber-400/70" />
            <span className="font-mono text-[11px] font-semibold tabular-nums">{formatFunCoins(funCoins ?? 0)}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70">FC</span>
          </div>
        )}
      </div>
    </div>
  );
}
