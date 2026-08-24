import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Heart, Plus, Wallet } from "lucide-react";
import { clsx } from "clsx";
import { CASES } from "../data/cases";
import { CaseThumb } from "../components/cases/CaseThumb";
import { RiskBadge } from "../components/cases/RiskBadge";
import { CatalogSwitch, type CaseCatalogKind } from "../components/cases/CatalogSwitch";
import { CaseSearchInput } from "../components/cases/CaseSearchInput";
import { CommunityEarningsModal } from "../components/cases/CommunityEarningsModal";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { formatCash, formatPercent, formatXp } from "../lib/format";
import { formatTicketRange } from "../lib/caseTickets";
import { matchesCaseName } from "../lib/caseSearch";
import { RARITIES } from "../data/rarities";
import { useAdminViewStore } from "../store/adminViewStore";
import { useAuthStore } from "../store/authStore";
import {
  listHydratedCommunityCases,
  useCommunityCaseStore,
  useCommunityCasesHydrated,
} from "../store/communityCaseStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
import {
  COMMUNITY_COMMISSION_OF_EDGE,
  canCreateCommunityCase,
  communityCommissionPerOpen,
  communityCreateRequirement,
} from "../lib/communityCases";
import { sound } from "../lib/sound";
import type { Case } from "../data/cases";

const SORTED_OFFICIAL = [...CASES].sort((a, b) => a.price - b.price);

type CommunitySubNav = "all" | "mine" | "favorites";
type PriceSort = "low" | "high";

