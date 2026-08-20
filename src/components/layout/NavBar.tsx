import { Link } from "react-router-dom";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../../store/economyStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { CurrencySwitcher } from "./CurrencySwitcher";

export function NavBar({ wide = false }: { wide?: boolean }) {
  const reset = useEconomyStore((s) => s.reset);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const push = useToastStore((s) => s.push);

  return (
    <header className="sticky top-0 z-50 overflow-visible border-b-2 border-[#2a3a28] bg-[#0c1410]/90 backdrop-blur-xl">
      <div className={clsx("grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 pl-12 pr-12", wide ? "max-w-none" : "")}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 pr-1 rounded-md hover:opacity-90">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-2 border-emerald-400/40 bg-gradient-to-br from-lime-400 to-emerald-600 text-sm font-extrabold tracking-wide text-bg-950 shadow-[3px_3px_0_#052e16]">
              PV
            </div>
            <div className="hidden leading-tight lg:block">
              <span className="block text-[15px] font-semibold tracking-tight text-white">Prism Vault</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-500/80">Play-money demo</span>
            </div>
          </Link>
        </div>

        <CurrencySwitcher />

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={toggleSound}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
            title={soundOn ? "Mute sound" : "Unmute sound"}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            onClick={() => {
              reset();
              push("Balances reset. 10,000 demo Shards, Fun Coins cleared.", "success");
            }}
            className="hidden items-center gap-1.5 rounded-md border-2 border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 sm:flex"
            title="Reset demo balances"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}
