import { useMemo, useRef, useState } from "react";
import { ArrowUpCircle, Search, Zap } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { requireAccount, takeStake } from "../lib/stake";
import { formatCredits, formatPercent } from "../lib/format";
import { sound } from "../lib/sound";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { ItemIcon } from "../components/ui/ItemIcon";
import { UpgradeGauge } from "../components/upgrader/UpgradeGauge";
import { RARITIES } from "../data/rarities";
import type { CaseItem } from "../data/items";
import {
  UPGRADER_EXTRA_SPINS,
  UPGRADER_FAST_EXTRA_SPINS,
  UPGRADER_FAST_SPIN_MS,
  UPGRADER_HOUSE_EDGE,
  UPGRADER_MAX_MULTIPLIER,
  UPGRADER_MIN_CHANCE,
  UPGRADER_MIN_MULTIPLIER,
  UPGRADER_SPIN_MS,
  ceilToCents,
  clampMultiplier,
  closestItemNear,
  filterCatalog,
  formatChancePct,
  formatRollBand,
  formatUpgraderStake,
  landDegForRoll,
  multiplierFromValues,
  resolveUpgraderHouseEdge,
  settleUpgrade,
  stakeFromChance,
  targetFromMultiplier,
  upgraderChance,
  upgraderMaxChance,
  type UpgradeSort,
} from "../lib/upgrader";

type Slot = "input" | "target";
type Phase = "idle" | "spinning" | "win" | "lose";

function SlotCard({
  label,
  item,
  value,
  active,
  onClick,
}: {
  label: string;
  item: CaseItem | null;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  const rarity = item ? RARITIES[item.rarity] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-colors",
        active
          ? "border-lime-400/70 bg-lime-400/10"
          : "border-[#3d5a3a]/60 bg-black/20 hover:border-emerald-400/40 hover:bg-white/[0.03]",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {item ? (
        <>
          <ItemIcon icon={item.icon} rarity={item.rarity} size="lg" glow />
          <p className="w-full truncate text-sm font-semibold text-white" title={item.name}>
            {item.name}
          </p>
          <p className="font-mono text-sm font-bold" style={{ color: rarity?.text }}>
            {formatUpgraderStake(item.value)} <span className="font-normal text-slate-500">SH</span>
          </p>
        </>
      ) : (
        <>
          <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-emerald-400/35 bg-gradient-to-br from-lime-400/15 to-emerald-950/80">
            <span className="pixel-label text-2xl text-lime-200">SH</span>
          </div>
          <p className="text-sm font-semibold text-slate-200">{value > 0 ? "Shard wager" : "Select an item"}</p>
          <p className="font-mono text-sm font-bold text-lime-300">
            {formatUpgraderStake(value)} <span className="font-normal text-slate-500">SH</span>
          </p>
        </>
      )}
    </button>
  );
}

