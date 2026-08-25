import { MAX_BORROW_PCT, MIN_BORROW_PCT, snapBorrowPct } from "../../lib/battleFinance";

export function BorrowPctSlider({
  value,
  onChange,
  disabled = false,
  allowZero = false,
}: {
  value: number;
  onChange: (pct: number) => void;
  disabled?: boolean;
  /** Join flow can sit at 0% (no borrow). Create / solo borrow-on starts at 1%. */
  allowZero?: boolean;
}) {
  const min = allowZero ? 0 : Math.round(MIN_BORROW_PCT * 100);
  const max = Math.round(MAX_BORROW_PCT * 100);
  const shown = Math.round(snapBorrowPct(value, allowZero) * 100);

  function commit(raw: number) {
    onChange(snapBorrowPct(raw / 100, allowZero));
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={shown}
        disabled={disabled}
        onChange={(e) => commit(Number(e.target.value))}
        className="min-w-0 flex-1 accent-sky-400"
        aria-label="Borrow percent"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={shown}
        disabled={disabled}
        onChange={(e) => commit(Number(e.target.value))}
        className="w-14 shrink-0 rounded-md border border-white/10 bg-black/30 px-1.5 py-1 text-center text-xs font-semibold text-sky-100 tabular-nums outline-none focus:border-sky-400/60"
        aria-label="Borrow percent number"
      />
      <span className="w-4 shrink-0 text-xs font-semibold text-sky-200">%</span>
    </div>
  );
}
