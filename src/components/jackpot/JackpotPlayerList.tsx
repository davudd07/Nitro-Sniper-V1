import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import type { JackpotEntry } from "../../store/jackpotStore";
import type { PlayCurrency } from "../../lib/playWallet";
import { CashAmount } from "../ui/CurrencyIcon";
import { PlayerTag } from "../identity/PlayerTag";

export function JackpotPlayerList({
  entries,
  total,
  currency,
  activeId = null,
  winnerId = null,
}: {
  entries: JackpotEntry[];
  total: number;
  currency: PlayCurrency;
  activeId?: string | null;
  winnerId?: string | null;
}) {
  const listed = useMemo(
    () => [...entries].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)),
    [entries],
  );
  const youTicketNo = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const e of entries) {
      if (e.kind !== "you") continue;
      n += 1;
      map.set(e.id, n);
    }
    return { map, total: n };
  }, [entries]);

  if (listed.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No players yet. Join to open this pot.</p>;
  }

  return (
    <ul className="space-y-1.5">
      <AnimatePresence initial={false}>
        {listed.map((e) => {
          const pct = total > 0 ? (e.amount / total) * 100 : 0;
          const active = activeId === e.id;
          const won = winnerId === e.id;
          return (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 ring-1 ring-transparent",
                won && "bg-amber-400/10 ring-amber-400/35",
                !won && active && "bg-cyan-400/10 ring-cyan-400/35",
                !won && !active && e.kind === "you" && "bg-white/[0.03]",
              )}
            >
              <span
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ background: e.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <PlayerTag
                    name={e.name}
                    you={e.kind === "you"}
                    color={e.color}
                    size={22}
                    kind={e.kind === "you" ? "you" : e.kind === "bot" ? "bot" : "player"}
                    className="min-w-0 flex-1"
                    nameClassName="text-[13px] font-semibold text-white"
                  />
                  {e.kind === "bot" ? (
                    <span className="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-white/10">
                      Bot
                    </span>
                  ) : null}
                  {e.kind === "you" && youTicketNo.total > 1 ? (
                    <span className="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-cyan-300/80 ring-1 ring-cyan-400/25">
                      Ticket {youTicketNo.map.get(e.id)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(2, pct)}%`, background: e.color }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xs text-slate-200">
                  <CashAmount wl={e.amount} currency={currency} iconClassName="h-3 w-3" />
                </p>
                <p
                  className={clsx(
                    "font-mono text-[11px] tabular-nums",
                    won ? "text-amber-200" : "text-slate-500",
                  )}
                >
                  {pct.toFixed(1)}%
                </p>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
