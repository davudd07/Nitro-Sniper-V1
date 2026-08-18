import { Link } from "react-router-dom";
import { Swords, Users, Shuffle, Coins, Sparkles, Bot } from "lucide-react";

const FEATURES = [
  { icon: Users, title: "1v1 up to 3v3", desc: "1v1, 1v1v1, 1v1v1v1, 1v1v1v1v1, 2v2, 2v2v2, or 3v3." },
  { icon: Shuffle, title: "Crazy Mode", desc: "Flip the script — the lowest total value wins instead of the highest." },
  { icon: Coins, title: "Jackpot Mode", desc: "A ticket-weighted spin decides the winner, proportional to what each player pulled." },
  { icon: Sparkles, title: "Gold Spin", desc: "Landing a top ~5% item triggers a bonus gold reel for extra flair." },
  { icon: Bot, title: "Bots or simulated players", desc: "Call a bot into any open seat, or simulate a real player joining." },
];

export function CaseBattlesLobby() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 text-center">
      <div>
        <Swords className="mx-auto mb-3 h-12 w-12 text-amber-300" />
        <h1 className="text-3xl font-extrabold text-white">Case Battles</h1>
        <p className="mx-auto mt-2 max-w-lg text-slate-400">
          Build a battle, fill the seats, and watch everyone's reels spin side by side in a dedicated battle room.
        </p>
        <Link
          to="/battles/create"
          className="mt-6 inline-block rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 px-8 py-3 font-bold text-bg-950 shadow-lg transition-transform hover:scale-105"
        >
          Create a Battle
        </Link>
      </div>

      <div className="grid gap-4 text-left sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-bg-800/60 p-4">
            <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-300" />
            <div>
              <p className="font-semibold text-white">{f.title}</p>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
