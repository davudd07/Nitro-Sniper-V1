import { Link } from "react-router-dom";
import { Bomb, Spade, Package, Swords, Coins, ShieldCheck, Sparkles } from "lucide-react";
import { CASES } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { formatPercent } from "../lib/format";

const GAMES = [
  {
    to: "/mines",
    icon: Bomb,
    name: "Mines",
    desc: "Reveal safe tiles, cash out any time. More mines, higher multipliers.",
    tag: "96% RTP",
  },
  {
    to: "/blackjack",
    icon: Spade,
    name: "Blackjack",
    desc: "Dealer stands on 17, 3:2 blackjack, Perfect Pairs and 21+3 on the felt.",
    tag: "99.41% RTP",
  },
  {
    to: "/cases",
    icon: Package,
    name: "Cases",
    desc: "Nine original cases, transparent odds, horizontal reels, optional Gold Spin.",
    tag: "9 cases",
  },
  {
    to: "/battles",
    icon: Swords,
    name: "Case Battles",
    desc: "1v1 through 3v3 with Crazy, Jackpot, Terminal, and Gold Spin modifiers.",
    tag: "Live rooms",
  },
  {
    to: "/jackpot",
    icon: Coins,
    name: "Jackpot",
    desc: "Small, large, and unlimited pots. Call a bot at your bet. 9% house edge.",
    tag: "91% RTP",
  },
];

export function Home() {
  return (
    <div className="space-y-14">
      <section className="surface relative px-6 py-16 text-center sm:px-14">
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium tracking-wide text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Play-money only · no deposits or cash-out
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-[3.25rem] sm:leading-[1.1]">
          Cases, battles, and table games — built to look like the real thing.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-slate-400">
          A portfolio demo of weighted odds, provably-fair rolls, and motion. Every Shard is fake and resets whenever
          you want.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/cases" className="btn-primary px-7 py-3 text-[15px]">
            Open a case
          </Link>
          <Link
            to="/battles"
            className="rounded-xl border border-white/12 px-7 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/5"
          >
            Start a battle
          </Link>
        </div>
      </section>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {GAMES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              className={`surface group relative p-5 transition-transform hover:-translate-y-0.5`}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 ring-1 ring-white/10">
                <g.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">{g.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{g.desc}</p>
              <span className="mt-4 inline-block rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                {g.tag}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-300" />
          <h2 className="text-xl font-semibold tracking-tight text-white">Featured cases</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CASES.map((c) => (
            <Link key={c.id} to={`/cases/${c.id}`} className="surface group overflow-hidden transition-transform hover:-translate-y-1">
              <CaseThumb c={c} className="h-28" />
              <div className="p-3.5">
                <p className="font-semibold tracking-tight text-white">{c.name}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono tabular-nums">{c.price.toLocaleString()} SH</span>
                  <span>{formatPercent(c.rtp, 0)} RTP</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
