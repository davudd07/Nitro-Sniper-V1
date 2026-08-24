import { clsx } from "clsx";
import { LOCK_META, SHARD_META, type LockUnit } from "../../lib/money";

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
