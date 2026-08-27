import { clsx } from "clsx";
import { displayToWorldLocks, inputStepFor, worldLocksToDisplay } from "../../lib/money";
import { useSettingsStore } from "../../store/settingsStore";
import { CurrencyIcon } from "./CurrencyIcon";
import { usePlayCurrency } from "../../lib/playWallet";

/** Number field for the active play wallet. Lock units convert; Shards are 1:1. */
export function LockAmountInput({
  valueWl,
  onChangeWl,
  disabled,
  minWl = 0,
  className,
  inputClassName,
  showIcon = true,
}: {
  valueWl: number;
  onChangeWl: (wl: number) => void;
  disabled?: boolean;
  minWl?: number;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
}) {
  const unit = useSettingsStore((s) => s.lockUnit);
  const play = usePlayCurrency();
  const shards = play === "shards";
  const display = shards ? valueWl : worldLocksToDisplay(valueWl, unit);
  const minDisplay = shards ? minWl : worldLocksToDisplay(minWl, unit);

  return (
    <div className={clsx("flex min-w-0 items-center gap-1.5", className)}>
      <input
        type="number"
        min={minDisplay}
        step={shards ? "1" : inputStepFor(unit)}
        disabled={disabled}
        value={Number.isFinite(display) ? display : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n) || n < 0) {
            onChangeWl(0);
            return;
          }
          const next = shards ? Math.round(n) : displayToWorldLocks(n, unit);
          onChangeWl(Number.isFinite(next) && next >= 0 ? Math.min(next, 1_000_000_000) : 0);
        }}
        className={inputClassName}
      />
      {showIcon && <CurrencyIcon kind={shards ? "shards" : unit} className="h-5 w-5" />}
    </div>
  );
}
