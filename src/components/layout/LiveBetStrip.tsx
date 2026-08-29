import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { useActivityStore, ACTIVITY_GAME_LABELS, type PlayRecord } from "../../store/activityStore";
import { useDemoProfileStore } from "../../store/demoProfileStore";
import { useAdminViewStore } from "../../store/adminViewStore";
import { isLocalPlayerName, publicPlayerName } from "../../lib/publicName";
import { battlePlayCurrency, playCurrencyLabel, usePlayCurrency } from "../../lib/playWallet";
import { CashAmount } from "../ui/CurrencyIcon";
import { formatWinMulti } from "../../store/winLeaderStore";
import { ChatModMenu } from "../admin/ChatModMenu";

type Tab = "all" | "lucky" | "high" | "mine";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All bets" },
  { id: "lucky", label: "Lucky wins" },
  { id: "high", label: "High rollers" },
  { id: "mine", label: "My bets" },
];

const HIGH_ROLLER_WL = 100_000;
const HIGH_ROLLER_SHARDS = 200;
const LUCKY_X = 10;
const TICK_MS = 3000;

function multiplier(p: PlayRecord): number {
  if (!(p.wagered > 0) || !(p.won > 0)) return 0;
  return p.won / p.wagered;
}

function timeAgo(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

export function LiveBetStrip() {
  const plays = useActivityStore((s) => s.plays);
  const inject = useActivityStore((s) => s.injectLivePlays);
  const ledger = usePlayCurrency();
  const [tab, setTab] = useState<Tab>("all");
  const [now, setNow] = useState(() => Date.now());
  const adminView = useAdminViewStore((s) => s.active);
  useDemoProfileStore((s) => s.anonymous);
  useDemoProfileStore((s) => s.displayName);

  useEffect(() => {
    const id = window.setInterval(() => {
      inject();
      setNow(Date.now());
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [inject]);

  const rows = useMemo(() => {
    const list = plays.filter((p) => p.wagered > 0 && battlePlayCurrency(p) === ledger);
    const highCut = ledger === "shards" ? HIGH_ROLLER_SHARDS : HIGH_ROLLER_WL;
    if (tab === "lucky") return list.filter((p) => multiplier(p) > LUCKY_X).slice(0, 24);
    if (tab === "high") return list.filter((p) => p.wagered >= highCut).slice(0, 24);
    if (tab === "mine") return list.filter((p) => isLocalPlayerName(p.name)).slice(0, 24);
    return list.slice(0, 24);
  }, [plays, tab, ledger]);

  return (
    <section className="border-t border-white/[0.06] bg-[#0a1212]">
      <div className="flex items-center gap-1 overflow-x-auto px-3 pt-3 pb-1 scrollbar-thin">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide",
              tab === t.id ? "bg-emerald-400/15 text-emerald-200" : "text-slate-500 hover:text-slate-300",
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto hidden text-[11px] text-slate-600 sm:inline">Live · ~3s</span>
      </div>
      <div className="max-h-[21.4rem] overflow-y-auto px-2 py-2 scrollbar-thin">
        {rows.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-slate-600">
            {tab === "mine"
              ? "Your bets will land here."
              : `Waiting for ${playCurrencyLabel(ledger)} bets…`}
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-2 py-1 font-semibold">Time</th>
                <th className="px-2 py-1 font-semibold">Player</th>
                <th className="hidden px-2 py-1 font-semibold sm:table-cell">Game</th>
                <th className="px-2 py-1 font-semibold">Bet</th>
                <th className="px-2 py-1 font-semibold">Payout</th>
                <th className="px-2 py-1 font-semibold">×</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const multi = multiplier(p);
                const name = tab === "mine" ? (isLocalPlayerName(p.name) ? "You" : p.name) : publicPlayerName(p.name);
                return (
                  <tr key={p.id} className="border-t border-white/[0.04] text-slate-300">
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-500">{timeAgo(p.at, now)}</td>
                    <td className="max-w-[7rem] truncate px-2 py-1.5 font-semibold text-slate-200">
                      <span className="inline-flex max-w-full items-center gap-1">
                        <span className="truncate">{name}</span>
                        {adminView && <ChatModMenu name={isLocalPlayerName(p.name) ? "You" : p.name} />}
                      </span>
                    </td>
                    <td className="hidden px-2 py-1.5 text-slate-400 sm:table-cell">{ACTIVITY_GAME_LABELS[p.game] ?? p.game}</td>
                    <td className="px-2 py-1.5">
                      <CashAmount wl={p.wagered} currency={battlePlayCurrency(p)} iconClassName="h-3.5 w-3.5" />
                    </td>
                    <td className={clsx("px-2 py-1.5", p.won > p.wagered ? "text-emerald-300" : "text-slate-400")}>
                      <CashAmount wl={p.won} currency={battlePlayCurrency(p)} iconClassName="h-3.5 w-3.5" />
                    </td>
                    <td className={clsx("px-2 py-1.5 font-mono", multi > LUCKY_X ? "text-amber-300" : "text-slate-500")}>
                      {multi > 0 ? formatWinMulti(multi) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
