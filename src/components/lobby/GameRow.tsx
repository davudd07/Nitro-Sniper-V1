import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { sound } from "../../lib/sound";

export function GameRow({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  function scroll(dir: -1 | 1) {
    sound.click();
    scroller.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="flex-1 text-sm font-bold uppercase tracking-[0.14em] text-white">{title}</h2>
        <button
          type="button"
          onClick={() => {
            sound.click();
            setExpanded((v) => !v);
          }}
          className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-white"
        >
          {expanded ? "Collapse" : "View all"}
        </button>
        {!expanded && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scroller}
        className={clsx(
          expanded ? "flex flex-wrap gap-3" : "flex gap-3 overflow-x-auto pb-1 scrollbar-thin",
        )}
      >
        {children}
      </div>
    </section>
  );
}
