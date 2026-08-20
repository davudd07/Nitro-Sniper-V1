import { Link } from "react-router-dom";
import { Swords, Users, Shuffle, Coins, Sparkles, Bot, Flag } from "lucide-react";
import { sound } from "../lib/sound";

const FEATURES = [
  { icon: Users, title: "1v1 up to 3v3", desc: "FFA lanes or team modes — 1v1 through 3v3." },
  { icon: Shuffle, title: "Crazy Mode", desc: "Lowest total wins instead of highest." },
  { icon: Coins, title: "Jackpot Mode", desc: "Ticket-weighted spin. The pointer lights up the color it is over." },
  { icon: Flag, title: "Terminal Mode", desc: "Only the last case decides the winner." },
  { icon: Sparkles, title: "Gold Spin", desc: "Top ~5% pulls trigger a bonus gold reel." },
  { icon: Bot, title: "Bots or simulated players", desc: "Fill any seat instantly and the countdown starts." },
];

export function CaseBattlesLobby() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/10 ring-1 ring-amber-300/20">
          <Swords className="h-7 w-7 text-amber-300" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Case Battles</h1>
        <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-slate-400">
          Build a room, fill the seats, and watch every reel spin side by side.
        </p>
        <Link
          to="/battles/create"
          onClick={() => sound.click()}
          className="btn-primary mt-7 inline-flex px-8 py-3 text-[15px]"
        >
          Create a Battle
        </Link>
      </div>

      <div className="grid gap-3 text-left sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="surface flex items-start gap-3 p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 ring-1 ring-white/8">
              <f.icon className="h-4 w-4 text-fuchsia-300" />
            </div>
            <div>
              <p className="font-semibold tracking-tight text-white">{f.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
