import { useEffect, useState, type FormEvent } from "react";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { BrandMark } from "../layout/BrandMark";
import { applySignupReferral } from "../../lib/signupBonus";
import { sound } from "../../lib/sound";

export function AccountGate() {
  const open = useAuthStore((s) => s.gateOpen);
  const closeGate = useAuthStore((s) => s.closeGate);
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);
  const session = useAuthStore((s) => s.session);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    const prompt = () => useAuthStore.getState().promptOnce();
    const unsub = useAuthStore.persist.onFinishHydration(prompt);
    if (useAuthStore.persist.hasHydrated()) prompt();
    return unsub;
  }, []);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("ref") ?? "";
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open || session) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const err =
        mode === "register" ? await register(username, password, email, referral) : await login(username, password);
      if (err) {
        setError(err);
        sound.lose();
        return;
      }
      if (mode === "register") {
        const result = applySignupReferral(referral);
        if (result.bonus > 0) {
          push(`Referral ${result.code?.toUpperCase()} — ${result.bonus} WL signup bonus credited.`, "success");
        } else if (result.attributed) {
          push(`Referral ${result.code?.toUpperCase()} linked to this account.`, "success");
        } else if (result.unknown) {
          push("That referral code isn’t recognized. You can still play.", "info");
        }
      }
      sound.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <form onSubmit={(e) => void submit(e)} className="surface w-full max-w-md p-6">
        <div className="mb-4 flex items-center gap-3">
          <BrandMark size={44} />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">SeedBET</p>
            <h2 className="text-xl font-extrabold text-white">{mode === "register" ? "Create username" : "Sign in"}</h2>
          </div>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-400">
          Create a username before demo or World Lock bets. Play-money only — this login stays on this browser.
        </p>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Username</label>
        <input
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-3 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-emerald-400/40"
        />
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Password</label>
        <input
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-1 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-emerald-400/40"
        />
        <p className="mb-3 text-[10px] text-slate-500">At least 8 characters, one uppercase letter, and one number.</p>
        {mode === "register" && (
          <>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Email <span className="font-medium normal-case tracking-normal text-slate-600">(optional)</span>
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-emerald-400/40"
            />
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Referral code <span className="font-medium normal-case tracking-normal text-slate-600">(optional)</span>
            </label>
            <input
              autoComplete="off"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              placeholder="WELCOME / LOCK100 / friend’s code"
              className="mb-1 w-full rounded-md border-2 border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm uppercase text-white outline-none placeholder:normal-case placeholder:text-slate-600 focus:border-emerald-400/40"
            />
            <p className="mb-3 text-[10px] text-slate-500">Some codes credit a World Lock signup bonus (WELCOME, ZAPP, LOCK100 = 100 WL).</p>
          </>
        )}
        {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={busy || !username || !password} className="btn-primary w-full py-2.5 text-sm disabled:opacity-40">
          {busy ? "Working…" : mode === "register" ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError("");
            sound.click();
          }}
          className="mt-3 w-full text-center text-xs font-semibold text-emerald-300 hover:text-emerald-200"
        >
          {mode === "register" ? "Already have a username? Sign in" : "New here? Create a username"}
        </button>
        <button
          type="button"
          onClick={() => {
            sound.click();
            closeGate();
          }}
          className="mt-2 w-full text-center text-[11px] text-slate-500 hover:text-slate-300"
        >
          Browse without betting
        </button>
      </form>
    </div>
  );
}
