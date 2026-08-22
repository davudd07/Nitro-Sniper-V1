import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Palette, RotateCcw, Search, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import { ITEM_LIST } from "../../data/items";
import { ItemIcon } from "../ui/ItemIcon";
import { CaseThumb } from "./CaseThumb";
import { useCommunityCaseStore } from "../../store/communityCaseStore";
import { useLoyaltyStore } from "../../store/loyaltyStore";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { requireAccount } from "../../lib/stake";
import { formatCredits, formatPercent, formatRakeback, formatXp } from "../../lib/format";
import { sound } from "../../lib/sound";
import {
  CASE_COLOR_PRESETS,
  COMMUNITY_COMMISSION_OF_EDGE,
  COMMUNITY_MAX_DESIGN_ITEMS,
  COMMUNITY_MAX_ITEMS,
  COMMUNITY_NAME_MAX,
  COMMUNITY_NAME_MIN,
  canCreateCommunityCase,
  chanceSumPct,
  chancesAreHundred,
  communityCasePrice,
  communityCommissionPerOpen,
  communityCreateRequirement,
  communityHouseEdge,
  communityHouseTake,
  communityNameIssue,
  hydrateCommunityCase,
  itemEv,
  riskFromEntries,
  type CommunityOddsInput,
} from "../../lib/communityCases";
import type { Case } from "../../data/cases";

type PriceSort = "low" | "high" | "name";

