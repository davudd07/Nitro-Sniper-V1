import { DAILY_VOLATILITIES, DAILY_VOLATILITY_LABEL, type DailyVolatility } from "../../lib/rankRewards";

export function VolatilitySlider({
  value,
  onChange,
  disabled,
  label = "Volatility",
}: {
  value: DailyVolatility;
  onChange: (next: DailyVolatility) => void;
  disabled?: boolean;
  label?: string;
}) {
  const riskIndex = DAILY_VOLATILITIES.indexOf(value);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        <span className="font-bold text-cyan-200">{DAILY_VOLATILITY_LABEL[value]}</span>
      </div>
      <input
        type="range"
        min={0}
        max={2}
        step={1}
        disabled={disabled}
        value={riskIndex < 0 ? 1 : riskIndex}
        onChange={(e) => {
          const next = DAILY_VOLATILITIES[Number(e.target.value)] ?? "medium";
          onChange(next);
        }}
        className="keno-risk-slider w-full disabled:opacity-50"
      />
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-600">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}
