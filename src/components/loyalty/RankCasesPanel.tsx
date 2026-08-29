import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { Eye, Gift, KeyRound, Lock } from "lucide-react";
import { getCase } from "../../data/cases";
import { CaseThumb } from "../cases/CaseThumb";
import { CashAmount } from "../ui/CurrencyIcon";
import { VolatilitySlider } from "../ui/VolatilitySlider";
import { formatDropCountdown } from "../../lib/xp";
import {
  KEY_BANDS,
  KEY_BAND_COLOR,
  KEY_BAND_LABEL,
  dailyCaseId,
  keyBandForRankId,
  keyCaseId,
  type DailyVolatility,
} from "../../lib/rankRewards";
import { sortedTiers, type VipTier } from "../../lib/loyalty";
import { sound } from "../../lib/sound";
import { useRankRewardStore } from "../../store/rankRewardStore";

const VOL_STORAGE_KEY = "prism-daily-case-vol";

function readStoredVol(): DailyVolatility {
  try {
    const raw = sessionStorage.getItem(VOL_STORAGE_KEY);
    if (raw === "low" || raw === "medium" || raw === "high") return raw;
  } catch {
    /* ignore */
  }
  return "medium";
}

export function RankCasesPanel({
  tiers,
  currentId,
  lifetimeXp,
}: {
  tiers: VipTier[];
  currentId: string;
  lifetimeXp: number;
}) {
  const list = sortedTiers(tiers);
  const keys = useRankRewardStore((s) => s.keys);
  const dailyClaimedAt = useRankRewardStore((s) => s.dailyClaimedAt);
  const keyOpenedAt = useRankRewardStore((s) => s.keyOpenedAt);
  const dailyReadyAt = useRankRewardStore((s) => s.dailyReadyAt);
  const keyReadyAt = useRankRewardStore((s) => s.keyReadyAt);
  const [now, setNow] = useState(() => Date.now());
  const [volatility, setVolatility] = useState<DailyVolatility>(readStoredVol);
  void dailyClaimedAt;
  void keyOpenedAt;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  function selectVol(next: DailyVolatility) {
    setVolatility(next);
    try {
      sessionStorage.setItem(VOL_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Rank cases</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
          Every rank has a free daily case (24h cooldown). Pick Low, Medium, or High volatility — one claim per rank
          per day. Rank-ups grant a key for that new band. Key cases sit on a 2 hour cooldown. Locked ranks still
          preview and demo.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {KEY_BANDS.map((band) => {
          const c = getCase(keyCaseId(band));
          const have = keys[band] ?? 0;
          const ready = keyReadyAt(band);
          const waiting = now < ready && have > 0;
          return (
            <article
              key={band}
              className="flex flex-col rounded-xl border-2 border-white/10 bg-[#0c1414] p-3 shadow-[3px_3px_0_#050808]"
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                {KEY_BAND_LABEL[band]} key
              </p>
              <p className="mt-1 font-mono text-lg font-bold" style={{ color: KEY_BAND_COLOR[band] }}>
                ×{have}
              </p>
              {c ? (
                waiting ? (
                  <p className="mt-2 text-[11px] text-slate-500">{formatDropCountdown(ready - now)}</p>
                ) : have > 0 ? (
                  <Link
                    to={`/cases/${c.id}`}
                    onClick={() => sound.click()}
                    className="mt-2 inline-flex items-center justify-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-amber-100 hover:bg-amber-400/20"
                  >
                    <KeyRound className="h-3 w-3" /> Open
                  </Link>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-600">Rank up to earn</p>
                )
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0c1414] px-4 py-3">
        <VolatilitySlider value={volatility} onChange={selectVol} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((tier) => {
          const unlocked = lifetimeXp >= tier.minXp;
          const current = tier.id === currentId;
          const c = getCase(dailyCaseId(tier.id, volatility));
          const ready = dailyReadyAt(tier.id);
          const cooling = now < ready;
          const band = keyBandForRankId(tier.id);
          const href = c ? `/cases/${c.id}` : `/cases/${dailyCaseId(tier.id, volatility)}`;
          return (
            <article
              key={tier.id}
              className={clsx(
                "relative overflow-hidden rounded-xl border-2 bg-[#0c1414] p-4 shadow-[3px_3px_0_#050808]",
                current ? "border-cyan-200/55" : unlocked ? "border-[#4af1f1]/45" : "border-white/10 opacity-80",
              )}
            >
              <div className="flex items-start gap-3">
                {c ? <CaseThumb c={c} size="list" className="h-14 w-14 rounded-lg ring-1 ring-black/40" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                    {tier.name} daily
                  </p>
                  <p className="truncate text-sm font-semibold text-white">{c?.name ?? "Daily case"}</p>
                  {c ? (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Avg <CashAmount wl={c.ev} iconClassName="h-3 w-3" />
                    </p>
                  ) : null}
                </div>
              </div>
              {band ? (
                <p className="mt-2 text-[11px] text-slate-400">
                  Rank-up key: <span style={{ color: KEY_BAND_COLOR[band] }}>{KEY_BAND_LABEL[band]}</span>
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">No key at Unranked — first key is Silver 1.</p>
              )}
              {unlocked && c ? (
                cooling ? (
                  <div className="mt-3 space-y-2">
                    <p className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-400">
                      {formatDropCountdown(ready - now)}
                    </p>
                    <Link
                      to={href}
                      onClick={() => sound.click()}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:bg-white/5"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </Link>
                  </div>
                ) : (
                  <Link
                    to={href}
                    onClick={() => sound.click()}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full border-2 border-lime-300/50 bg-gradient-to-b from-lime-400 to-green-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-[#052e16] shadow-[0_3px_0_#14532d]"
                  >
                    <Gift className="h-3.5 w-3.5" /> Open daily
                  </Link>
                )
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    <Lock className="h-3.5 w-3.5" /> Locked
                  </p>
                  <Link
                    to={href}
                    onClick={() => sound.click()}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-100 hover:bg-cyan-400/20"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview / demo
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
