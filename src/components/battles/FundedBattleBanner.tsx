import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Swords } from "lucide-react";
import { formatDropCountdown } from "../../lib/xp";
import { fundedTemplateLabel } from "../../lib/fundedBattle";
import { liveFundedBattleId, nextFundedSpawnAt, useFundedBattleStore } from "../../store/fundedBattleStore";
import { useBattleStore } from "../../store/battleStore";
import { sound } from "../../lib/sound";

export function FundedBattleBanner() {
  const windowStart = useFundedBattleStore((s) => s.windowStart);
  const spawnAt = useFundedBattleStore((s) => s.spawnAt);
  const spawnedWindow = useFundedBattleStore((s) => s.spawnedWindow);
  const snapshot = useFundedBattleStore((s) => s.snapshot);
  const battles = useBattleStore((s) => s.battles);
  const [now, setNow] = useState(() => Date.now());
  void windowStart;
  void spawnAt;
  void spawnedWindow;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const liveId = liveFundedBattleId();
  const live = liveId ? battles[liveId] ?? snapshot : null;
  const nextAt = nextFundedSpawnAt();
  const open = live && live.status === "open";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-emerald-400/40 bg-emerald-500/10 px-4 py-3 shadow-[3px_3px_0_#052e16]">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-200">
          <Banknote className="h-3.5 w-3.5" /> House-funded battle
        </p>
        {open && live ? (
          <p className="mt-1 text-sm text-white">
            Live {fundedTemplateLabel(live)} · 4 seats · join free
          </p>
        ) : (
          <p className="mt-1 text-sm text-emerald-50/90">Next free 4-slot battle</p>
        )}
      </div>
      {open && live ? (
        <Link
          to={`/battles/${live.id}`}
          onClick={() => sound.click()}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-300/70 bg-gradient-to-b from-emerald-300 to-emerald-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#052e16] shadow-[0_3px_0_#14532d]"
        >
          <Swords className="h-3.5 w-3.5" /> Join free
        </Link>
      ) : (
        <p className="font-mono text-xs text-emerald-200/80">{formatDropCountdown(Math.max(0, nextAt - now))}</p>
      )}
    </div>
  );
}
