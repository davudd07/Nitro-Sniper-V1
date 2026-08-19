import type { Case } from "../../data/cases";
import { clsx } from "clsx";

export function CaseThumb({ c, className }: { c: Case; className?: string }) {
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
      <img
        src={`/images/cases/${c.id}.webp`}
        alt={c.name}
        loading="lazy"
        draggable={false}
        className="h-full w-full object-cover drop-shadow-lg transition-transform duration-200 group-hover:scale-110"
      />
    </div>
  );
}
