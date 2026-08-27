import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="border-b border-white/[0.05] bg-white/[0.025] px-4 py-2 text-center text-[12px] leading-relaxed text-slate-400">
      <Info className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-cyan-300/80" />
      Play-money showcase — World Locks and Shards have no cash value. Bet 0 to demo. Stakes spend the wallet in the header. Every 10 World Locks wagered grants 1 Shard. Shards never mix with World Lock pots. Claim rakeback on Rewards (World Locks only).
    </div>
  );
}
