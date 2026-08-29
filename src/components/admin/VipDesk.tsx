import { useState } from "react";
import { clsx } from "clsx";
import { Crown, Flame, Plus, Trash2 } from "lucide-react";
import { Switch } from "../ui/Switch";
import { formatPercent, formatXp, shortId } from "../../lib/format";
import {
  LOYALTY_GAMES,
  XP_CATEGORIES,
  XP_CATEGORY_LABELS,
  normalizeVipTier,
  type VipTier,
} from "../../lib/loyalty";
import { useLoyaltyStore } from "../../store/loyaltyStore";
import { sound } from "../../lib/sound";
import { useToastStore } from "../../store/toastStore";

export function VipDesk() {
  const config = useLoyaltyStore((s) => s.config);
  const setMode = useLoyaltyStore((s) => s.setMode);
  const setFlatRate = useLoyaltyStore((s) => s.setFlatRate);
  const setCategoryMultiplier = useLoyaltyStore((s) => s.setCategoryMultiplier);
  const setHouseEdge = useLoyaltyStore((s) => s.setHouseEdge);
  const setTiers = useLoyaltyStore((s) => s.setTiers);
  const addBoost = useLoyaltyStore((s) => s.addBoost);
  const clearBoost = useLoyaltyStore((s) => s.clearBoost);
  const boosts = useLoyaltyStore((s) => s.boosts);
  const push = useToastStore((s) => s.push);
  const [boostMul, setBoostMul] = useState(2);
  const [boostHours, setBoostHours] = useState(1);
  const [boostReason, setBoostReason] = useState("Happy hour");
  const houseEdgeMode = config.mode === "house_edge";

  function saveTiers(next: VipTier[]) {
    setTiers(next.map((t) => normalizeVipTier(t)));
    sound.click();
    push("VIP tiers saved.", "success");
  }

  return (
    <div className="space-y-4">
      <div className="surface p-5">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <Crown className="h-3.5 w-3.5" /> XP calculation
        </p>
        <p className="mb-4 text-xs text-slate-500">
          World Lock wagers only. Shards and demo (0) stakes never grant XP. XP scales with the amount bet and
          the game's house edge (1 − RTP), so high-RTP tables rank up slower than high-edge games.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={clsx("text-sm font-semibold", !houseEdgeMode ? "text-white" : "text-slate-500")}>
            Flat rate
          </span>
          <Switch checked={houseEdgeMode} onChange={(on) => setMode(on ? "house_edge" : "flat")} />
          <span className={clsx("text-sm font-semibold", houseEdgeMode ? "text-white" : "text-slate-500")}>
            House-edge
          </span>
        </div>
        <p className="mt-3 font-mono text-xs text-slate-400">
          {houseEdgeMode
            ? "XP = wager × (1 − RTP) × category_multiplier  ·  RTP = 1 − house edge"
            : "XP = wager × category_rate (originals default 0.04 / 1 WL)"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Flat rates (XP / 1 WL)</p>
          <div className="space-y-2">
            {XP_CATEGORIES.map((cat) => (
              <RateRow
                key={cat}
                label={XP_CATEGORY_LABELS[cat]}
                value={config.flatRates[cat]}
                onChange={(n) => setFlatRate(cat, n)}
              />
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            House-edge category multipliers
          </p>
          <div className="space-y-2">
            {XP_CATEGORIES.map((cat) => (
              <RateRow
                key={cat}
                label={XP_CATEGORY_LABELS[cat]}
                value={config.categoryMultipliers[cat]}
                onChange={(n) => setCategoryMultiplier(cat, n)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="surface p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Per-game house edge (house-edge mode)
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LOYALTY_GAMES.map((g) => (
            <label key={g.id} className="flex items-center justify-between gap-2 rounded-md bg-black/25 px-2.5 py-2">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{g.label}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">{XP_CATEGORY_LABELS[g.category]}</span>
              </span>
              <input
                type="number"
                min={0}
                step={0.0001}
                value={config.houseEdges[g.id] ?? g.houseEdge}
                onChange={(e) => setHouseEdge(g.id, Number(e.target.value) || 0)}
                className="w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-right font-mono text-xs text-white outline-none focus:border-cyan-400/40"
              />
            </label>
          ))}
        </div>
      </div>

      <TierEditor tiers={config.tiers} onSave={saveTiers} />

      <div className="surface p-5">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <Flame className="h-3.5 w-3.5" /> Temporary XP boost
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Multiplier
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={boostMul}
              onChange={(e) => setBoostMul(Math.max(0.1, Number(e.target.value) || 1))}
              className="mt-1 block w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-sm text-white outline-none"
            />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Hours
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={boostHours}
              onChange={(e) => setBoostHours(Math.max(0.1, Number(e.target.value) || 1))}
              className="mt-1 block w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-sm text-white outline-none"
            />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Reason
            <input
              value={boostReason}
              onChange={(e) => setBoostReason(e.target.value)}
              className="mt-1 block w-48 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none"
            />
          </label>
          <button
            type="button"
            className="btn-primary px-3 py-2 text-xs"
            onClick={() => {
              addBoost({
                userId: "*",
                multiplier: boostMul,
                extraXpPerWager: 0,
                startsAt: Date.now(),
                endsAt: Date.now() + boostHours * 3_600_000,
                reason: boostReason.trim() || "XP boost",
              });
              sound.click();
              push(`Global ${boostMul}× XP boost for ${boostHours}h.`, "success");
            }}
          >
            Start boost
          </button>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
          {boosts.filter((b) => b.endsAt > Date.now()).length === 0 ? (
            <li className="text-slate-500">No active boosts.</li>
          ) : (
            boosts
              .filter((b) => b.endsAt > Date.now())
              .map((b) => (
                <li key={b.id} className="flex items-center justify-between rounded-md bg-black/25 px-2 py-1.5">
                  <span>
                    {b.multiplier}× · {b.reason} · until {new Date(b.endsAt).toLocaleTimeString()}
                  </span>
                  <button type="button" className="text-rose-300" onClick={() => clearBoost(b.id)}>
                    End
                  </button>
                </li>
              ))
          )}
        </ul>
      </div>
    </div>
  );
}

function RateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        type="number"
        min={0}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-28 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-right font-mono text-sm text-white outline-none focus:border-cyan-400/40"
      />
    </label>
  );
}

function TierEditor({ tiers, onSave }: { tiers: VipTier[]; onSave: (tiers: VipTier[]) => void }) {
  const [draft, setDraft] = useState<VipTier[]>(() => tiers.map((t) => ({ ...t })));

  function update(i: number, patch: Partial<VipTier>) {
    setDraft((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">VIP tiers & benefits</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Default ladder: Unranked → Emperor. Silver is close; Sapphire–Emperor sit much farther. Min XP,
            rakeback, and rank drops are editable.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] font-bold uppercase text-slate-300"
            onClick={() =>
              setDraft((prev) => [
                ...prev,
                {
                  id: shortId("tier"),
                  name: "New tier",
                  minXp: (prev[prev.length - 1]?.minXp ?? 0) + 10_000,
                  color: "#67e8f9",
                  benefits: "Describe the benefit.",
                  rakebackBonusPct: 0,
                  rankDropSh: 0,
                  cosmetic: "",
                },
              ])
            }
          >
            <Plus className="h-3 w-3" /> Tier
          </button>
          <button type="button" className="btn-primary px-3 py-1 text-[11px]" onClick={() => onSave(draft)}>
            Save tiers
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {draft.map((t, i) => (
          <div key={t.id} className="rounded-md border border-white/8 bg-black/20 p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <input
                value={t.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none sm:col-span-2 xl:col-span-1"
              />
              <label className="text-[10px] uppercase tracking-wide text-slate-500">
                Min XP
                <input
                  type="number"
                  min={0}
                  value={t.minXp}
                  onChange={(e) => update(i, { minXp: Math.max(0, Number(e.target.value) || 0) })}
                  className="mt-0.5 block w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-sm text-white outline-none"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wide text-slate-500">
                Rakeback bonus
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={t.rakebackBonusPct}
                  onChange={(e) => update(i, { rakebackBonusPct: Math.max(0, Number(e.target.value) || 0) })}
                  className="mt-0.5 block w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-sm text-white outline-none"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wide text-slate-500">
                Rank drop SH
                <input
                  type="number"
                  min={0}
                  value={t.rankDropSh ?? 0}
                  onChange={(e) => update(i, { rankDropSh: Math.max(0, Number(e.target.value) || 0) })}
                  className="mt-0.5 block w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-sm text-white outline-none"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wide text-slate-500">
                Color
                <input
                  value={t.color}
                  onChange={(e) => update(i, { color: e.target.value })}
                  className="mt-0.5 block w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-sm text-white outline-none"
                />
              </label>
            </div>
            <input
              value={t.cosmetic ?? ""}
              onChange={(e) => update(i, { cosmetic: e.target.value })}
              placeholder="Cosmetic title"
              className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none"
            />
            <div className="mt-2 flex gap-2">
              <input
                value={t.benefits}
                onChange={(e) => update(i, { benefits: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none"
              />
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-md border border-rose-400/30 text-rose-300"
                onClick={() => setDraft((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={draft.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-600">
              {formatXp(t.minXp)} XP · Instant/Daily +{formatPercent(t.rakebackBonusPct)}
              {t.rankDropSh > 0 ? ` · ${t.rankDropSh} SH drop` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
