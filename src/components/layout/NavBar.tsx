import { NavLink } from "react-router-dom";
import { Gem, Bomb, Spade, Package, Swords, Coins, Volume2, VolumeX, RotateCcw } from "lucide-react";
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
  { to: "/battles", label: "Battles", icon: Swords, end: false },
  { to: "/jackpot", label: "Jackpot", icon: Coins, end: false },
];

export function NavBar({ wide = false }: { wide?: boolean }) {
  const balance = useEconomyStore((s) => s.balance);
  const reset = useEconomyStore((s) => s.reset);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const push = useToastStore((s) => s.push);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg-950/75 backdrop-blur-xl">
      <div className={clsx("mx-auto flex w-full items-center gap-4 px-4 py-3", wide ? "max-w-none" : "max-w-7xl")}>
        <div className="flex items-center gap-2.5 pr-1">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-400 to-cyan-300 text-sm font-extrabold tracking-tight text-bg-950 shadow-[0_0_24px_rgba(34,211,238,0.25)]">
            PV
          </div>
          <div className="hidden leading-tight sm:block">
            <span className="block text-[15px] font-semibold tracking-tight text-white">Prism Vault</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Play-money demo</span>
          </div>
        </div>

        <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto rounded-full bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  isActive ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={toggleSound}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          title={soundOn ? "Mute sound" : "Unmute sound"}
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 shadow-inner">
          <Gem className="h-4 w-4 text-cyan-300" />
          <span className="font-mono text-sm font-semibold tabular-nums text-white">{formatCredits(balance)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">SH</span>
        </div>

        <button
          onClick={() => {
            reset();
            push("Balance reset to 10,000 demo Shards.", "success");
          }}
          className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 sm:flex"
          title="Reset demo balance"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </header>
  );
}
