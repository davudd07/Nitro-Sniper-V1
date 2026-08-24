import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, ChevronDown } from "lucide-react";
import { useFairnessStore } from "../../store/fairnessStore";
import { ticketFromRoll } from "../../lib/caseTickets";
import { clsx } from "clsx";

function truncate(s: string, n = 14) {
  if (s.length <= n * 2) return s;
  return `${s.slice(0, n)}…${s.slice(-n)}`;
}

export function ProvablyFairPanel({ compact = false }: { compact?: boolean }) {
  const { serverSeedHash, clientSeed, nonce, setClientSeed, rotateServerSeed, init, history } = useFairnessStore();
  const [open, setOpen] = useState(false);
  const [editingSeed, setEditingSeed] = useState(clientSeed);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => setEditingSeed(clientSeed), [clientSeed]);

  return (
    <div className="surface overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Provably Fair
        </span>
        <ChevronDown className={clsx("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/5 px-3 py-3 text-xs">
          <p className="text-slate-400">
            Every roll is derived from a server seed (committed via its hash before you play), your client seed, and a
            round nonce — HMAC-SHA256, same pattern used across the industry. The float is mapped onto a{" "}
            <span className="font-mono text-slate-300">1,000,000</span>-ticket pool; the rarest 1% of outcomes sit on
            tickets 990,000–1,000,000. Because this is a client-only demo, the “server” lives in your browser too, but
            the verification flow is real: you can re-derive any past roll below.
          </p>
          <div>
            <p className="mb-1 text-slate-500">Server seed hash (committed)</p>
            <p className="break-all rounded bg-black/30 p-2 font-mono text-[11px] text-slate-300">
              {compact ? truncate(serverSeedHash) : serverSeedHash || "generating…"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-slate-500">Client seed</p>
            <div className="flex gap-2">
              <input
                value={editingSeed}
                onChange={(e) => setEditingSeed(e.target.value)}
                onBlur={() => setClientSeed(editingSeed)}
                className="w-full rounded bg-black/30 px-2 py-1.5 font-mono text-[11px] text-slate-200 outline-none ring-1 ring-white/10 focus:ring-emerald-400/50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Round nonce</span>
            <span className="font-mono text-slate-300">{nonce}</span>
          </div>
          <button
            onClick={() => void rotateServerSeed()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Rotate server seed (reveals previous)
          </button>
          {history.length > 0 && (
            <div>
              <p className="mb-1 text-slate-500">Recent revealed rolls</p>
              <div className="max-h-32 space-y-1 overflow-y-auto scrollbar-thin">
                {history.slice(0, 6).map((h) => (
                  <div key={h.nonce} className="rounded bg-black/20 p-1.5 font-mono text-[10px] text-slate-400">
                    #{h.nonce} · seed {truncate(h.serverSeed, 6)} · tickets [
                    {h.rolls.map((r) => ticketFromRoll(r).toLocaleString("en-US")).join(", ")}]
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
