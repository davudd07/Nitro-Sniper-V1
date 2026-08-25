import { Link } from "react-router-dom";
import { AvatarChangeCopy, AvatarPicker } from "../../components/identity/AvatarPicker";
import { RoleBadge } from "../../components/identity/RoleBadge";
import { useIdentityStore } from "../../store/identityStore";
import { useAuthStore } from "../../store/authStore";
import { Switch } from "../ui/Switch";
import { useDemoProfileStore } from "../../store/demoProfileStore";
import { sound } from "../../lib/sound";
import { VaultHeroArt } from "./VaultHeroArt";

export function HomeHero() {
  const session = useAuthStore((s) => s.session);
  const openGate = useAuthStore((s) => s.openGate);
  const displayName = useDemoProfileStore((s) => s.displayName);
  const anonymous = useDemoProfileStore((s) => s.anonymous);
  const setAnonymous = useDemoProfileStore((s) => s.setAnonymous);
  const name = session ?? displayName;
  const role = useIdentityStore((s) => s.roleFor("You"));

  return (
    <section className="relative overflow-hidden rounded-xl border-2 border-cyan-400/35 bg-gradient-to-br from-[#123333] via-[#0c1414] to-[#070a0a] p-5 shadow-[6px_6px_0_#050808] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/16 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div className="max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300/90">
            {session ? "Welcome back," : "Welcome,"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <AvatarPicker name="You" size={64} color="#4af1f1" />
            <div className="min-w-0">
              <h1 className="pixel-label text-4xl font-extrabold uppercase tracking-wide text-white sm:text-5xl">
                {name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <RoleBadge role={role} className="text-[10px] px-1.5 py-0.5" />
                {!session ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.click();
                      openGate();
                    }}
                    className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-200 hover:bg-emerald-400/20"
                  >
                    Create username
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                <AvatarChangeCopy />
              </p>
              <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                <Switch checked={anonymous} onChange={setAnonymous} color="#67e8f9" />
                Stay anonymous in games
              </label>
              <p className="mt-0.5 max-w-xs text-[10px] leading-relaxed text-slate-600">
                Hides your username on bets, cases, and tables. Chat still shows your name when you talk.
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
            Play-money Prism Vault — provably fair tables, original cases, and Shards that never leave this demo.
            Create a username before placing a demo or Shard bet.
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
