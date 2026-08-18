import { Link } from "react-router-dom";
import { Bomb, Spade, Package, Swords, ShieldCheck, Sparkles } from "lucide-react";
import { CASES } from "../data/cases";
import { formatPercent } from "../lib/format";

const GAMES = [
  {
    to: "/mines",
    icon: Bomb,
    name: "Mines",
    desc: "Reveal safe tiles, cash out any time. The more mines you flag, the higher the multiplier climbs.",
    accent: "from-emerald-500/20 to-emerald-500/0",
    tag: "~97% RTP",
  },
  {
    to: "/blackjack",
    icon: Spade,
    name: "Blackjack",
    desc: "Classic dealer-stands-on-17 blackjack with smooth card animations and 3:2 blackjack payouts.",
    accent: "from-sky-500/20 to-sky-500/0",
    tag: "~99.4% RTP",
  },
  {
    to: "/cases",
    icon: Package,
    name: "Cases",
    desc: "Five original cases, real weighted odds, animated reels, and a rare Gold Spin bonus.",
    accent: "from-fuchsia-500/20 to-fuchsia-500/0",
    tag: "5 cases",
  },
  {
    to: "/battles",
    icon: Swords,
    name: "Case Battles",
    desc: "1v1 up to 3v3, Crazy Mode, Jackpot Mode, and combos — battle bots or simulated players.",
    accent: "from-amber-500/20 to-amber-500/0",
    tag: "Live battle rooms",
  },
];

export function Home() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-bg-800 to-bg-950 px-6 py-14 text-center sm:px-12">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Play-money demo · nothing here can be bought or cashed out
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          A case-opening & mini-games showcase
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Mines, blackjack, case openings and case battles — built to demonstrate provably-fair mechanics, weighted
          odds, and juicy animations. Every balance is fake "Shard" currency that resets or auto-refills.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/cases"
            className="rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 px-6 py-3 font-semibold text-bg-950 shadow-lg shadow-fuchsia-500/20 transition-transform hover:scale-105"
          >
            Open a case
          </Link>
          <Link
            to="/battles"
            className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/5"
          >
            Start a case battle
          </Link>
        </div>
      </section>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b ${g.accent} bg-bg-800/60 p-5 transition-transform hover:-translate-y-1`}
            >
              <g.icon className="h-8 w-8 text-white" />
              <h3 className="mt-4 text-lg font-bold text-white">{g.name}</h3>
              <p className="mt-1.5 text-sm text-slate-400">{g.desc}</p>
              <span className="mt-4 inline-block rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                {g.tag}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-300" />
          <h2 className="text-xl font-bold text-white">Featured cases</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CASES.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-bg-800/60 transition-transform hover:-translate-y-1"
            >
              <div
                className="flex h-28 items-center justify-center text-3xl font-black text-white/90"
                style={{ background: `linear-gradient(160deg, ${c.from}, ${c.to})` }}
              >
                <Package className="h-12 w-12 opacity-80 transition-transform group-hover:scale-110" />
              </div>
              <div className="p-3">
                <p className="font-semibold text-white">{c.name}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{c.price.toLocaleString()} SH</span>
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
