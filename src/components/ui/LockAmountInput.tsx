import { clsx } from "clsx";
import { displayToWorldLocks, inputStepFor, worldLocksToDisplay } from "../../lib/money";
import { useSettingsStore } from "../../store/settingsStore";
import { CurrencyIcon } from "./CurrencyIcon";

/** Number field that shows the active lock unit but always reports World Locks. */
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
  const display = worldLocksToDisplay(valueWl, unit);
  const minDisplay = worldLocksToDisplay(minWl, unit);

  return (
    <div className={clsx("flex min-w-0 items-center gap-1.5", className)}>
      <input
        type="number"
        min={minDisplay}
        step={inputStepFor(unit)}
        disabled={disabled}
        value={Number.isFinite(display) ? display : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n) || n < 0) {
            onChangeWl(0);
            return;
          }
          onChangeWl(displayToWorldLocks(n, unit));
        }}
        className={inputClassName}
      />
      {showIcon && <CurrencyIcon kind={unit} className="h-5 w-5" />}
    </div>
  );
}
