import { clsx } from "clsx";
import { sound } from "../../lib/sound";

/**
 * A small, deliberately bulletproof toggle switch. The track is the
 * <button> itself (so there's no ambiguous nested inline-element sizing),
 * and the knob is an explicit inline-block with a fixed translate distance
 * computed from the track/knob sizes below — no reliance on browser-specific
 * "auto" static-position behavior for absolutely positioned elements.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  color = "#34d399",
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  color?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        sound.click();
        onChange(!checked);
      }}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40",
        className,
      )}
      style={{ backgroundColor: checked ? color : "rgba(255,255,255,0.12)" }}
    >
      <span
        className={clsx(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
