import { Link } from "react-router-dom";
import { providerSlotThumb, type ProviderSlot } from "../../lib/slots";

export function ProviderSlotCard({ slot }: { slot: ProviderSlot }) {
  return (
    <Link
      to={`/slots/${slot.id}`}
      className="lobby-tile-lift group relative w-[158px] shrink-0 overflow-hidden rounded-xl border-2 border-white/10 shadow-[4px_4px_0_#050808] sm:w-[176px]"
      aria-label={`${slot.name} by ${slot.provider}`}
    >
      <div className="aspect-square bg-[#121c1c]">
        <img
          src={providerSlotThumb(slot.symbol)}
          alt=""
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-3 pb-3 pt-10">
        <p className="text-[14px] font-extrabold uppercase leading-tight tracking-wide text-white drop-shadow">{slot.name}</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">{slot.provider}</p>
      </div>
      <span className="absolute left-2 top-2 rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow">
        Play
      </span>
    </Link>
  );
}
