import { clsx } from "clsx";
import type { Case } from "../../data/cases";
import { ITEMS } from "../../data/items";
import { ItemIcon } from "../ui/ItemIcon";
import { designItemsFor } from "../../lib/communityCases";

export function CaseThumb({ c, className }: { c: Case; className?: string }) {
  const design = c.community
    ? designItemsFor(
        { designItemIds: c.designItemIds ?? [], entries: c.odds.map((o) => ({ itemId: o.item.id, chancePct: o.probability * 100 })) },
        c.odds,
      )
    : [];

  return (
    <div
      className={clsx("relative flex items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(160deg, ${c.from}, ${c.to})` }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 45%)",
        }}
      />
      {c.community ? (
        <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-1 px-2 py-2">
          <div className="flex items-end justify-center -space-x-2">
            {design.map((item) => (
              <ItemIcon key={item.id} icon={item.icon} rarity={item.rarity} size="sm" lite className="ring-1 ring-black/40" />
            ))}
            {design.length === 0 &&
              c.odds.slice(0, 3).map((o) => {
                const item = ITEMS[o.item.id] ?? o.item;
                return <ItemIcon key={item.id} icon={item.icon} rarity={item.rarity} size="sm" lite />;
              })}
          </div>
          <p className="max-w-full truncate text-center text-[10px] font-extrabold uppercase tracking-wide text-white/90 drop-shadow">
            {c.name}
          </p>
        </div>
      ) : (
        <img
          src={`/images/cases/${c.id}.webp`}
          alt={c.name}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover drop-shadow-lg transition-transform duration-200 group-hover:scale-110"
        />
      )}
    </div>
  );
}