export function CreateCommunityCaseModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const push = useToastStore((s) => s.push);
  const createCase = useCommunityCaseStore((s) => s.createCase);
  const session = useAuthStore((s) => s.session);
  const xpByUser = useLoyaltyStore((s) => s.xpByUser);
  const tiers = useLoyaltyStore((s) => s.config.tiers);
  const houseEdges = useLoyaltyStore((s) => s.config.houseEdges);
  const lifetimeXp = useMemo(() => useLoyaltyStore.getState().lifetimeXp(), [xpByUser, session]);
  const req = communityCreateRequirement(tiers);
  const unlocked = canCreateCommunityCase(lifetimeXp, tiers);
  const houseEdge = communityHouseEdge(houseEdges);

  const [itemsOpen, setItemsOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PriceSort>("low");
  const [entries, setEntries] = useState<CommunityOddsInput[]>([]);
  const [designIds, setDesignIds] = useState<string[]>([]);
  const [colorId, setColorId] = useState(CASE_COLOR_PRESETS[0]!.id);
  const [name, setName] = useState("");

  const color = CASE_COLOR_PRESETS.find((c) => c.id === colorId) ?? CASE_COLOR_PRESETS[0]!;
  const selected = new Set(entries.map((e) => e.itemId));
  const sumPct = chanceSumPct(entries);
  const hundred = chancesAreHundred(entries);
  const ev = itemEv(entries);
  const price = communityCasePrice(ev, houseEdge);
  const houseTake = communityHouseTake(price, houseEdge);
  const commission = communityCommissionPerOpen(price, houseEdge);
  const nameIssue = name.trim() ? communityNameIssue(name) : "Enter a case name.";

  const catalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = ITEM_LIST.filter((item) => !q || item.name.toLowerCase().includes(q) || item.id.includes(q));
    const next = [...list];
    if (sort === "name") next.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "high") next.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    else next.sort((a, b) => a.value - b.value || a.name.localeCompare(b.name));
    return next;
  }, [query, sort]);

  const preview: Case | null = useMemo(() => {
    if (entries.length === 0) {
      return {
        id: "preview",
        name: name.trim() || "Untitled case",
        price: price || 1,
        blurb: "Community case preview",
        from: color.from,
        to: color.to,
        targetRtp: 0,
        risk: "medium",
        raw: [],
        odds: [],
        ev: 0,
        rtp: 0,
        houseEdge,
        community: true,
        designItemIds: designIds,
        creatorName: session ?? "You",
      };
    }
    return hydrateCommunityCase({
      id: "preview",
      name: name.trim() || "Untitled case",
      price: price || 1,
      ev,
      houseEdge,
      commissionRate: COMMUNITY_COMMISSION_OF_EDGE,
      risk: riskFromEntries(entries),
      blurb: "Community case preview",
      from: color.from,
      to: color.to,
      creatorId: session ?? "you",
      creatorName: session ?? "You",
      createdAt: Date.now(),
      designItemIds: designIds,
      entries,
    });
  }, [entries, name, price, ev, houseEdge, color.from, color.to, designIds, session]);

  if (!open) return null;

  function addItem(itemId: string) {
    if (selected.has(itemId) || entries.length >= COMMUNITY_MAX_ITEMS) return;
    sound.click();
    setEntries((prev) => [...prev, { itemId, chancePct: 0 }]);
  }

  function removeItem(itemId: string) {
    sound.click();
    setEntries((prev) => prev.filter((e) => e.itemId !== itemId));
    setDesignIds((prev) => prev.filter((id) => id !== itemId));
  }

  function setChance(itemId: string, chancePct: number) {
    setEntries((prev) => prev.map((e) => (e.itemId === itemId ? { ...e, chancePct } : e)));
  }

  function toggleDesign(itemId: string) {
    sound.click();
    setDesignIds((prev) => {
      if (prev.includes(itemId)) return prev.filter((id) => id !== itemId);
      if (prev.length >= COMMUNITY_MAX_DESIGN_ITEMS) return prev;
      return [...prev, itemId];
    });
  }

  function handleCreate() {
    if (!requireAccount()) return;
    if (!unlocked) {
      push(`Reach level ${req.rank} (${req.tier.name} VIP) to create a community case.`, "warning");
      return;
    }
    const result = createCase({
      name,
      from: color.from,
      to: color.to,
      designItemIds: designIds,
      entries,
    });
    if (!result.ok) {
      push(result.error, "danger");
      return;
    }
    sound.click();
    push("Community case published.", "success");
    onCreated?.(result.id);
    onClose();
  }

  const canSubmit = unlocked && !nameIssue && hundred && entries.length > 0 && price > 0 && Boolean(session);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-3 sm:p-6" onClick={onClose}>
      <div
        className="surface my-4 w-full max-w-5xl overflow-hidden bg-[#101810] p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Create Case</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Same economics as official cases: price covers item EV plus the {formatPercent(houseEdge)} house edge. You
              earn {formatPercent(COMMUNITY_COMMISSION_OF_EDGE)} of that house-edge take on each paid open — not{" "}
              {formatPercent(COMMUNITY_COMMISSION_OF_EDGE)} of the pot, and not extra rake stacked on the player.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!unlocked && (
          <div className="mb-4 rounded-xl border-2 border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Level {req.rank} required to create. That is VIP {req.tier.name} ({formatXp(req.minXp)} lifetime XP). You have{" "}
            {formatXp(lifetimeXp)} XP.
          </div>
        )}

        <div className="max-h-[72vh] space-y-4 overflow-y-auto scrollbar-thin pr-1">
          <section className="overflow-hidden rounded-xl border border-[#3d5a3a]/60 bg-black/25">
            <button
              type="button"
              onClick={() => {
                sound.click();
                setItemsOpen((v) => !v);
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-bold uppercase tracking-wide text-white">
                Items available [{entries.length}/{COMMUNITY_MAX_ITEMS}]
              </span>
              <ChevronDown className={clsx("h-4 w-4 text-slate-400 transition-transform", itemsOpen && "rotate-180")} />
            </button>
            {itemsOpen && (
              <div className="space-y-3 border-t border-white/8 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search items"
                      className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    Sort
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as PriceSort)}
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs font-semibold text-white"
                    >
                      <option value="low">Price: Low to High</option>
                      <option value="high">Price: High to Low</option>
                      <option value="name">Name A–Z</option>
                    </select>
                  </label>
                </div>
                <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {catalog.map((item) => {
                    const on = selected.has(item.id);
                    const full = !on && entries.length >= COMMUNITY_MAX_ITEMS;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={full}
                        onClick={() => (on ? removeItem(item.id) : addItem(item.id))}
                        className={clsx(
                          "flex items-center gap-2 rounded-xl border px-2 py-2 text-left transition-colors disabled:opacity-40",
                          on ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-black/20 hover:border-white/25",
                        )}
                      >
                        <ItemIcon icon={item.icon} rarity={item.rarity} size="sm" lite />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-white">{item.name}</span>
                          <span className="block font-mono text-[11px] text-slate-400">{formatCredits(item.value)} SH</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#3d5a3a]/60 bg-black/25 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">Item chances</h3>
              <span
                className={clsx(
                  "rounded-full px-3 py-1 font-mono text-xs font-bold",
                  hundred ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/15 text-amber-100",
                )}
              >
                {sumPct.toFixed(4)}%
              </span>
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-slate-500">Pick items above, then set each chance so the total is 100.0000%.</p>
            ) : (
              <div className="space-y-1.5">
                {entries.map((e) => {
                  const item = ITEM_LIST.find((i) => i.id === e.itemId);
                  if (!item) return null;
                  return (
                    <div key={e.itemId} className="flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5">
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => removeItem(e.itemId)}
                        className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ItemIcon icon={item.icon} rarity={item.rarity} size="sm" lite />
                      <span className="min-w-0 flex-1 truncate text-sm text-white">{item.name}</span>
                      <span className="hidden font-mono text-xs text-slate-400 sm:inline">{formatCredits(item.value)} SH</span>
                      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Chance %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.0001}
                          value={Number.isFinite(e.chancePct) ? e.chancePct : 0}
                          onChange={(ev) => setChance(e.itemId, Number(ev.target.value))}
                          className="w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-sm text-white outline-none focus:border-emerald-400/40"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeItem(e.itemId)}
                        className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-white sm:hidden"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#3d5a3a]/60 bg-black/25 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">Style your case</h3>
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {designIds.length}/{COMMUNITY_MAX_DESIGN_ITEMS} selected
              </span>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                <Palette className="h-3.5 w-3.5" /> Choose color
              </span>
              {CASE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.id}
                  onClick={() => {
                    sound.click();
                    setColorId(preset.id);
                  }}
                  className={clsx("h-8 w-8 rounded-full border-2", colorId === preset.id ? "border-white" : "border-white/20")}
                  style={{ background: `linear-gradient(160deg, ${preset.from}, ${preset.to})` }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  setColorId(CASE_COLOR_PRESETS[0]!.id);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-300 hover:bg-white/5"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>

            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Design items — pick up to {COMMUNITY_MAX_DESIGN_ITEMS} from the case
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {entries.length === 0 ? (
                <p className="text-sm text-slate-500">Add items first, then choose which appear on the case art.</p>
              ) : (
                entries.map((e) => {
                  const item = ITEM_LIST.find((i) => i.id === e.itemId);
                  if (!item) return null;
                  const on = designIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleDesign(item.id)}
                      className={clsx(
                        "flex items-center gap-2 rounded-xl border px-2 py-1.5",
                        on ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-black/20",
                      )}
                    >
                      <ItemIcon icon={item.icon} rarity={item.rarity} size="sm" lite />
                      <span className="text-xs text-white">{item.name}</span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Case name ({COMMUNITY_NAME_MIN}–{COMMUNITY_NAME_MAX})
                </span>
                <input
                  value={name}
                  maxLength={COMMUNITY_NAME_MAX}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prism Cache"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
                />
                {nameIssue && name.trim() ? <p className="mt-1 text-xs text-amber-200">{nameIssue}</p> : null}
              </label>
              {preview && <CaseThumb c={preview} className="h-28 rounded-2xl" />}
            </div>

            <div className="mt-5 space-y-3 border-t border-white/8 pt-4">
              <div className="grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                <p>
                  Item EV <span className="font-mono text-white">{formatCredits(ev)} SH</span>
                </p>
                <p>
                  House edge <span className="font-mono text-white">{formatPercent(houseEdge)}</span>
                </p>
                <p>
                  House take <span className="font-mono text-white">{formatRakeback(houseTake)} SH</span>
                </p>
                <p>
                  Your commission ({formatPercent(COMMUNITY_COMMISSION_OF_EDGE)} of edge){" "}
                  <span className="font-mono text-emerald-200">{formatRakeback(commission)} SH / paid open</span>
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Price is solved from EV the same way official cases are: EV stays below price by ~{formatPercent(houseEdge)}.
                Demo 0-stakes and battle replays do not pay commission.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-lg font-bold text-white">
                  Price: {price > 0 ? `${formatCredits(price)} SH` : "—"}
                </p>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleCreate}
                  className="btn-primary px-6 py-2.5 disabled:opacity-40"
                >
                  Create Case
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
