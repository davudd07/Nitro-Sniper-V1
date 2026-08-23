import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Sparkles, Flame, Search, ShieldCheck } from "lucide-react";
import { sound } from "../lib/sound";
import { useToastStore } from "../store/toastStore";
import { CASES } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { formatCredits, formatPercent } from "../lib/format";
import { GameCard } from "../components/lobby/GameCard";
import { GameRow } from "../components/lobby/GameRow";
import { HomeHero } from "../components/lobby/HomeHero";
import { PromoRow } from "../components/lobby/PromoRow";
import {
  LOBBY_GAMES,
  ORIGINAL_IDS,
  POPULAR_IDS,
  SOON_IDS,
  gameById,
} from "../data/lobbyGames";
import { listRecent } from "../lib/recentGames";

export function Home() {
  const [query, setQuery] = useState("");
  const push = useToastStore((s) => s.push);
  const recent = useMemo(
    () => listRecent().map(gameById).filter((g): g is NonNullable<typeof g> => Boolean(g)),
    [],
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? LOBBY_GAMES.filter((g) => g.name.toLowerCase().includes(q))
    : null;

  function soon() {
    sound.click();
    push("That table is coming soon.", "info");
  }

  return (
    <div className="space-y-8">
      <HomeHero />
      <PromoRow />

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for Game..."
          className="w-full rounded-xl border-2 border-cyan-400/25 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
        />
      </label>

      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-emerald-300/90">
        <ShieldCheck className="h-3.5 w-3.5" /> Bet 0 to demo. Stakes above 0 spend Shards. Claim rakeback on Rewards.
      </p>

      {filtered ? (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-white">
            Search results
          </h2>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No games match “{query}”.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {filtered.map((g) => (
                <GameCard key={g.id} game={g} onSoon={soon} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {recent.length > 0 && (
            <GameRow icon={<Clock className="h-4 w-4 text-sky-300" />} title="Continue playing">
              {recent.map((g) => (
                <GameCard key={g.id} game={g} onSoon={soon} />
              ))}
            </GameRow>
          )}

          <GameRow icon={<Sparkles className="h-4 w-4 text-fuchsia-300" />} title="Prism Vault Originals">
            {ORIGINAL_IDS.map((id) => {
              const g = gameById(id);
              return g ? <GameCard key={g.id} game={g} onSoon={soon} /> : null;
            })}
          </GameRow>

          <GameRow icon={<Flame className="h-4 w-4 text-orange-300" />} title="Popular">
            {POPULAR_IDS.map((id) => {
              const g = gameById(id);
              return g ? <GameCard key={g.id} game={g} onSoon={soon} /> : null;
            })}
          </GameRow>

          <GameRow icon={<Sparkles className="h-4 w-4 text-slate-400" />} title="Coming soon">
            {SOON_IDS.map((id) => {
              const g = gameById(id);
              return g ? <GameCard key={g.id} game={g} onSoon={soon} /> : null;
            })}
          </GameRow>
        </>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Featured cases</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {CASES.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="group w-[158px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition-transform hover:-translate-y-1 sm:w-[176px]"
            >
              <CaseThumb c={c} className="aspect-[3/4]" />
              <div className="-mt-14 relative bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-10">
                <p className="text-sm font-extrabold uppercase tracking-wide text-white">{c.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-white/60">
                  {formatCredits(c.price)} SH · {formatPercent(c.rtp, 0)} RTP
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
