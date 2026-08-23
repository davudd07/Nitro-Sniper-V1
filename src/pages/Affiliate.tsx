import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, Users } from "lucide-react";
import { useDemoProfileStore } from "../store/demoProfileStore";
import { formatFunCoins } from "../lib/format";
import { sound } from "../lib/sound";
import { useToastStore } from "../store/toastStore";

const DEMO_CUT = 0.05;

function inviteCode(name: string): string {
  const slug = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12) || "VAULTBOUND";
  return `PV-${slug}`;
}

export function Affiliate() {
  const displayName = useDemoProfileStore((s) => s.displayName);
  const code = useMemo(() => inviteCode(displayName), [displayName]);
  const push = useToastStore((s) => s.push);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      sound.click();
      push("Invite code copied — still play-money only.", "success");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      push("Could not copy. Select the code instead.", "warning");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="relative overflow-hidden rounded-xl border-2 border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 via-[#102020] to-[#0c1414] p-6 shadow-[4px_4px_0_#050808]">
        <Users className="absolute -right-3 -top-3 h-24 w-24 text-cyan-300/15" />
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">Demo affiliate</p>
        <h1 className="pixel-label mt-1 text-3xl font-extrabold uppercase text-white">Share the vault</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
          Invite friends into this play-money showcase. You earn a Fun Coin cut of their demo wager — never cash,
          never a withdrawal, never a real-money program.
        </p>
      </div>

      <div className="surface p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your invite code</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-md border-2 border-cyan-400/30 bg-black/30 px-3 py-2 font-mono text-lg font-bold tracking-[0.18em] text-cyan-200">
            {code}
          </code>
          <button type="button" onClick={() => void copy()} className="btn-cyan gap-1.5 px-3 py-2 text-sm">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Simulated cut: {Math.round(DEMO_CUT * 100)}% of referred demo wager, paid in Fun Coins. This page does not
          create accounts, track real users, or send payouts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Referred wager (demo)</p>
          <p className="mt-2 font-mono text-3xl font-black text-white">0 SH</p>
          <p className="mt-2 text-xs text-slate-400">No live referrals in this local demo.</p>
        </div>
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Fun Coin cut</p>
          <p className="mt-2 font-mono text-3xl font-black text-amber-300">{formatFunCoins(0)}</p>
          <p className="mt-2 text-xs text-slate-400">Accrues here as play-money only.</p>
        </div>
      </div>

      <Link to="/rewards" className="text-sm text-slate-400 hover:text-white">
        ← Rewards & rakeback
      </Link>
    </div>
  );
}
