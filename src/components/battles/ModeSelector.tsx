import { clsx } from "clsx";
import { BATTLE_MODES } from "../../data/battleModes";
import { Shuffle, Coins, Sparkles, Flag } from "lucide-react";
import { sound } from "../../lib/sound";

export function ModeSelector({ modeId, onChange }: { modeId: string; onChange: (id: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Player count / teams</p>
      <div className="flex flex-wrap gap-2">
        {BATTLE_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              sound.click();
              onChange(m.id);
            }}
            className={clsx(
              "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-150 ease-out active:scale-95",
              modeId === m.id
                ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white shadow-[0_0_16px_rgba(217,70,239,0.25)]"
                : "border-white/10 bg-bg-800/60 text-slate-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/5",
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
  terminal,
  onCrazy,
  onJackpot,
  onGoldSpin,
  onTerminal,
}: {
  crazy: boolean;
  jackpot: boolean;
  goldSpin: boolean;
  terminal: boolean;
  onCrazy: (v: boolean) => void;
  onJackpot: (v: boolean) => void;
  onGoldSpin: (v: boolean) => void;
  onTerminal: (v: boolean) => void;
}) {
  const items = [
    { key: "crazy", label: "Crazy Mode", desc: "Lowest total wins instead of highest", icon: Shuffle, value: crazy, set: onCrazy, color: "#f97316" },
    { key: "jackpot", label: "Jackpot Mode", desc: "Ticket-weighted spin decides the winner", icon: Coins, value: jackpot, set: onJackpot, color: "#facc15" },
    { key: "terminal", label: "Terminal Mode", desc: "Only the LAST case decides the winner", icon: Flag, value: terminal, set: onTerminal, color: "#f472b6" },
    { key: "gold", label: "Gold Spin", desc: "Rare pulls trigger a bonus gold reel", icon: Sparkles, value: goldSpin, set: onGoldSpin, color: "#fbbf24" },
  ];
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Modifiers</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => {
              sound.click();
              it.set(!it.value);
            }}
            className={clsx(
              "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 ease-out active:scale-[0.97]",
              it.value ? "border-white/20 bg-white/10" : "border-white/10 bg-bg-800/60 hover:-translate-y-0.5 hover:bg-white/5",
            )}
          >
            <it.icon className="mt-0.5 h-4 w-4 shrink-0 transition-colors duration-150" style={{ color: it.value ? it.color : "#64748b" }} />
            <span>
              <span className="block text-sm font-semibold text-white">{it.label}</span>
              <span className="block text-[11px] text-slate-500">{it.desc}</span>
            </span>
            <span
              className="relative ml-auto inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200"
              style={{ backgroundColor: it.value ? it.color : "rgba(255,255,255,0.12)" }}
            >
              <span
                className={clsx(
                  "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-out",
                  it.value ? "translate-x-[18px]" : "translate-x-0.5",
                )}
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
