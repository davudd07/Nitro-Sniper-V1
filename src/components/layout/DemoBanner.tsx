import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-200">
      <Info className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
      Demo showcase only — "Shards" are play money with no real-world value. Nothing here can be purchased, deposited, cashed out, or traded.
    </div>
  );
}