export function Cases() {
  const adminView = useAdminViewStore((s) => s.active);
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<CaseCatalogKind>(
    searchParams.get("catalog") === "community" ? "community" : "official",
  );
  const [subNav, setSubNav] = useState<CommunitySubNav>(
    searchParams.get("nav") === "mine" ? "mine" : searchParams.get("nav") === "favorites" ? "favorites" : "all",
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PriceSort>("low");
  const [earningsOpen, setEarningsOpen] = useState(false);
  const hydrated = useCommunityCasesHydrated();
  const records = useCommunityCaseStore((s) => s.cases);
  const favoriteIds = useCommunityCaseStore((s) => s.favoriteIds);
  const toggleFavorite = useCommunityCaseStore((s) => s.toggleFavorite);
  const session = useAuthStore((s) => s.session);
  const xpByUser = useLoyaltyStore((s) => s.xpByUser);
  const tiers = useLoyaltyStore((s) => s.config.tiers);
  const lifetimeXp = useMemo(() => useLoyaltyStore.getState().lifetimeXp(), [xpByUser, session]);
  const req = communityCreateRequirement(tiers);
  const unlocked = canCreateCommunityCase(lifetimeXp, tiers);

  const communityCases = useMemo(() => listHydratedCommunityCases(), [records, hydrated]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const shownCommunity = useMemo(() => {
    let list = communityCases.filter((c) => matchesCaseName(c.name, query));
    if (subNav === "mine") list = list.filter((c) => c.creatorId === session);
    if (subNav === "favorites") list = list.filter((c) => favoriteSet.has(c.id));
    return [...list].sort((a, b) => (sort === "high" ? b.price - a.price : a.price - b.price));
  }, [communityCases, query, sort, subNav, session, favoriteSet]);

  const shownOfficial = useMemo(
    () => SORTED_OFFICIAL.filter((c) => matchesCaseName(c.name, query)),
    [query],
  );

  function setCatalogKind(next: CaseCatalogKind) {
    setCatalog(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === "community") nextParams.set("catalog", "community");
    else nextParams.delete("catalog");
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Cases</h1>
          <p className="mt-1 text-sm text-slate-400">
            {catalog === "official"
              ? "Nine original cases spanning low, medium, and high risk — all with fully transparent, price-derived odds."
              : "Player-made cases using website item prices. Price matches official house-edge economics; creators earn 5% of the edge take."}
          </p>
        </div>
        <CatalogSwitch value={catalog} onChange={setCatalogKind} />
      </div>

      {catalog === "community" ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border-2 border-[#3a5c5c] bg-black/40 p-0.5">
              {(
                [
                  ["all", "All Cases"],
                  ["mine", "My Cases"],
                  ["favorites", "Favorites"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    sound.click();
                    setSubNav(id);
                  }}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition-colors",
                    subNav === id ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  setEarningsOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#3a5c5c] bg-black/40 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-cyan-100 hover:bg-cyan-400/15"
              >
                <Wallet className="h-3.5 w-3.5" /> My earnings
              </button>
              <Link
                to="/cases/create"
                onClick={() => sound.click()}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide",
                  unlocked
                    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                    : "border-white/15 text-slate-400 hover:border-white/30 hover:text-white",
                )}
              >
                <Plus className="h-3.5 w-3.5" /> Create Case
              </Link>
            </div>
          </div>

          {!unlocked && (
            <p className="mb-3 text-xs text-slate-400">
              Level {req.rank} ({req.tier.name} VIP, {formatXp(req.minXp)} XP) required to publish. You have{" "}
              {formatXp(lifetimeXp)} XP.
            </p>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <CaseSearchInput value={query} onChange={setQuery} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as PriceSort)}
              className="rounded-lg border-2 border-[#3a5c5c] bg-black/40 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white"
            >
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>

          {shownCommunity.length === 0 ? (
            <div className="surface px-5 py-10 text-center">
              <p className="text-sm text-slate-400">
                {subNav === "mine"
                  ? "You have not published a community case yet."
                  : subNav === "favorites"
                    ? "No favorite community cases yet."
                    : query.trim()
                      ? "No community cases match that search."
                      : "No community cases yet."}
              </p>
              {subNav !== "favorites" && (
                <Link to="/cases/create" onClick={() => sound.click()} className="btn-primary mt-4 inline-flex px-4 py-2 text-sm">
                  Create Case
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {shownCommunity.map((c) => (
                <CommunityCaseCard
                  key={c.id}
                  c={c}
                  favorited={favoriteSet.has(c.id)}
                  onToggleFavorite={() => {
                    sound.click();
                    toggleFavorite(c.id);
                  }}
                />
              ))}
            </div>
          )}

          <CommunityEarningsModal open={earningsOpen} onClose={() => setEarningsOpen(false)} />
        </div>
      ) : (
        <div>
          <div className="mb-5">
            <CaseSearchInput value={query} onChange={setQuery} />
          </div>
          {shownOfficial.length === 0 ? (
            <div className="surface px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No official cases match that search.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {shownOfficial.map((c) => (
                <OfficialCaseCard key={c.id} c={c} adminView={adminView} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommunityCaseCard({
  c,
  favorited,
  onToggleFavorite,
}: {
  c: Case;
  favorited: boolean;
  onToggleFavorite: () => void;
}) {
  const perOpen = communityCommissionPerOpen(c.price, c.houseEdge);
  return (
    <div className="surface group overflow-hidden">
      <Link to={`/cases/${c.id}`}>
        <CaseThumb c={c} className="h-36" />
      </Link>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{c.name}</p>
          <p className="font-mono text-sm font-bold text-emerald-200">{formatCash(c.price)}</p>
          {c.creatorName ? <p className="mt-0.5 truncate text-[11px] text-slate-500">by {c.creatorName}</p> : null}
        </div>
        <button
          type="button"
          title={favorited ? "Remove favorite" : "Favorite"}
          onClick={onToggleFavorite}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <Heart className={clsx("h-4 w-4", favorited && "fill-emerald-400 text-emerald-300")} />
        </button>
      </div>
      <p className="sr-only">
        Creator commission {formatCash(perOpen)} per paid open ({formatPercent(COMMUNITY_COMMISSION_OF_EDGE)} of
        house edge)
      </p>
    </div>
  );
}

function OfficialCaseCard({ c, adminView }: { c: Case; adminView: boolean }) {
  return (
    <div className="surface group overflow-hidden">
      <Link to={`/cases/${c.id}`}>
        <CaseThumb c={c} className="h-36" />
      </Link>
      <div className="p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="font-semibold text-white">{c.name}</p>
          <InfoButton title={`${c.name} — Odds & House Edge`}>
            <StatRow label="Price" value={`${formatCash(c.price)}`} />
            <StatRow label="Return to player (RTP)" value={formatPercent(c.rtp)} />
            <StatRow label="House edge" value={formatPercent(c.houseEdge)} />
            <p className="pt-1">{c.blurb}</p>
            <div className="pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Full odds table</p>
              {adminView && (
                <p className="mb-1.5 text-[10px] font-medium text-amber-200/80">Admin view: gold-spin pool highlighted</p>
              )}
              <div className="max-h-56 space-y-1 overflow-y-auto scrollbar-thin pr-1">
                {[...c.odds]
                  .sort((a, b) => b.probability - a.probability)
                  .map((o) => (
                    <div
                      key={o.item.id}
                      className={clsx(
                        "flex items-center justify-between rounded px-2 py-1 text-xs",
                        adminView && o.goldTier ? "bg-amber-400/15 ring-1 ring-amber-300/70" : "bg-black/20",
                        adminView && !o.goldTier && "opacity-55",
                      )}
                    >
                      <span style={{ color: RARITIES[o.item.rarity].text }}>{o.item.name}</span>
                      <span className="text-slate-400">
                        {formatCash(o.item.value)} · {(o.probability * 100).toFixed(o.probability < 0.001 ? 4 : 2)}%
                        <span className="ml-1.5 font-mono text-slate-500">#{formatTicketRange(o.ticketStart, o.ticketEnd)}</span>
                        {adminView && o.goldTier ? (
                          <span className="ml-1.5 font-bold uppercase tracking-wide text-amber-200">Gold spin</span>
                        ) : (
                          o.goldTier && " · ✨ gold"
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </InfoButton>
        </div>
        <RiskBadge risk={c.risk} className="mb-2" />
        <p className="mb-3 text-xs text-slate-500">{c.blurb}</p>
        <Link to={`/cases/${c.id}`} className="btn-primary block w-full py-2 text-center text-sm">
          Open · {formatCash(c.price)}
        </Link>
      </div>
    </div>
  );
}
