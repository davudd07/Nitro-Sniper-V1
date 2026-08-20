import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Check } from "lucide-react";
import { useDemoProfileStore } from "../../store/demoProfileStore";
import { sound } from "../../lib/sound";
import { VaultHeroArt } from "./VaultHeroArt";

export function HomeHero() {
  const displayName = useDemoProfileStore((s) => s.displayName);
  const setDisplayName = useDemoProfileStore((s) => s.setDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);

  function saveName() {
    setDisplayName(draft);
    setEditing(false);
    sound.click();
  }

  return (
    <section className="relative overflow-hidden rounded-xl border-2 border-[#3d5a3a]/70 bg-gradient-to-br from-[#163326] via-[#0c1612] to-[#07100c] p-5 shadow-[6px_6px_0_#050805] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300/90">Welcome back,</p>
          {editing ? (
            <form
              className="mt-1 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveName();
              }}
            >
              <input
                autoFocus
                value={draft}
                maxLength={24}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full max-w-xs rounded-md border-2 border-cyan-400/40 bg-black/30 px-3 py-1.5 font-display text-3xl font-extrabold tracking-tight text-white outline-none sm:text-5xl"
                aria-label="Display name"
              />
              <button type="submit" className="grid h-10 w-10 place-items-center rounded-md border-2 border-cyan-400/40 bg-cyan-400/15 text-cyan-200" aria-label="Save name">
                <Check className="h-5 w-5" />
              </button>
            </form>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <h1 className="pixel-label text-4xl font-extrabold uppercase tracking-wide text-white sm:text-5xl">
                {displayName}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setDraft(displayName);
                  setEditing(true);
                  sound.click();
                }}
                className="grid h-8 w-8 place-items-center rounded-md border border-white/15 text-slate-400 hover:text-white"
                aria-label="Edit display name"
                title="Edit display name"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
            Play-money Prism Vault — provably fair tables, original cases, and Shards that never leave this demo.
          </p>
          <Link to="/rewards" className="btn-cyan mt-5 px-5 py-2.5 text-sm" onClick={() => sound.click()}>
            Claim daily rewards
          </Link>
        </div>
        <VaultHeroArt />
      </div>
    </section>
  );
}
