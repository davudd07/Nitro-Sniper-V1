import { ChevronDown, Coins, Gem } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../../store/economyStore";
import { useSettingsStore, type DisplayCurrency } from "../../store/settingsStore";
import { formatCredits, formatFunCoins } from "../../lib/format";
import { sound } from "../../lib/sound";

export function CurrencySwitcher() {
  const balance = useEconomyStore((s) => s.balance);
  const funCoins = useEconomyStore((s) => s.funCoins);
  const selected = useSettingsStore((s) => s.displayCurrency) === "funcoins" ? "funcoins" : "shards";
  const cycle = useSettingsStore((s) => s.cycleDisplayCurrency);
  const setDisplayCurrency = useSettingsStore((s) => s.setDisplayCurrency);

  const shards = {
    id: "shards" as const,
    icon: Gem,
    value: formatCredits(balance),
    suffix: "SH",
    title: "Shards",
    active: "border-cyan-400/40 bg-cyan-400/15 text-white",
    idle: "text-cyan-100/80",
    iconActive: "text-cyan-300",
    iconIdle: "text-cyan-400/70",
  };
  const fun = {
    id: "funcoins" as const,
    icon: Coins,
    value: formatFunCoins(funCoins ?? 0),
    suffix: "FC",
    title: "Fun Coins",
    active: "border-amber-400/40 bg-amber-400/15 text-amber-50",
    idle: "text-amber-100/80",
    iconActive: "text-amber-300",
    iconIdle: "text-amber-400/70",
  };

  const primary = selected === "funcoins" ? fun : shards;
  const secondary = selected === "funcoins" ? shards : fun;
  const PrimaryIcon = primary.icon;
  const SecondaryIcon = secondary.icon;

  function pick(id: DisplayCurrency) {
    sound.click();
    setDisplayCurrency(id);
  }

  return (
    <div className="flex min-w-[168px] flex-col overflow-hidden rounded-md border-2 border-[#2a3a28] bg-[#0c1410] shadow-[3px_3px_0_#050805]">
      <div className={clsx("flex items-center gap-1.5 px-2 py-1.5", primary.active)}>
        <PrimaryIcon className={clsx("h-3.5 w-3.5", primary.iconActive)} />
        <span className="font-mono text-sm font-semibold tabular-nums">{primary.value}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{primary.suffix}</span>
        <button
          type="button"
          onClick={() => {
            sound.click();
            cycle();
          }}
          className="ml-auto grid h-6 w-6 place-items-center rounded text-current/80 hover:bg-black/20"
          title={`Show ${secondary.title}`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => pick(secondary.id)}
        className={clsx(
          "flex items-center gap-1.5 border-t border-white/10 px-2 py-1 text-left hover:bg-white/[0.04]",
          secondary.idle,
        )}
        title={`Switch to ${secondary.title}`}
      >
        <SecondaryIcon className={clsx("h-3 w-3", secondary.iconIdle)} />
        <span className="font-mono text-[11px] font-semibold tabular-nums">{secondary.value}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{secondary.suffix}</span>
      </button>
    </div>
  );
}
