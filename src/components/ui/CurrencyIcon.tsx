import { clsx } from "clsx";
import { formatLockNumber, formatShardsNumber, LOCK_META, SHARD_META, type LockUnit } from "../../lib/money";
import { useSettingsStore } from "../../store/settingsStore";
import { usePlayCurrency, type PlayCurrency } from "../../lib/playWallet";

export function CurrencyIcon({
  kind,
  className,
  title,
}: {
  kind: LockUnit | "shards";
  className?: string;
  title?: string;
}) {
  const src = kind === "shards" ? SHARD_META.icon : LOCK_META[kind].icon;
  const alt = title ?? (kind === "shards" ? SHARD_META.name : LOCK_META[kind].name);
  return (
    <img
      src={src}
      alt={alt}
      title={alt}
      draggable={false}
      className={clsx("pixelated inline-block shrink-0 object-contain", className)}
    />
  );
}

/**
 * Amount in ledger World Locks (or Shards).
 * `currency="wl"` skips the Shards wallet. `unit="wl"` keeps the World Lock icon even if the header is on DL/BGL.
 */
export function CashAmount({
  wl,
  className,
  iconClassName = "h-3.5 w-3.5",
  suffix,
  currency,
  unit: unitOverride,
}: {
  wl: number;
  className?: string;
  iconClassName?: string;
  suffix?: string;
  currency?: PlayCurrency;
  unit?: LockUnit;
}) {
  const settingsUnit = useSettingsStore((s) => s.lockUnit);
  const play = usePlayCurrency();
  const ledger = currency ?? play;
  const unit = unitOverride ?? settingsUnit;
  if (ledger === "shards") {
    return (
      <span className={clsx("inline-flex items-center gap-0.5 align-middle", className)}>
        <span className="font-mono tabular-nums">{formatShardsNumber(wl)}</span>
        <CurrencyIcon kind="shards" className={iconClassName} />
        {suffix ? <span className="font-sans font-medium">{suffix}</span> : null}
      </span>
    );
  }
  return (
    <span className={clsx("inline-flex items-center gap-0.5 align-middle", className)}>
      <span className="font-mono tabular-nums">{formatLockNumber(wl, unit)}</span>
      <CurrencyIcon kind={unit} className={iconClassName} />
      {suffix ? <span className="font-sans font-medium">{suffix}</span> : null}
    </span>
  );
}
