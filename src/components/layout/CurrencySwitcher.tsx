import { ChevronDown, Coins, Gem } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { useEconomyStore } from "../../store/economyStore";
import { useSettingsStore, type DisplayCurrency } from "../../store/settingsStore";
import { formatCredits, formatFunCoins } from "../../lib/format";
import { sound } from "../../lib/sound";

export function CurrencySwitcher() {
  const balance = useEconomyStore((s) => s.balance);
  const funCoins = useEconomyStore((s) => s.funCoins);
  const selected = useSettingsStore((s) => s.displayCurrency) === "funcoins" ? "funcoins" : "shards";
  const setDisplayCurrency = useSettingsStore((s) => s.setDisplayCurrency);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const shards = {
    id: "shards" as const,
    icon: Gem,
    value: formatCredits(balance),
    suffix: "SH",
    bar: "bg-cyan-400/15 text-white",
    iconClass: "text-cyan-300",
    suffixClass: "text-cyan-200/70",
  };
  const fun = {
    id: "funcoins" as const,
    icon: Coins,
    value: formatFunCoins(funCoins ?? 0),
    suffix: "FC",
    bar: "bg-amber-400/15 text-amber-50",
    iconClass: "text-amber-300",
    suffixClass: "text-amber-400/70",
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
    <div ref={rootRef} className="relative z-[60] min-w-[168px]">
      <button
        type="button"
        onClick={() => {
          sound.click();
          setOpen((v) => !v);
        }}
        className={clsx(
          "flex w-full items-center gap-1.5 rounded-md border-2 border-[#2a3a28] px-2 py-1.5 shadow-[3px_3px_0_#050805]",
          primary.bar,
        )}
        title={open ? "Hide other currency" : "Show other currency"}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <PrimaryIcon className={clsx("h-3.5 w-3.5", primary.iconClass)} />
        <span className="font-mono text-sm font-semibold tabular-nums">{primary.value}</span>
        <span className={clsx("text-[10px] font-bold uppercase tracking-wider", primary.suffixClass)}>{primary.suffix}</span>
        <span className="ml-auto grid h-6 w-6 place-items-center rounded opacity-80">
          <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <button
          type="button"
          onClick={() => pick(secondary.id)}
          className="absolute left-0 right-0 top-full z-[70] mt-1 flex w-full items-center gap-1.5 rounded-md border-2 border-[#2a3a28] bg-[#0c1410] px-2 py-1.5 text-left shadow-[3px_3px_0_#050805] hover:bg-[#173028]"
          title={`Switch to ${secondary.suffix}`}
        >
          <SecondaryIcon className={clsx("h-3.5 w-3.5", secondary.iconClass)} />
          <span className="font-mono text-sm font-semibold tabular-nums text-white">{secondary.value}</span>
          <span className={clsx("text-[10px] font-bold uppercase tracking-wider", secondary.suffixClass)}>{secondary.suffix}</span>
        </button>
      )}
    </div>
  );
}