export function Upgrader() {
  const [stake, setStake] = useState(100);
  const [inputItem, setInputItem] = useState<CaseItem | null>(null);
  const [targetItem, setTargetItem] = useState<CaseItem | null>(() => closestItemNear(200, 100) ?? null);
  const [multiplierText, setMultiplierText] = useState("2.00");
  const [slot, setSlot] = useState<Slot>("target");
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<UpgradeSort>("price_desc");
  const [fast, setFast] = useState(false);
  const [arcStartDeg, setArcStartDeg] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [won, setWon] = useState<boolean | null>(null);
  const [landDeg, setLandDeg] = useState(0);
  const [spinToken, setSpinToken] = useState(0);
  const settleLock = useRef(false);
  const pendingRef = useRef<{ input: number; target: number; name: string; hit: boolean } | null>(null);
  const arcTargetRef = useRef(0);

  const balance = useEconomyStore((s) => s.balance);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);
  const houseEdges = useLoyaltyStore((s) => s.config.houseEdges);
  const houseEdge = resolveUpgraderHouseEdge(houseEdges);
  const maxChance = upgraderMaxChance(houseEdge);

  const inputValue = ceilToCents(stake);
  const targetValue = targetItem
    ? targetItem.value
    : targetFromMultiplier(inputValue, clampMultiplier(Number(multiplierText) || 0));
  if (targetItem) arcTargetRef.current = targetItem.value;
  const chance = upgraderChance(inputValue, targetValue, houseEdge);
  const displayedMulti = inputValue > 0 && targetValue > 0 ? targetValue / inputValue : clampMultiplier(Number(multiplierText) || 2);
  const tooLow = inputValue > 0 && inputValue > balance;
  const needHigherTarget = inputValue > 0 && targetValue > 0 && inputValue > targetValue;
  const spinning = phase === "spinning";
  const canSpin = !spinning && chance > 0 && inputValue > 0 && !tooLow && !needHigherTarget;
  const spinMs = fast ? UPGRADER_FAST_SPIN_MS : UPGRADER_SPIN_MS;
  const extraSpins = fast ? UPGRADER_FAST_EXTRA_SPINS : UPGRADER_EXTRA_SPINS;
  const maxStakeForTarget = targetValue > 0 ? stakeFromChance(maxChance, targetValue, houseEdge) : 0;

  const catalog = useMemo(
    () =>
      filterCatalog({
        query,
        minPrice: minPrice.trim() === "" ? null : Number(minPrice),
        maxPrice: maxPrice.trim() === "" ? null : Number(maxPrice),
        sort,
      }),
    [query, minPrice, maxPrice, sort],
  );

  function syncMultiplier(nextTarget: number) {
    if (inputValue <= 0) return;
    setMultiplierText(multiplierFromValues(inputValue, nextTarget).toFixed(2));
  }

  function applyStake(next: number) {
    if (!(next > 0)) {
      setStake(0);
      if (inputItem) setInputItem(null);
      if (targetItem) setMultiplierText("2.00");
      return;
    }
    let value = ceilToCents(next);
    if (targetValue > 0) {
      const maxS = stakeFromChance(maxChance, targetValue, houseEdge);
      const minS = stakeFromChance(UPGRADER_MIN_CHANCE, targetValue, houseEdge);
      if (maxS > 0) value = Math.min(maxS, value);
      if (minS > 0) value = Math.max(minS, value);
    }
    setStake(value);
    if (inputItem && inputItem.value !== value) setInputItem(null);
    if (targetItem) {
      setMultiplierText(value > 0 ? multiplierFromValues(value, targetItem.value).toFixed(2) : "2.00");
      return;
    }
    const multi = clampMultiplier(Number(multiplierText) || 2);
    const desired = targetFromMultiplier(value, multi);
    const match = desired > 0 ? closestItemNear(desired, value) : undefined;
    setTargetItem(match ?? null);
  }

  function applyChanceFromArc(nextChance: number) {
    if (spinning) return;
    const target = targetItem ? targetItem.value : arcTargetRef.current || targetValue;
    if (!(target > 0)) return;
    arcTargetRef.current = target;
    const value = stakeFromChance(nextChance, target, houseEdge);
    setStake(value);
    if (inputItem && inputItem.value !== value) setInputItem(null);
    setMultiplierText(value > 0 ? multiplierFromValues(value, target).toFixed(2) : "2.00");
  }

  function maxAffordableStake(): number {
    const cap = maxStakeForTarget > 0 ? maxStakeForTarget : balance;
    const raw = Math.min(balance, cap);
    const ceiled = ceilToCents(raw);
    if (ceiled > 0 && ceiled <= balance && (cap <= 0 || ceiled <= cap)) return ceiled;
    return Math.floor(raw * 100 + 1e-9) / 100;
  }

  function pickItem(item: CaseItem) {
    sound.click();
    if (slot === "input") {
      setInputItem(item);
      setStake(item.value);
      if (targetItem) {
        setMultiplierText(multiplierFromValues(item.value, targetItem.value).toFixed(2));
      } else {
        const desired = targetFromMultiplier(item.value, clampMultiplier(Number(multiplierText) || 2));
        setTargetItem(closestItemNear(desired, item.value) ?? null);
      }
      setSlot("target");
      return;
    }
    setTargetItem(item);
    syncMultiplier(item.value);
  }

  function commitMultiplier(raw: string) {
    const parsed = clampMultiplier(Number(raw) || 0);
    setMultiplierText(parsed.toFixed(2));
    if (inputValue <= 0) return;
    const desired = targetFromMultiplier(inputValue, parsed);
    setTargetItem(closestItemNear(desired, inputValue) ?? null);
  }

  function spinLabel() {
    if (spinning) return "Spinning…";
    if (tooLow) return "Not enough Shards";
    if (inputValue <= 0) return "Enter a stake";
    if (needHigherTarget || chance <= 0) return "Pick a cheaper source or richer target";
    return "Upgrade";
  }

  async function spin() {
    if (spinning || settleLock.current) return;
    if (inputValue <= 0) return;
    if (!requireAccount()) return;
    if (tooLow) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }
    if (chance <= 0 || needHigherTarget) {
      push("Pick a target at least as high as the source so the house still has an edge.", "warning");
      return;
    }
    if (!takeStake(inputValue, houseEdge)) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }

    settleLock.current = true;
    setPhase("spinning");
    setWon(null);
    sound.chip();
    const [roll] = await play(1);
    const hit = settleUpgrade(roll, chance);
    pendingRef.current = {
      input: inputValue,
      target: targetValue,
      name: targetItem?.name ?? `${formatUpgraderStake(targetValue)} SH`,
      hit,
    };
    setWon(hit);
    setLandDeg(landDegForRoll(roll, chance, hit, arcStartDeg));
    setSpinToken((n) => n + 1);
  }

  function handleSettled() {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    if (pending.hit) {
      credit(pending.target);
      recordRound(pending.input, pending.target, "upgrader");
      setPhase("win");
      sound.win(pending.target > pending.input * 4 ? "big" : "small");
      push(`Upgraded to ${pending.name} · +${formatUpgraderStake(pending.target)} SH.`, "success");
    } else {
      recordRound(pending.input, 0, "upgrader");
      setPhase("lose");
      sound.lose();
      push(`Missed the upgrade. Lost ${formatUpgraderStake(pending.input)} SH.`, "danger");
    }
    settleLock.current = false;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white">
            <ArrowUpCircle className="h-6 w-6 text-lime-300" />
            Upgrader
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Stake a catalog item (or its Shard value), pick a richer target, and spin the dial. Play-money only.
          </p>
        </div>
        <InfoButton title="Upgrader — RTP & House Edge">
          <StatRow label="House edge" value={formatPercent(houseEdge)} />
          <StatRow label="RTP" value={formatPercent(1 - houseEdge)} />
          <StatRow label="Default originals edge" value={formatPercent(UPGRADER_HOUSE_EDGE)} />
          <p>
            Win chance is the green slice over 360°, equal to{" "}
            <span className="font-mono text-white">(source ÷ target) × (1 − 5%)</span>. Default house edge is 5% (never
            +EV). Drag a thick end-cap to resize that slice — longer green is a higher chance and a higher source stake
            (<span className="font-mono text-white">stake = chance × target / 0.95</span>, rounded up to cents). Drag the
            green stroke to rotate the slice without changing odds. The arrow spins and lands; a hit inside your placed
            slice credits the target SH value. A miss consumes the source stake. Fair rolls use {formatRollBand(chance)}.
          </p>
        </InfoButton>
      </div>

      <div className="surface space-y-5 p-4 sm:p-5">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <SlotCard
              label="Source"
              item={inputItem}
              value={inputValue}
              active={slot === "input"}
              onClick={() => {
                if (spinning) return;
                sound.click();
                setSlot("input");
              }}
            />
            <div className="space-y-2 rounded-xl border-2 border-[#3d5a3a]/60 bg-black/20 p-2.5">
              <label className="flex items-center gap-2 rounded-md border-2 border-[#3d5a3a]/70 bg-black/30 px-2.5 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bet</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  disabled={spinning}
                  value={stake}
                  onChange={(e) => applyStake(Number(e.target.value) || 0)}
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none disabled:opacity-50"
                />
                <span className="text-[10px] font-bold text-slate-500">SH</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "clear", label: "CLEAR", run: () => applyStake(0) },
                  { id: "half", label: "1/2", run: () => applyStake(inputValue / 2) },
                  { id: "dbl", label: "2X", run: () => applyStake(inputValue * 2) },
                  { id: "max", label: "MAX", run: () => applyStake(maxAffordableStake()) },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    disabled={spinning}
                    onClick={() => {
                      sound.click();
                      btn.run();
                    }}
                    className="rounded-md border-2 border-[#3d5a3a]/70 bg-black/30 px-1 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-100 hover:border-lime-400/50 hover:bg-lime-400/10 disabled:opacity-40"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <UpgradeGauge
              chance={chance}
              multiplier={displayedMulti}
              spinning={spinning}
              won={won}
              landDeg={landDeg}
              spinToken={spinToken}
              durationMs={spinMs}
              extraSpins={extraSpins}
              arcStartDeg={arcStartDeg}
              minChance={UPGRADER_MIN_CHANCE}
              maxChance={maxChance}
              onArcStartChange={setArcStartDeg}
              onWinChanceChange={applyChanceFromArc}
              onSettled={handleSettled}
            />
          </div>
          <div className="flex flex-col gap-3">
            <SlotCard
              label="Target"
              item={targetItem}
              value={targetValue}
              active={slot === "target"}
              onClick={() => {
                if (spinning) return;
                sound.click();
                setSlot("target");
              }}
            />
            <div className="space-y-2 rounded-xl border-2 border-[#3d5a3a]/60 bg-black/20 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border-2 border-[#3d5a3a]/70 bg-black/30 px-2.5 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">x</span>
                  <input
                    type="number"
                    min={UPGRADER_MIN_MULTIPLIER}
                    max={UPGRADER_MAX_MULTIPLIER}
                    step={0.01}
                    disabled={spinning}
                    value={multiplierText}
                    onChange={(e) => setMultiplierText(e.target.value)}
                    onBlur={(e) => commitMultiplier(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitMultiplier(multiplierText);
                    }}
                    className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none disabled:opacity-50"
                  />
                </label>
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => {
                    sound.click();
                    setFast((v) => !v);
                  }}
                  title={fast ? "Fast spin on" : "Normal spin"}
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-md border-2 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide disabled:opacity-40",
                    fast
                      ? "border-lime-300/70 bg-lime-400/15 text-lime-100"
                      : "border-[#3d5a3a]/70 text-slate-400 hover:border-lime-400/50 hover:text-slate-200",
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Fast
                </button>
              </div>
              <p className="px-0.5 font-mono text-[11px] tabular-nums text-slate-500">
                {formatUpgraderStake(inputValue)} → {formatUpgraderStake(targetValue)} SH · {displayedMulti.toFixed(2)}× ·{" "}
                {formatChancePct(chance)} · house {formatPercent(houseEdge, 0)}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSpin}
          onClick={() => void spin()}
          className="btn-primary w-full px-8 py-3.5 text-base disabled:opacity-50"
        >
          {spinLabel()}
        </button>
      </div>

      <div className="surface space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className="w-full rounded-lg border-2 border-[#3d5a3a]/50 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-400/40"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Min
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="mt-1 block w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-2 font-mono text-sm text-white outline-none focus:border-lime-400/40"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Max
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="mt-1 block w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-2 font-mono text-sm text-white outline-none focus:border-lime-400/40"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as UpgradeSort)}
              className="mt-1 block rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white outline-none focus:border-lime-400/40"
            >
              <option value="price_desc">Price high → low</option>
              <option value="price_asc">Price low → high</option>
            </select>
          </label>
        </div>
        <p className="text-[11px] text-slate-500">
          Click an item to fill the {slot === "input" ? "source" : "target"} slot.
          {slot === "input" ? " Stake becomes that item’s SH value." : " Chance uses its catalog price."}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          {catalog.map((item) => {
            const selected = (slot === "target" ? targetItem?.id : inputItem?.id) === item.id;
            const r = RARITIES[item.rarity];
            return (
              <button
                key={item.id}
                type="button"
                disabled={spinning}
                onClick={() => pickItem(item)}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-xl border bg-white/[0.03] p-2 text-center transition-transform hover:-translate-y-0.5 disabled:opacity-40",
                  selected && "bg-lime-400/10 ring-2 ring-lime-300",
                )}
                style={{ borderColor: selected ? "rgba(190,242,100,0.7)" : `${r.ring}3a` }}
              >
                <ItemIcon icon={item.icon} rarity={item.rarity} size="sm" />
                <p className="w-full truncate text-[11px] font-medium text-slate-200" title={item.name}>
                  {item.name}
                </p>
                <p className="text-[11px] font-semibold" style={{ color: r.text }}>
                  {formatCredits(item.value)} <span className="font-normal text-slate-500">SH</span>
                </p>
              </button>
            );
          })}
        </div>
        {catalog.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No items match those filters.</p>}
      </div>

      <ProvablyFairPanel />
    </div>
  );
}
