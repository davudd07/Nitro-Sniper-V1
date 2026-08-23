import { NavLink, useNavigate } from "react-router-dom";
import { Gem, Bomb, Spade, Package, Swords, Coins, Circle, ArrowUpCircle, Hash, ChevronLeft, ChevronRight, PanelLeft, Gift } from "lucide-react";
import { clsx } from "clsx";
import { useSettingsStore } from "../../store/settingsStore";
import { useEconomyStore } from "../../store/economyStore";
import { sound } from "../../lib/sound";

const LINKS = [
  { to: "/", label: "Home", icon: Gem, end: true },
  { to: "/mines", label: "Mines", icon: Bomb, end: false },
  { to: "/blackjack", label: "Blackjack", icon: Spade, end: false },
  { to: "/cases", label: "Cases", icon: Package, end: false },
  { to: "/battles", label: "Battles", icon: Swords, end: false },
  { to: "/jackpot", label: "Jackpot", icon: Coins, end: false },
  { to: "/coinflip", label: "Coin Flip", icon: Circle, end: false },
  { to: "/upgrader", label: "Upgrader", icon: ArrowUpCircle, end: false },
];

// Mirrored chat chevron: full square tab on the outside of the rail (`left-full`).
const TAB_BTN =
  "absolute top-4 left-full z-50 grid h-9 w-9 place-items-center rounded-l-none rounded-md border-2 border-l-0 border-[#3a5c5c] bg-[#152020] text-cyan-200 shadow-[2px_2px_0_#050808]";

export function GameSidebar() {
  const open = useSettingsStore((s) => s.leftNavOpen);
  const toggle = useSettingsStore((s) => s.toggleLeftNav);
  const pendingRakeback = useEconomyStore((s) => s.pendingRakeback);
  const pendingDailyRakeback = useEconomyStore((s) => s.pendingDailyRakeback);
  const hasClaim = (pendingRakeback ?? 0) > 0 || (pendingDailyRakeback ?? 0) > 0;
  const navigate = useNavigate();

  return (
    <div
      className={clsx(
        "relative z-[60] h-full min-h-0 shrink-0 overflow-visible transition-[width] duration-200 ease-out",
        open ? "w-[232px]" : "w-12",
      )}
    >
      <button
        type="button"
        onClick={() => {
          sound.click();
          toggle();
        }}
        className={TAB_BTN}
        title={open ? "Collapse games" : "Open games"}
      >
        {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r-2 border-[#2a4040] bg-[#0c1414]">
        <div className={clsx("flex items-center gap-2 px-3 py-4", !open && "justify-center px-1")}>
          <PanelLeft className="h-4 w-4 shrink-0 text-cyan-300" />
          {open && <p className="pixel-label text-[15px] font-extrabold uppercase text-cyan-200/80">Menu</p>}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-4 scrollbar-thin">
          <NavLink
            to="/rewards"
            title="Rewards"
            onClick={() => sound.click()}
            className={({ isActive }) =>
              clsx(
                "relative flex items-center gap-2.5 rounded-lg border-2 px-2.5 font-extrabold uppercase tracking-wide shadow-[3px_3px_0_#164e4e] transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0",
                open ? "justify-start py-3 text-[13px]" : "justify-center px-0 py-3",
                isActive
                  ? "border-cyan-100 bg-gradient-to-br from-[#58ffff] to-[#1a8a8a] text-[#042020]"
                  : "border-cyan-300/70 bg-gradient-to-br from-[#4af1f1]/90 to-[#0e5a5a] text-[#042020]",
              )
            }
          >
            <Gift className={clsx("shrink-0", open ? "h-6 w-6" : "h-5 w-5")} />
            {open && (
              <span className="pixel-label min-w-0 truncate text-lg leading-none">Rewards</span>
            )}
            {hasClaim && (
              <span
                className={clsx(
                  "absolute rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]",
                  open ? "right-2 top-2 h-2.5 w-2.5" : "right-1 top-1 h-2 w-2",
                )}
              />
            )}
          </NavLink>

          <p className={clsx("px-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600", !open && "sr-only")}>
            Games
          </p>

          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 rounded-md border-2 px-2.5 py-2 text-[13px] font-semibold transition-colors",
                  open ? "justify-start" : "justify-center px-0",
                  isActive
                    ? "border-cyan-400/50 bg-cyan-400/15 text-white"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {open && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
          <button
            type="button"
            title="Keno — coming soon"
            onClick={() => {
              sound.click();
              navigate("/keno");
            }}
            className={clsx(
              "flex items-center gap-2.5 rounded-md border-2 border-transparent px-2.5 py-2 text-[13px] font-semibold text-slate-500 hover:bg-white/[0.03]",
              open ? "justify-start" : "justify-center px-0",
            )}
          >
            <Hash className="h-4 w-4 shrink-0" />
            {open && (
              <span className="flex min-w-0 items-center gap-1 truncate">
                Keno
                <span className="rounded bg-white/10 px-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Soon</span>
              </span>
            )}
          </button>
        </nav>
      </aside>
    </div>
  );
}
