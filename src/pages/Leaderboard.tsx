import { useState } from "react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { Trophy } from "lucide-react";
import { CashAmount } from "../components/ui/CurrencyIcon";
import { Switch } from "../components/ui/Switch";
import {
  LEADERBOARD_PERIOD_LABEL,
  LEADERBOARD_PRIZES,
  type LeaderboardPeriod,
} from "../lib/leaderboard";
import { displayLeaderboardName, leaderboardRows, useLeaderboardStore } from "../store/leaderboardStore";
import { useDemoProfileStore } from "../store/demoProfileStore";
import { localWinName } from "../store/winLeaderStore";

const PERIODS: LeaderboardPeriod[] = ["daily", "weekly", "monthly"];

export function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("daily");
  const boardRev = useLeaderboardStore(
    (s) => `${s.keys.daily}:${s.you.daily}:${s.you.weekly}:${s.you.monthly}:${s.lastBotTick}`,
  );
  const anonymous = useDemoProfileStore((s) => s.anonymous);
  void boardRev;

  const rows = leaderboardRows(period);
  const youRow = rows.find((r) => r.isYou);
  const prizes = LEADERBOARD_PRIZES[period];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white">
          <Trophy className="h-6 w-6 text-amber-300" />
          Leaderboard
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
          Ranked by World Locks wagered only — switch the header wallet to World Locks to climb. Shards never count.
          Top 5 at the end of each period get a play-money prize. Hidden profiles show as Hidden.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Switch
            checked={anonymous}
            onChange={(on) => useDemoProfileStore.getState().setAnonymous(on)}
            color="#67e8f9"
          />
          Hide my name on this board
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
              period === p ? "bg-white/12 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {LEADERBOARD_PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        {prizes.map((amt, i) => (
          <div key={i} className="rounded-xl border-2 border-white/10 bg-[#0c1414] px-3 py-2 shadow-[3px_3px_0_#050808]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">#{i + 1}</p>
            <p className="mt-1 font-semibold text-amber-200">
              <CashAmount wl={amt} iconClassName="h-3.5 w-3.5" />
            </p>
          </div>
        ))}
      </div>

      {youRow ? (
        <p className="text-sm text-slate-400">
          You are #{youRow.place} this {period} with <CashAmount wl={youRow.wagered} iconClassName="h-3.5 w-3.5" />{" "}
          wagered
          {youRow.prize > 0 ? (
            <>
              {" "}
              · current prize <CashAmount wl={youRow.prize} iconClassName="h-3.5 w-3.5" /> if you hold this place
            </>
          ) : (
            " · top 5 pays when the period ends"
          )}
          {anonymous ? ` · listed as ${displayLeaderboardName({ hidden: true, isYou: true, name: localWinName() })}` : null}.
        </p>
      ) : null}

      <div className="surface overflow-hidden">
        <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_8rem_8rem] border-b border-white/8 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
          <span>#</span>
          <span>Player</span>
          <span>Wagered</span>
          <span>Prize</span>
        </div>
        <div className="divide-y divide-white/6">
          {rows.map((row) => (
            <div
              key={row.id}
              className={clsx(
                "grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 md:grid-cols-[3.5rem_minmax(0,1fr)_8rem_8rem]",
                row.isYou && "bg-cyan-400/8",
                row.place <= 5 && "border-l-2 border-amber-300/50",
              )}
            >
              <span className="font-mono text-sm font-bold text-slate-300">{row.place}</span>
              <span className={clsx("truncate font-semibold", row.hidden ? "text-slate-500 italic" : "text-white")}>
                {row.name}
                {row.isYou ? <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-cyan-300">You</span> : null}
              </span>
              <span className="font-semibold text-amber-200">
                <CashAmount wl={row.wagered} iconClassName="h-3.5 w-3.5" />
              </span>
              <span className="hidden text-sm text-emerald-200 md:block">
                {row.prize > 0 ? <CashAmount wl={row.prize} iconClassName="h-3.5 w-3.5" /> : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Daily resets at 00:00 UTC, weekly on Monday 00:00 UTC, monthly on the 1st 00:00 UTC. Prizes credit when the
        period closes.
      </p>
      <Link to="/rewards" className="text-sm text-slate-400 hover:text-white">
        Rank cases & drops →
      </Link>
    </div>
  );
}
