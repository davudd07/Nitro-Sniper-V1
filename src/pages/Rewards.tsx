import { useEffect, useState } from "react";
import { Gift, Sparkles, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useChatStore, CHAT_RAIN_PRIZE, CHAT_RAIN_WINNERS } from "../store/chatStore";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { formatCredits, formatPercent, formatRakeback } from "../lib/format";
import { RAKEBACK_OF_EDGE } from "../lib/rakeback";
import { sound } from "../lib/sound";

function formatRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function Rewards() {
  const nextRainAt = useChatStore((s) => s.nextRainAt);
  const lastRainWinners = useChatStore((s) => s.lastRainWinners);
  const totalRakeback = useEconomyStore((s) => s.totalRakeback);
  const pendingRakeback = useEconomyStore((s) => s.pendingRakeback);
  const claimRakeback = useEconomyStore((s) => s.claimRakeback);
  const push = useToastStore((s) => s.push);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remain = nextRainAt - now;
  const pending = pendingRakeback ?? 0;
  const canClaim = pending > 0;

  function handleClaim() {
    const amt = claimRakeback();
    if (amt <= 0) {
      push("Nothing to claim yet — play a real stake first.", "info");
      return;
    }
    sound.click();
    push(`Claimed ${formatRakeback(amt)} SH rakeback.`, "success");
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-400/20 via-[#152018] to-[#0c1410] p-6 shadow-[0_0_40px_rgba(250,204,21,0.12)]">
        <Sparkles className="absolute -right-4 -top-4 h-28 w-28 text-amber-300/20" />
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-xl border-2 border-amber-300 bg-amber-400 text-bg-950 shadow-[4px_4px_0_#78350f]">
            <Gift className="h-8 w-8" />
          </div>
          <div>
            <h1 className="pixel-label text-3xl font-extrabold uppercase text-amber-200">Rewards</h1>
            <p className="text-sm text-amber-100/70">Claim rakeback in Shards · chat rain every 30 minutes — join in the last 60 seconds</p>
          </div>
        </div>
      </div>

      <div className="surface p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Available to claim</p>
        <p className="mt-2 font-mono text-3xl font-black text-cyan-300">{formatRakeback(pending)} SH</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Real stakes (bet &gt; 0) earn {formatPercent(RAKEBACK_OF_EDGE)} of the house-edge slice as Shards. It sits
          here until you claim it. A 100 SH mines bet (4% edge) earns {formatRakeback(100 * 0.04 * 0.04)} SH. Demo
          bets (0) earn none.
        </p>
        <button
          type="button"
          disabled={!canClaim}
          onClick={handleClaim}
          className="btn-primary mt-4 px-6 py-2.5 text-sm"
        >
          {canClaim ? `Claim ${formatRakeback(pending)} SH` : "Nothing to claim"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Lifetime claimed</p>
          <p className="mt-2 font-mono text-3xl font-black text-emerald-300">{formatCredits(totalRakeback ?? 0)} SH</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Total rakeback you have already moved into your Shard balance from this page.
          </p>
        </div>
        <div className="surface p-5">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Next chat rain
          </p>
          <p className="mt-2 font-mono text-3xl font-black text-amber-300">{formatRemain(remain)}</p>
          <p className="mt-2 text-xs text-slate-400">
            Join in the last 60 seconds. Up to {CHAT_RAIN_WINNERS} winners are picked from who joined, {CHAT_RAIN_PRIZE} SH
            each. If you didn’t join, you cannot win. Hits credit instantly.
          </p>
        </div>
      </div>

      {lastRainWinners.length > 0 && (
        <div className="surface p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Last rain winners</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {lastRainWinners.map((n) => (
              <span
                key={n}
                className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-sm font-semibold text-amber-100"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link to="/" className="text-sm text-slate-400 hover:text-white">
        ← Back to lobby
      </Link>
    </div>
  );
}
