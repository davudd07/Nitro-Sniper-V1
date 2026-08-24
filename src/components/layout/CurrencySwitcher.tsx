import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { useEconomyStore } from "../../store/economyStore";
import { useSettingsStore } from "../../store/settingsStore";
import { formatCredits, formatFunCoins, formatShards } from "../../lib/format";
import { LOCK_META, LOCK_UNITS, SHARD_META, type LockUnit } from "../../lib/money";
import { sound } from "../../lib/sound";
import { CashAmount, CurrencyIcon } from "../ui/CurrencyIcon";

export function CurrencySwitcher() {
  const balance = useEconomyStore((s) => s.balance);
  const funCoins = useEconomyStore((s) => s.funCoins);
  const lockedTips = useEconomyStore((s) => s.lockedTips);
  const tipWagerLeft = useEconomyStore((s) => s.tipWagerLeft);
  const lockUnit = useSettingsStore((s) => s.lockUnit);
  const headerWallet = useSettingsStore((s) => s.headerWallet);
  const setLockUnit = useSettingsStore((s) => s.setLockUnit);
  const setHeaderWallet = useSettingsStore((s) => s.setHeaderWallet);
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

  const showingShards = headerWallet === "shards";
  const primaryBar = showingShards ? "bg-cyan-400/15 text-white" : "bg-amber-400/12 text-white";

  function pickLock(unit: LockUnit) {
    sound.click();
    setLockUnit(unit);
    setOpen(false);
  }

  function pickShards() {
    sound.click();
    setHeaderWallet("shards");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative z-[60] min-w-[196px]">
      <button
        type="button"
        onClick={() => {
          sound.click();
          setOpen((v) => !v);
        }}
        className={clsx(
          "flex w-full items-center gap-1.5 rounded-md border-2 border-[#2a4040] px-2 py-1.5 shadow-[3px_3px_0_#050808]",
          primaryBar,
        )}
        title="Switch currency display"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <CurrencyIcon kind={showingShards ? "shards" : lockUnit} className="h-5 w-5" />
        <span className="min-w-0 flex-1 truncate text-left font-mono text-sm font-semibold tabular-nums">
          {showingShards ? formatFunCoins(funCoins ?? 0) : formatCredits(balance)}
        </span>
        <span className="grid h-6 w-6 place-items-center rounded opacity-80">
          <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[70] mt-1 overflow-hidden rounded-md border-2 border-[#2a4040] bg-[#0c1414] shadow-[3px_3px_0_#050808]"
        >
          {LOCK_UNITS.map((unit) => {
            const meta = LOCK_META[unit];
            const active = !showingShards && lockUnit === unit;
            return (
              <button
                key={unit}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pickLock(unit)}
                className={clsx(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-[#173030]",
                  active && "bg-amber-400/10",
                )}
              >
                <CurrencyIcon kind={unit} className="h-5 w-5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{meta.name}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-white">{formatCredits(balance, unit)}</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            role="option"
            aria-selected={showingShards}
            onClick={pickShards}
            className={clsx(
              "flex w-full items-center gap-2 border-t border-[#2a4040] px-2 py-1.5 text-left hover:bg-[#173030]",
              showingShards && "bg-cyan-400/10",
            )}
          >
            <CurrencyIcon kind="shards" className="h-5 w-5" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{SHARD_META.name}</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-white">{formatShards(funCoins ?? 0)}</span>
            </span>
          </button>
        </div>
      )}
      {(lockedTips ?? 0) > 0 && (
        <p className="mt-1 flex flex-wrap items-center justify-center gap-1 text-center text-[9px] font-semibold uppercase tracking-wide text-amber-300/90">
          <CashAmount wl={lockedTips} iconClassName="h-3 w-3" /> locked · wager{" "}
          <CashAmount wl={tipWagerLeft ?? 0} iconClassName="h-3 w-3" /> to unlock
        </p>
      )}
    </div>
  );
}
