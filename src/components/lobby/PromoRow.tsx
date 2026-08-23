import { Link } from "react-router-dom";
import { Percent, Users, Gift } from "lucide-react";
import type { ReactNode } from "react";
import { formatPercent } from "../../lib/format";
import { RAKEBACK_OF_EDGE } from "../../lib/rakeback";
import { sound } from "../../lib/sound";

function PromoCard({
  kicker,
  title,
  body,
  cta,
  to,
  accent,
  icon,
}: {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={() => sound.click()}
      className="group relative flex min-h-[168px] flex-col overflow-hidden rounded-xl border-2 border-white/10 p-4 shadow-[4px_4px_0_#050808] transition-transform hover:-translate-y-0.5"
      style={{ background: accent }}
    >
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-lg border-2 border-white/20 bg-black/25 text-white">
        {icon}
      </div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/70">{kicker}</p>
      <h3 className="mt-0.5 text-lg font-extrabold uppercase tracking-wide text-white">{title}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-white/80">{body}</p>
      <span className="mt-3 text-xs font-bold text-white group-hover:underline">{cta}</span>
    </Link>
  );
}

export function PromoRow() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <PromoCard
        kicker="House edge slice"
        title="Rakeback"
        body={`${formatPercent(RAKEBACK_OF_EDGE, 0)} of the house-edge slice from real demo stakes (bet > 0). Claim it as Shards on Rewards.`}
        cta="Claim rakeback →"
        to="/rewards"
        accent="linear-gradient(160deg, #14532d 0%, #052e16 100%)"
        icon={<Percent className="h-5 w-5" />}
      />
      <PromoCard
        kicker="Play-money only"
        title="Affiliate"
        body="Share a demo invite. Earn a Fun Coin cut of referred play-money wager — never real cash, never a payout."
        cta="Start earning →"
        to="/affiliate"
        accent="linear-gradient(160deg, #155e75 0%, #083344 100%)"
        icon={<Users className="h-5 w-5" />}
      />
      <PromoCard
        kicker="No deposit exists"
        title="Free to play"
        body="Daily demo drops, chat rain, and bet-0 tables. Community is optional — rewards live here in the vault."
        cta="Join in →"
        to="/rewards"
        accent="linear-gradient(160deg, #6b21a8 0%, #3b0764 100%)"
        icon={<Gift className="h-5 w-5" />}
      />
    </div>
  );
}
