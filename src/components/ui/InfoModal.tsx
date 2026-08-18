import { useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import { createPortal } from "react-dom";

export function InfoButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
        title="RTP & house edge info"
      >
        <Info className="h-3.5 w-3.5" /> Info
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-bg-900 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono font-semibold text-white">{value}</span>
    </div>
  );
}
