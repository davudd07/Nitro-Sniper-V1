import { clsx } from "clsx";
import { BATTLE_MODES } from "../../data/battleModes";
import { Shuffle, Coins, Sparkles } from "lucide-react";

export function ModeSelector({ modeId, onChange }: { modeId: string; onChange: (id: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Player count / teams</p>
      <div className="flex flex-wrap gap-2">
        {BATTLE_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={clsx(
              "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              modeId === m.id
                ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white"
                : "border-white/10 bg-bg-800/60 text-slate-300 hover:bg-white/5",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleRow({
  crazy,
  jackpot,
  goldSpin,
  onCrazy,
  onJackpot,
  onGoldSpin,
}: {
  crazy: boolean;
  jackpot: boolean;
  goldSpin: boolean;
  onCrazy: (v: boolean) => void;
  onJackpot: (v: boolean) => void;
  onGoldSpin: (v: boolean) => void;
}) {
  const items = [
    { key: "crazy", label: "Crazy Mode", desc: "Lowest total wins instead of highest", icon: Shuffle, value: crazy, set: onCrazy, color: "#f97316" },
    { key: "jackpot", label: "Jackpot Mode", desc: "Ticket-weighted spin decides the winner", icon: Coins, value: jackpot, set: onJackpot, color: "#facc15" },
    { key: "gold", label: "Gold Spin", desc: "Rare pulls trigger a bonus gold reel", icon: Sparkles, value: goldSpin, set: onGoldSpin, color: "#fbbf24" },
  ];
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Modifiers</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => it.set(!it.value)}
            className={clsx(
              "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
              it.value ? "border-white/20 bg-white/10" : "border-white/10 bg-bg-800/60 hover:bg-white/5",
            )}
          >
            <it.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: it.value ? it.color : "#64748b" }} />
            <span>
              <span className="block text-sm font-semibold text-white">{it.label}</span>
              <span className="block text-[11px] text-slate-500">{it.desc}</span>
            </span>
            <span
              className={clsx(
                "relative ml-auto h-5 w-9 shrink-0 rounded-full transition-colors",
                it.value ? "bg-emerald-400" : "bg-white/10",
              )}
            >
              <span className={clsx("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", it.value ? "translate-x-4" : "translate-x-0.5")} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
