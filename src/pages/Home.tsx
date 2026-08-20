import { Link } from "react-router-dom";
import { Bomb, Spade, Package, Swords, ShieldCheck, Sparkles } from "lucide-react";
import { CASES } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { formatPercent } from "../lib/format";

const GAMES = [
  {
    to: "/mines",
    icon: Bomb,
    name: "Mines",
    desc: "Reveal safe tiles, cash out any time. More mines, higher multipliers.",
    accent: "from-emerald-400/15",
    tag: "96% RTP",
  },
  {
    to: "/blackjack",
    icon: Spade,
    name: "Blackjack",
    desc: "Dealer stands on 17, 3:2 blackjack, Perfect Pairs and 21+3 on the felt.",
    accent: "from-sky-400/15",
    tag: "99.41% RTP",
  },
  {
    to: "/cases",
    icon: Package,
    name: "Cases",
    desc: "Nine original cases, transparent odds, horizontal reels, optional Gold Spin.",
    accent: "from-fuchsia-400/15",
    tag: "9 cases",
  },
  {
    to: "/battles",
    icon: Swords,
    name: "Case Battles",
    desc: "1v1 through 3v3 with Crazy, Jackpot, Terminal, and Gold Spin modifiers.",
    accent: "from-amber-400/15",
    tag: "Live rooms",
  },
];

export function Home() {
  return (
    <div className="space-y-14">
      <section className="surface relative overflow-hidden px-6 py-16 text-center sm:px-14">
        <div className="pointer-events-none absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              className={`surface group relative overflow-hidden bg-gradient-to-b ${g.accent} to-transparent p-5 transition-transform hover:-translate-y-1`}
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
