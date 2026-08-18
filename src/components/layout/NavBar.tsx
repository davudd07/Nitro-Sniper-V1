import { NavLink } from "react-router-dom";
import { Gem, Bomb, Spade, Package, Swords, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../../store/economyStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { formatCredits } from "../../lib/format";

const LINKS = [
  { to: "/", label: "Home", icon: Gem, end: true },
  { to: "/mines", label: "Mines", icon: Bomb, end: false },
  { to: "/blackjack", label: "Blackjack", icon: Spade, end: false },
  { to: "/cases", label: "Cases", icon: Package, end: false },
  { to: "/battles", label: "Case Battles", icon: Swords, end: false },
];

export function NavBar() {
  const balance = useEconomyStore((s) => s.balance);
  const reset = useEconomyStore((s) => s.reset);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const push = useToastStore((s) => s.push);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-2 pr-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 font-bold text-bg-950">
            PV
          </div>
          <span className="hidden text-lg font-bold tracking-tight sm:block">Prism Vault</span>
        </div>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={toggleSound}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          title={soundOn ? "Mute sound" : "Unmute sound"}
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-bg-800 px-3 py-1.5">
          <Gem className="h-4 w-4 text-cyan-300" />
          <span className="font-mono text-sm font-semibold text-white">{formatCredits(balance)}</span>
          <span className="text-[11px] text-slate-500">SH</span>
        </div>

        <button
          onClick={() => {
            reset();
            push("Balance reset to 10,000 demo Shards.", "success");
          }}
          className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 sm:flex"
          title="Reset demo balance"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </header>
  );
}
