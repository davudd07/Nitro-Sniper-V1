import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="border-b border-white/[0.05] bg-white/[0.025] px-4 py-2 text-center text-[12px] leading-relaxed text-slate-400">
      <Info className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-cyan-300/80" />
      Play-money showcase — Shards and Fun Coins have no cash value. Bet 0 for a demo round; any stake above 0 spends Shards. Rakeback is paid in Shards (4% of the house-edge slice).
    </div>
  );
}
