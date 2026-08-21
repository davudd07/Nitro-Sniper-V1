import { Link } from "react-router-dom";
import { Crown, LogIn, LogOut, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../../store/economyStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { useAuthStore } from "../../store/authStore";
import { useLoyaltyStore } from "../../store/loyaltyStore";
import { LOCAL_XP_USER, resolveVip } from "../../lib/loyalty";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { sound } from "../../lib/sound";

export function NavBar({ wide = false }: { wide?: boolean }) {
  const reset = useEconomyStore((s) => s.reset);
  const soundOn = useSettingsStore((s) => s.soundOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const push = useToastStore((s) => s.push);
  const session = useAuthStore((s) => s.session);
  const openGate = useAuthStore((s) => s.openGate);
  const logout = useAuthStore((s) => s.logout);
  const lifetimeXp = useLoyaltyStore((s) => s.xpByUser[LOCAL_XP_USER] ?? 0);
  const tiers = useLoyaltyStore((s) => s.config.tiers);
  const vip = resolveVip(lifetimeXp, tiers);

  return (
    <header className="sticky top-0 z-50 overflow-visible border-b-2 border-[#2a3a28] bg-[#0c1410]/90 backdrop-blur-xl">
      <div className={clsx("grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 pl-12 pr-12", wide ? "max-w-none" : "")}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to="/" className="flex min-w-0 items-center gap-2 rounded-md hover:opacity-90" title="GrowBET home">
            <img
              src="/brand/growbet-logo.png"
              alt="GrowBET"
              width={36}
              height={36}
              className="pixelated h-9 w-9 shrink-0"
            />
            <span className="brand-wordmark truncate">GrowBET</span>
          </Link>
        </div>

        <CurrencySwitcher />

        <div className="flex items-center justify-end gap-2">
          <Link
            to="/vip"
            onClick={() => sound.click()}
            className="hidden max-w-[8rem] items-center gap-1 truncate rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-100 hover:bg-white/5 sm:inline-flex"
            title="VIP & XP"
            style={{ color: vip.current.color }}
          >
            <Crown className="h-3.5 w-3.5" />
            {vip.current.name}
          </Link>
          {session ? (
            <span className="hidden max-w-[9rem] truncate font-mono text-xs font-semibold text-emerald-200 sm:inline">
              {session}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              sound.click();
              if (session) {
                logout();
                push("Signed out. Sign in again before betting.", "info");
              } else {
                openGate();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5"
            title={session ? "Sign out" : "Sign in"}
          >
            {session ? <LogOut className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
            {session ? "Sign out" : "Sign in"}
          </button>
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
