import { useMemo, useRef, useState } from "react";
import { ArrowUpCircle, Search, Zap } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { takeStake } from "../lib/stake";
import { houseEdgeForGame } from "../lib/loyalty";
import { formatCredits, formatPercent } from "../lib/format";
import { sound } from "../lib/sound";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { ItemIcon } from "../components/ui/ItemIcon";
import { UpgradeGauge } from "../components/upgrader/UpgradeGauge";
import { RARITIES } from "../data/rarities";
import type { CaseItem } from "../data/items";
import {
  UPGRADER_FAST_SPIN_MS,
  UPGRADER_HOUSE_EDGE,
  UPGRADER_MAX_MULTIPLIER,
  UPGRADER_MIN_MULTIPLIER,
  UPGRADER_SPIN_MS,
  clampMultiplier,
  closestItemNear,
  filterCatalog,
  formatChancePct,
  landDegForRoll,
  multiplierFromValues,
  settleUpgrade,
  targetFromMultiplier,
  upgraderChance,
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
            {formatCredits(item.value)} <span className="font-normal text-slate-500">SH</span>
          </p>
        </>
      ) : (
        <>
          <div className="grid h-20 w-20 place-items-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-lime-400/20 to-emerald-900/80">
            <span className="pixel-label text-2xl text-lime-200">SH</span>
          </div>
          <p className="text-sm font-semibold text-slate-200">{value > 0 ? "Shard stake" : "Empty"}</p>
          <p className="font-mono text-sm font-bold text-lime-300">
            {formatCredits(value)} <span className="font-normal text-slate-500">SH</span>
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
  const [phase, setPhase] = useState<Phase>("idle");
  const [won, setWon] = useState<boolean | null>(null);
  const [landDeg, setLandDeg] = useState(0);
  const [spinToken, setSpinToken] = useState(0);
  const settleLock = useRef(false);
  const pendingRef = useRef<{ input: number; target: number; name: string; hit: boolean } | null>(null);

  const balance = useEconomyStore((s) => s.balance);
  const credit = useEconomyStore((s) => s.credit);
  const recordRound = useEconomyStore((s) => s.recordRound);
  const push = useToastStore((s) => s.push);
  const play = useFairnessStore((s) => s.play);
  const houseEdges = useLoyaltyStore((s) => s.config.houseEdges);
  const houseEdge = houseEdgeForGame("upgrader", houseEdges);

  const inputValue = Math.max(0, Math.round(stake));
  const targetValue = targetItem
    ? targetItem.value
    : targetFromMultiplier(inputValue, clampMultiplier(Number(multiplierText) || 0));
  const chance = upgraderChance(inputValue, targetValue, houseEdge);
  const displayedMulti = inputValue > 0 && targetValue > 0 ? targetValue / inputValue : clampMultiplier(Number(multiplierText) || 2);
  const tooLow = inputValue > 0 && inputValue > balance;
  const needHigherTarget = inputValue > 0 && targetValue > 0 && inputValue >= targetValue;
  const spinning = phase === "spinning";
  const canSpin = !spinning && chance > 0 && inputValue > 0 && !tooLow && !needHigherTarget;

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
    const value = Math.max(0, Math.round(next));
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
    if (needHigherTarget || chance <= 0) return "Pick a higher target";
    return `Upgrade · ${formatChancePct(chance)}`;
  }

  async function spin() {
    if (spinning || settleLock.current) return;
    if (inputValue <= 0) return;
    if (tooLow) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }
    if (chance <= 0 || needHigherTarget) {
      push("Pick a higher-value target so the house still has an edge.", "warning");
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
      name: targetItem?.name ?? `${formatCredits(targetValue)} SH`,
      hit,
    };
    setWon(hit);
    setLandDeg(landDegForRoll(roll, chance, hit));
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
      push(`Upgraded to ${pending.name} · +${formatCredits(pending.target)} SH.`, "success");
    } else {
      recordRound(pending.input, 0, "upgrader");
      setPhase("lose");
      sound.lose();
      push(`Missed the upgrade. Lost ${formatCredits(pending.input)} SH.`, "danger");
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
            Stake Shards (or a catalog item&apos;s SH value), pick a richer target, and spin the gauge. Play-money only.
          </p>
        </div>
        <InfoButton title="Upgrader — RTP & House Edge">
          <StatRow label="House edge" value={formatPercent(houseEdge)} />
          <StatRow label="RTP" value={formatPercent(1 - houseEdge)} />
          <StatRow label="Default originals edge" value={formatPercent(UPGRADER_HOUSE_EDGE)} />
          <p>
            Win chance is <span className="font-mono text-white">(input ÷ target) × (1 − house edge)</span>. Chance is
            always below 100%. If the stake is at least the target, pick a higher target so the house keeps its edge.
            A hit credits the target&apos;s SH value, same as unboxing a case item. A miss consumes the stake.
          </p>
        </InfoButton>
      </div>

      <div className="surface space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "clear", label: "CLEAR", run: () => applyStake(0) },
            { id: "half", label: "1/2", run: () => applyStake(Math.floor(inputValue / 2)) },
            { id: "dbl", label: "2X", run: () => applyStake(inputValue * 2) },
            { id: "max", label: "MAX", run: () => applyStake(Math.floor(balance)) },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              disabled={spinning}
              onClick={() => {
                sound.click();
                btn.run();
              }}
              className="rounded-md border-2 border-[#3d5a3a]/70 bg-black/30 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-100 hover:border-lime-400/50 hover:bg-lime-400/10 disabled:opacity-40"
            >
              {btn.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 rounded-md border border-white/10 bg-black/25 px-2.5 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Stake</span>
            <input
              type="number"
              min={0}
              disabled={spinning}
              value={stake}
              onChange={(e) => applyStake(Number(e.target.value) || 0)}
              className="w-24 bg-transparent font-mono text-sm text-white outline-none disabled:opacity-50"
            />
            <span className="text-[10px] font-bold text-slate-500">SH</span>
          </label>
          <label className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/25 px-2.5 py-1.5">
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
              className="w-16 bg-transparent font-mono text-sm text-white outline-none disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            disabled={spinning}
            onClick={() => {
              sound.click();
              setFast((v) => !v);
            }}
            title={fast ? "Fast spin on" : "Fast spin off"}
            className={clsx(
              "inline-flex items-center gap-1 rounded-md border-2 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide disabled:opacity-40",
              fast
                ? "border-lime-300/70 bg-lime-400/15 text-lime-100"
                : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200",
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Fast
          </button>
        </div>

        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_minmax(0,1fr)]">
          <SlotCard
            label="Input"
            item={inputItem}
            value={inputValue}
            active={slot === "input"}
            onClick={() => {
              if (spinning) return;
              sound.click();
              setSlot("input");
            }}
          />
          <div className="flex flex-col items-center gap-4">
            <UpgradeGauge
              chance={chance}
              spinning={spinning}
              won={won}
              landDeg={landDeg}
              spinToken={spinToken}
              durationMs={fast ? UPGRADER_FAST_SPIN_MS : UPGRADER_SPIN_MS}
              onSettled={handleSettled}
            />
            <p className="text-center text-xs text-slate-500">
              {formatCredits(inputValue)} SH → {formatCredits(targetValue)} SH · {displayedMulti.toFixed(2)}× · house{" "}
              {formatPercent(houseEdge, 0)}
            </p>
            <button
              type="button"
              disabled={!canSpin}
              onClick={() => void spin()}
              className="btn-primary w-full max-w-xs px-8 py-3 text-sm disabled:opacity-50"
            >
              {spinLabel()}
            </button>
          </div>
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
        </div>
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
          Click an item to fill the {slot === "input" ? "input" : "target"} slot.
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
