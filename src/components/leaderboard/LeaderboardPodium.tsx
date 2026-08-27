import { clsx } from "clsx";
import { Crown, Medal } from "lucide-react";
import { CashAmount } from "../ui/CurrencyIcon";
import type { LeaderboardRow } from "../../store/leaderboardStore";

const PODIUM_ORDER = [1, 0, 2] as const;

const PLACE_STYLE = [
  {
    place: 1,
    label: "1st",
    height: "h-44",
    ring: "border-amber-300/80",
    glow: "from-amber-400/25",
    step: "bg-gradient-to-b from-amber-300 to-amber-700",
    text: "text-amber-100",
    icon: "text-amber-300",
  },
  {
    place: 2,
    label: "2nd",
    height: "h-36",
    ring: "border-slate-300/55",
    glow: "from-slate-200/15",
    step: "bg-gradient-to-b from-slate-200 to-slate-600",
    text: "text-slate-100",
    icon: "text-slate-200",
  },
  {
    place: 3,
    label: "3rd",
    height: "h-32",
    ring: "border-orange-400/55",
    glow: "from-orange-400/20",
    step: "bg-gradient-to-b from-orange-300 to-amber-800",
    text: "text-orange-100",
    icon: "text-orange-300",
  },
] as const;

export function LeaderboardPodium({ rows }: { rows: LeaderboardRow[] }) {
  const top = [rows[0], rows[1], rows[2]];
  if (!top[0]) return null;

  return (
    <div className="grid items-end gap-2 sm:grid-cols-3">
      {PODIUM_ORDER.map((idx) => {
        const row = top[idx];
        const style = PLACE_STYLE[idx]!;
        if (!row) {
          return <div key={style.place} className="hidden sm:block" />;
        }
        const Icon = idx === 0 ? Crown : Medal;
        return (
          <article
            key={row.id}
            className={clsx(
              "relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#0c1414] shadow-[3px_3px_0_#050808]",
              style.ring,
              idx === 0 && "order-first sm:order-2 sm:-mt-4",
              idx === 1 && "sm:order-1",
              idx === 2 && "sm:order-3",
              row.isYou && "ring-2 ring-cyan-300/70",
            )}
          >
            <div className={clsx("pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent", style.glow)} />
            <div className={clsx("relative flex flex-col items-center justify-end px-3 pb-3 pt-4", style.height)}>
              <Icon className={clsx("h-6 w-6", style.icon)} />
              <p className={clsx("mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em]", style.text)}>
                {style.label}
              </p>
              <p
                className={clsx(
                  "mt-2 w-full truncate text-center text-lg font-black",
                  row.hidden ? "italic text-slate-400" : "text-white",
                )}
                title={row.name}
              >
                {row.name}
                {row.isYou ? <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-cyan-300">You</span> : null}
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Wagered</p>
              <p className="font-semibold text-amber-200">
                <CashAmount currency="wl" unit="wl" wl={row.wagered} iconClassName="h-4 w-4" />
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Prize</p>
              <p className="font-semibold text-emerald-200">
                {row.prize > 0 ? <CashAmount currency="wl" unit="wl" wl={row.prize} iconClassName="h-4 w-4" /> : "—"}
              </p>
            </div>
            <div className={clsx("relative h-2.5", style.step)} />
          </article>
        );
      })}
    </div>
  );
}
