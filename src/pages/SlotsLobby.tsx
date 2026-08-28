import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PROVIDER_SLOTS } from "../lib/slots";
import { ProviderSlotCard } from "../components/slots/ProviderSlotCard";

export function SlotsLobby() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Slots</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-400">
          Pragmatic Play fun demos. Credits stay in the game — nothing hits your World Lock or Shard wallet.
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fuchsia-300" />
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Pragmatic Play</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {PROVIDER_SLOTS.map((slot) => (
            <ProviderSlotCard key={slot.id} slot={slot} />
          ))}
        </div>
      </section>

      <Link to="/" className="inline-block text-sm text-slate-400 hover:text-white">
        ← Back to lobby
      </Link>
    </div>
  );
}
