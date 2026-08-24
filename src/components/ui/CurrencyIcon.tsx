import { clsx } from "clsx";
import { formatLockNumber, LOCK_META, SHARD_META, type LockUnit } from "../../lib/money";
import { useSettingsStore } from "../../store/settingsStore";

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

/** Number in the active lock unit, with that unit’s icon (no WL/DL/BGL text). */
export function CashAmount({
  wl,
  className,
  iconClassName = "h-3.5 w-3.5",
  suffix,
}: {
  wl: number;
  className?: string;
  iconClassName?: string;
  suffix?: string;
}) {
  const unit = useSettingsStore((s) => s.lockUnit);
  return (
    <span className={clsx("inline-flex items-center gap-0.5 align-middle", className)}>
      <span className="font-mono tabular-nums">{formatLockNumber(wl, unit)}</span>
      <CurrencyIcon kind={unit} className={iconClassName} />
      {suffix ? <span className="font-sans font-medium">{suffix}</span> : null}
    </span>
  );
}
