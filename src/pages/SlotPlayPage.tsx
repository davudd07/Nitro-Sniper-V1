import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { providerLaunchUrl, providerSlotById } from "../lib/slots";

export function SlotPlayPage() {
  const { slotId } = useParams();
  const slot = slotId ? providerSlotById(slotId) : undefined;
  const [blocked, setBlocked] = useState(false);
  const src = useMemo(() => (slot ? providerLaunchUrl(slot) : ""), [slot]);

  if (!slot) return <Navigate to="/slots" replace />;

  return (
    <div className="flex min-h-[70vh] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">Fun play · {slot.provider}</p>
          <h1 className="text-xl font-semibold tracking-tight text-white">{slot.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/15 hover:bg-white/5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </a>
          <Link to="/slots" className="text-xs font-semibold text-slate-400 hover:text-white">
            All slots
          </Link>
        </div>
      </div>

      <div className="relative min-h-[560px] flex-1 overflow-hidden rounded-xl border-2 border-cyan-400/25 bg-[#050808] shadow-[4px_4px_0_#050808]">
        {blocked ? (
          <div className="grid h-full min-h-[560px] place-items-center p-6 text-center">
            <div>
              <p className="text-sm text-slate-300">This demo wouldn’t load in the frame.</p>
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="btn-cyan mt-3 inline-flex px-4 py-2 text-sm"
              >
                Play {slot.name} in a new tab
              </a>
            </div>
          </div>
        ) : (
          <iframe
            title={slot.name}
            src={src}
            className="h-full min-h-[560px] w-full bg-black"
            allow="autoplay; fullscreen; clipboard-write"
            onError={() => setBlocked(true)}
          />
        )}
      </div>
    </div>
  );
}
