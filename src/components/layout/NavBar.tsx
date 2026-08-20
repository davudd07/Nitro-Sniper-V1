import { PanelLeft, MessageSquare, Gem, Coins, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../../store/economyStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { formatCredits, formatFunCoins } from "../../lib/format";
import { sound } from "../../lib/sound";

export function NavBar({ wide = false }: { wide?: boolean }) {
  const balance = useEconomyStore((s) => s.balance);
  const funCoins = useEconomyStore((s) => s.funCoins);
  const reset = useEconomyStore((s) => s.reset);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const leftNavOpen = useSettingsStore((s) => s.leftNavOpen);
  const chatOpen = useSettingsStore((s) => s.chatOpen);
  const toggleLeftNav = useSettingsStore((s) => s.toggleLeftNav);
  const toggleChat = useSettingsStore((s) => s.toggleChat);
  const push = useToastStore((s) => s.push);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#2a3a28] bg-[#0c1410]/90 backdrop-blur-xl">
      <div className={clsx("flex w-full items-center gap-3 px-3 py-2.5", wide ? "max-w-none" : "")}>
        <button
          type="button"
          onClick={() => {
            sound.click();
            toggleLeftNav();
          }}
          className={clsx(
            "grid h-9 w-9 place-items-center rounded-md border-2 text-emerald-200",
            leftNavOpen ? "border-emerald-400/50 bg-emerald-400/15" : "border-white/10 bg-white/[0.04]",
          )}
          title={leftNavOpen ? "Hide games" : "Show games"}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 pr-1">
          <div className="grid h-9 w-9 place-items-center rounded-md border-2 border-emerald-400/40 bg-gradient-to-br from-lime-400 to-emerald-600 text-sm font-extrabold tracking-tight text-bg-950 shadow-[3px_3px_0_#052e16]">
            PV
          </div>
          <div className="hidden leading-tight sm:block">
            <span className="block text-[15px] font-semibold tracking-tight text-white">Prism Vault</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-500/80">Play-money demo</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
            title={soundOn ? "Mute sound" : "Unmute sound"}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-1.5 rounded-md border-2 border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5" title="Fun Coins — a second play-money balance">
            <Coins className="h-3.5 w-3.5 text-amber-300" />
            <span className="font-mono text-sm font-semibold tabular-nums text-amber-100">{formatFunCoins(funCoins ?? 0)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">FC</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border-2 border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1.5">
            <Gem className="h-3.5 w-3.5 text-cyan-300" />
            <span className="font-mono text-sm font-semibold tabular-nums text-white">{formatCredits(balance)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">SH</span>
          </div>

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

          <button
            type="button"
            onClick={() => {
              sound.click();
              toggleChat();
            }}
            className={clsx(
              "grid h-9 w-9 place-items-center rounded-md border-2 text-emerald-200",
              chatOpen ? "border-emerald-400/50 bg-emerald-400/15" : "border-white/10 bg-white/[0.04]",
            )}
            title={chatOpen ? "Hide chat" : "Show chat"}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
