import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpCircle, Coins, Package, Search, Zap } from "lucide-react";
import { clsx } from "clsx";
import { useEconomyStore } from "../store/economyStore";
import { useToastStore } from "../store/toastStore";
import { useFairnessStore } from "../store/fairnessStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { requireAccount, takeStake } from "../lib/stake";
import { formatCash, formatPercent } from "../lib/format";
import { worldLocksToDisplay } from "../lib/money";
import { useSettingsStore } from "../store/settingsStore";
import { CashAmount, CurrencyIcon } from "../components/ui/CurrencyIcon";
import { LockAmountInput } from "../components/ui/LockAmountInput";
import { ticketFromRoll } from "../lib/caseTickets";
import { sound } from "../lib/sound";
import { InfoButton, StatRow } from "../components/ui/InfoModal";
import { ProvablyFairPanel } from "../components/ui/ProvablyFairPanel";
import { ItemIcon } from "../components/ui/ItemIcon";
import { UpgradeGauge } from "../components/upgrader/UpgradeGauge";
import { RARITIES } from "../data/rarities";
import type { CaseItem } from "../data/items";
import {
  UPGRADER_COIN_DEFAULT_SOURCE,
  UPGRADER_COIN_DEFAULT_TARGET,
  UPGRADER_COIN_PAIR_PRESETS,
  UPGRADER_COIN_SOURCE_PRESETS,
  UPGRADER_COIN_TARGET_PRESETS,
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
  landDegForRoll,
  maxStakeBelowTarget,
  minTargetForSource,
  multiplierFromValues,
  parseUpgraderAmount,
  upgraderInputString,
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
type WagerKind = "items" | "coins";

function WagerKindSwitch({
  value,
  disabled,
  onChange,
}: {
  value: WagerKind;
  disabled: boolean;
  onChange: (next: WagerKind) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border-2 border-[#3a5c5c] bg-black/40 p-0.5">
      {(
        [
          ["items", "Items", Package],
          ["coins", "Coins", Coins],
        ] as const
      ).map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (id === value) return;
            sound.click();
            onChange(id);
          }}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition-colors disabled:opacity-40",
            value === id ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

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
  const lockUnit = useSettingsStore((s) => s.lockUnit);
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-colors",
        active
          ? "border-lime-400/70 bg-lime-400/10"
          : "border-[#3a5c5c]/60 bg-black/20 hover:border-emerald-400/40 hover:bg-white/[0.03]",
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
            <CashAmount wl={item.value} className="justify-center" />
          </p>
        </>
      ) : (
        <>
          <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-emerald-400/35 bg-gradient-to-br from-lime-400/15 to-emerald-950/80">
            <CurrencyIcon kind={lockUnit} className="h-10 w-10" />
          </div>
          <p className="text-sm font-semibold text-slate-200">{value > 0 ? "Lock wager" : "Select an item"}</p>
          <p className="font-mono text-sm font-bold text-lime-300">
            <CashAmount wl={value} className="justify-center text-lime-300" />
          </p>
        </>
      )}
    </button>
  );
}

function CoinAmountCard({
  label,
  hint,
  text,
  disabled,
  onText,
  onCommit,
}: {
  label: string;
  hint: string;
  text: string;
  disabled: boolean;
  onText: (raw: string) => void;
  onCommit: (raw: string) => void;
}) {
  const lockUnit = useSettingsStore((s) => s.lockUnit);
  return (
    <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#3a5c5c]/60 bg-black/20 px-3 py-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-emerald-400/35 bg-gradient-to-br from-lime-400/15 to-emerald-950/80">
        <CurrencyIcon kind={lockUnit} className="h-10 w-10" />
      </div>
      <label className="flex w-full items-center gap-2 rounded-md border-2 border-[#3a5c5c]/70 bg-black/30 px-2.5 py-2">
        <input
          type="number"
          min={0}
          step={0.01}
          disabled={disabled}
          value={text}
          onChange={(e) => onText(e.target.value)}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit(text);
          }}
          className="min-w-0 flex-1 bg-transparent text-center font-mono text-lg font-bold text-lime-300 outline-none disabled:opacity-50"
        />
        <CurrencyIcon kind={lockUnit} className="h-5 w-5" />
      </label>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function PresetChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        sound.click();
        onClick();
      }}
      className={clsx(
        "rounded-md border-2 px-2.5 py-1.5 font-mono text-[11px] font-extrabold tabular-nums disabled:opacity-40",
        active
          ? "border-lime-300/70 bg-lime-400/15 text-lime-100"
          : "border-[#3a5c5c]/70 bg-black/30 text-emerald-100 hover:border-lime-400/50 hover:bg-lime-400/10",
      )}
    >
      {label}
    </button>
  );
}

export function Upgrader() {
  const [wagerKind, setWagerKind] = useState<WagerKind>("items");
  const [stake, setStake] = useState(100);
  const [coinTarget, setCoinTarget] = useState(UPGRADER_COIN_DEFAULT_TARGET);
  const [coinSourceText, setCoinSourceText] = useState(String(UPGRADER_COIN_DEFAULT_SOURCE));
  const [coinTargetText, setCoinTargetText] = useState(String(UPGRADER_COIN_DEFAULT_TARGET));
  const [inputItem, setInputItem] = useState<CaseItem | null>(null);
  const [targetItem, setTargetItem] = useState<CaseItem | null>(
    () => closestItemNear(200, minTargetForSource(100)) ?? null,
  );
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
  const [ticket, setTicket] = useState<number | null>(null);
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
  const coins = wagerKind === "coins";
  const lockUnit = useSettingsStore((s) => s.lockUnit);

  useEffect(() => {
    if (!coins) return;
    setCoinSourceText(String(worldLocksToDisplay(stake, lockUnit)));
    setCoinTargetText(String(worldLocksToDisplay(coinTarget, lockUnit)));
  }, [lockUnit]);

  const inputValue = ceilToCents(stake);
  const targetValue = coins
    ? ceilToCents(coinTarget)
    : targetItem
      ? targetItem.value
      : targetFromMultiplier(inputValue, clampMultiplier(Number(multiplierText) || 0));
  if (targetValue > 0) arcTargetRef.current = targetValue;
  const chance = upgraderChance(inputValue, targetValue, houseEdge);
  const displayedMulti = inputValue > 0 && targetValue > 0 ? targetValue / inputValue : clampMultiplier(Number(multiplierText) || 2);
  const tooLow = inputValue > 0 && inputValue > balance;
  const needHigherTarget =
    inputValue > 0 && targetValue > 0 && targetValue < minTargetForSource(inputValue);
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
    const match = desired > 0 ? closestItemNear(desired, minTargetForSource(value)) : undefined;
    setTargetItem(match ?? null);
  }

  function applyCoinSource(next: number) {
    if (!(next > 0)) {
      setStake(0);
      setCoinSourceText("");
      return;
    }
    let value = ceilToCents(next);
    const cap = maxStakeBelowTarget(targetValue);
    if (cap > 0) value = Math.min(cap, value);
    setStake(value);
    setCoinSourceText(upgraderInputString(value));
    if (targetValue >= minTargetForSource(value)) {
      setMultiplierText(multiplierFromValues(value, targetValue).toFixed(2));
    }
  }

  function applyCoinTarget(next: number) {
    let value = ceilToCents(next);
    if (inputValue > 0) {
      const minT = minTargetForSource(inputValue);
      if (minT > 0) value = Math.max(value, minT);
    }
    setCoinTarget(value);
    setCoinTargetText(upgraderInputString(value));
    if (value > 0) arcTargetRef.current = value;
    if (inputValue > 0 && value >= minTargetForSource(inputValue)) {
      setMultiplierText(multiplierFromValues(inputValue, value).toFixed(2));
    }
  }

  function applyChanceFromArc(nextChance: number) {
    if (spinning) return;
    const target = coins ? targetValue || arcTargetRef.current : targetItem ? targetItem.value : arcTargetRef.current || targetValue;
    if (!(target > 0)) return;
    arcTargetRef.current = target;
    const value = stakeFromChance(nextChance, target, houseEdge);
    setStake(value);
    if (coins) setCoinSourceText(upgraderInputString(value));
    if (inputItem && inputItem.value !== value) setInputItem(null);
    setMultiplierText(value > 0 ? multiplierFromValues(value, target).toFixed(2) : "2.00");
  }

  function maxAffordableStake(): number {
    if (coins) {
      const cap = maxStakeBelowTarget(targetValue);
      if (!(cap > 0)) return 0;
      const raw = Math.min(balance, cap);
      const ceiled = ceilToCents(raw);
      if (ceiled > 0 && ceiled <= balance && ceiled <= cap) return ceiled;
      return Math.floor(raw * 100 + 1e-9) / 100;
    }
    const cap = maxStakeForTarget > 0 ? maxStakeForTarget : balance;
    const raw = Math.min(balance, cap);
    const ceiled = ceilToCents(raw);
    if (ceiled > 0 && ceiled <= balance && (cap <= 0 || ceiled <= cap)) return ceiled;
    return Math.floor(raw * 100 + 1e-9) / 100;
  }

  function applyCoinPair(source: number, target: number) {
    const tgt = ceilToCents(target);
    let value = ceilToCents(source);
    const cap = maxStakeBelowTarget(tgt);
    if (cap > 0) value = Math.min(cap, value);
    setCoinTarget(tgt);
    setCoinTargetText(upgraderInputString(tgt));
    arcTargetRef.current = tgt;
    setStake(value);
    setCoinSourceText(upgraderInputString(value));
    if (value > 0 && tgt >= minTargetForSource(value)) {
      setMultiplierText(multiplierFromValues(value, tgt).toFixed(2));
    }
  }

  function switchWagerKind(next: WagerKind) {
    if (spinning || next === wagerKind) return;
    setWagerKind(next);
    if (next === "coins") {
      setInputItem(null);
      setTargetItem(null);
      applyCoinPair(UPGRADER_COIN_DEFAULT_SOURCE, UPGRADER_COIN_DEFAULT_TARGET);
      return;
    }
    const src = inputValue > 0 ? inputValue : 100;
    setStake(src);
    const minT = minTargetForSource(src);
    const desired = targetFromMultiplier(src, clampMultiplier(Number(multiplierText) || 2));
    setTargetItem(closestItemNear(desired, minT) ?? closestItemNear(200, minT) ?? null);
  }

  function pickItem(item: CaseItem) {
    sound.click();
    if (slot === "input") {
      setInputItem(item);
      setStake(item.value);
      const minT = minTargetForSource(item.value);
      if (targetItem && targetItem.value >= minT) {
        setMultiplierText(multiplierFromValues(item.value, targetItem.value).toFixed(2));
      } else {
        const desired = targetFromMultiplier(item.value, clampMultiplier(Number(multiplierText) || 2));
        setTargetItem(closestItemNear(desired, minT) ?? null);
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
    if (coins) {
      applyCoinTarget(desired);
      return;
    }
    setTargetItem(closestItemNear(desired, minTargetForSource(inputValue)) ?? null);
  }

  function spinLabel() {
    if (spinning) return "Spinning…";
    if (tooLow) return "Not enough Shards";
    if (inputValue <= 0) return "Enter a stake";
    if (needHigherTarget || chance <= 0) {
      return "Target must be at least 1.20×";
    }
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
      push("Target must be at least 1.20× the source.", "warning");
      return;
    }
    if (!takeStake(inputValue, houseEdge)) {
      push("Not enough Shards for that bet.", "danger");
      return;
    }

    settleLock.current = true;
    setPhase("spinning");
    setWon(null);
    setTicket(null);
    sound.chip();
    const [roll] = await play(1);
    const hit = settleUpgrade(roll, chance);
    pendingRef.current = {
      input: inputValue,
      target: targetValue,
      name: coins ? `${formatCash(targetValue)}` : (targetItem?.name ?? `${formatCash(targetValue)}`),
      hit,
    };
    setWon(hit);
    setTicket(ticketFromRoll(roll));
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
      push(`Upgraded to ${pending.name} · +${formatCash(pending.target)}.`, "success");
    } else {
      recordRound(pending.input, 0, "upgrader");
      setPhase("lose");
      sound.lose();
      push(`Missed the upgrade. Lost ${formatCash(pending.input)}.`, "danger");
    }
    settleLock.current = false;
  }

  const betRunners = coins
    ? [
        { id: "clear", label: "CLEAR", run: () => applyCoinSource(0) },
        { id: "half", label: "1/2", run: () => applyCoinSource(inputValue / 2) },
        { id: "dbl", label: "2X", run: () => applyCoinSource(inputValue * 2) },
        { id: "max", label: "MAX", run: () => applyCoinSource(maxAffordableStake()) },
      ]
    : [
        { id: "clear", label: "CLEAR", run: () => applyStake(0) },
        { id: "half", label: "1/2", run: () => applyStake(inputValue / 2) },
        { id: "dbl", label: "2X", run: () => applyStake(inputValue * 2) },
        { id: "max", label: "MAX", run: () => applyStake(maxAffordableStake()) },
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white">
            <ArrowUpCircle className="h-6 w-6 text-lime-300" />
            Upgrader
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            {coins
              ? "Wager Shards to a higher Shard payout — type amounts or pick a preset, then spin. Play-money only."
              : "Stake a catalog item (or its Shard value), pick a richer target, and spin the dial. Play-money only."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WagerKindSwitch value={wagerKind} disabled={spinning} onChange={switchWagerKind} />
          <InfoButton title="Upgrader — RTP & House Edge">
            <StatRow label="House edge" value={formatPercent(houseEdge)} />
            <StatRow label="RTP" value={formatPercent(1 - houseEdge)} />
            <StatRow label="Default originals edge" value={formatPercent(UPGRADER_HOUSE_EDGE)} />
            <p>
              Win chance is the green slice over 360°, equal to{" "}
              <span className="font-mono text-white">(source ÷ target) × (1 − 5%)</span>. Default house edge is 5% (never
              +EV). The target must be at least 1.20× the source — a 500 → 500 spin is not an upgrade. Items mode uses
              the catalog; Coins mode types a source amount and a higher target (e.g. 5 → 485 WL ≈ 0.98%). Drag a thick
              end-cap to resize that slice — longer green is a higher chance and a higher source stake (
              <span className="font-mono text-white">stake = chance × target / 0.95</span>, rounded up to cents, capped
              at 1.20×). Drag the green stroke to rotate the slice without changing odds. The arrow spins and lands; a
              hit inside your placed slice credits the target World Lock value. A miss consumes the source stake. Fair rolls use{" "}
              {formatRollBand(chance)}.
            </p>
          </InfoButton>
        </div>
      </div>

      <div className="surface space-y-5 p-4 sm:p-5">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            {coins ? (
              <CoinAmountCard
                label="Wager"
                hint="Source amount"
                text={coinSourceText}
                disabled={spinning}
                onText={setCoinSourceText}
                onCommit={(raw) => applyCoinSource(parseUpgraderAmount(raw))}
              />
            ) : (
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
            )}
            <div className="space-y-2 rounded-xl border-2 border-[#3a5c5c]/60 bg-black/20 p-2.5">
              <div className="flex items-center gap-2 rounded-md border-2 border-[#3a5c5c]/70 bg-black/30 px-2.5 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bet</span>
                <LockAmountInput
                  valueWl={stake}
                  onChangeWl={(wl) => {
                    if (coins) applyCoinSource(wl);
                    else applyStake(wl);
                  }}
                  disabled={spinning}
                  className="min-w-0 flex-1"
                  inputClassName="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {betRunners.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    disabled={spinning}
                    onClick={() => {
                      sound.click();
                      btn.run();
                    }}
                    className="rounded-md border-2 border-[#3a5c5c]/70 bg-black/30 px-1 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-100 hover:border-lime-400/50 hover:bg-lime-400/10 disabled:opacity-40"
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
              ticket={ticket}
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
            {coins ? (
              <CoinAmountCard
                label="Payout"
                hint="Target amount"
                text={coinTargetText}
                disabled={spinning}
                onText={setCoinTargetText}
                onCommit={(raw) => applyCoinTarget(parseUpgraderAmount(raw))}
              />
            ) : (
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
            )}
            <div className="space-y-2 rounded-xl border-2 border-[#3a5c5c]/60 bg-black/20 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border-2 border-[#3a5c5c]/70 bg-black/30 px-2.5 py-1.5">
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
                      : "border-[#3a5c5c]/70 text-slate-400 hover:border-lime-400/50 hover:text-slate-200",
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Fast
                </button>
              </div>
              <p className="flex flex-wrap items-center gap-1 px-0.5 text-[11px] tabular-nums text-slate-500">
                <CashAmount wl={inputValue} iconClassName="h-3 w-3" />
                <span>→</span>
                <CashAmount wl={targetValue} iconClassName="h-3 w-3" />
                <span>
                  · {displayedMulti.toFixed(2)}× · {formatChancePct(chance)} · house {formatPercent(houseEdge, 0)}
                </span>
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

      {coins ? (
        <div className="surface space-y-4 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Coin presets</p>
          <div>
            <p className="mb-2 text-[11px] text-slate-500">Wager</p>
            <div className="flex flex-wrap gap-1.5">
              {UPGRADER_COIN_SOURCE_PRESETS.map((n) => (
                <PresetChip
                  key={`src-${n}`}
                  label={`${n}`}
                  active={inputValue === n}
                  disabled={spinning}
                  onClick={() => applyCoinSource(n)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] text-slate-500">Payout target</p>
            <div className="flex flex-wrap gap-1.5">
              {UPGRADER_COIN_TARGET_PRESETS.map((n) => (
                <PresetChip
                  key={`tgt-${n}`}
                  label={`${n}`}
                  active={targetValue === n}
                  disabled={spinning}
                  onClick={() => applyCoinTarget(n)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] text-slate-500">Pairs</p>
            <div className="flex flex-wrap gap-1.5">
              {UPGRADER_COIN_PAIR_PRESETS.map((pair) => (
                <PresetChip
                  key={`pair-${pair.source}-${pair.target}`}
                  label={`${pair.source} → ${pair.target}`}
                  active={inputValue === pair.source && targetValue === pair.target}
                  disabled={spinning}
                  onClick={() => applyCoinPair(pair.source, pair.target)}
                />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Target must be at least 1.20× the source (500 upgrades to 600, not 500). Typed 5 → 485 is about 0.98%
            at a 5% house edge. Dragging an arc end-cap updates the stake to{" "}
            <span className="font-mono text-slate-400">chance × target / 0.95</span> (ceil to cents, never above the
            1.20× cap).
          </p>
        </div>
      ) : (
        <div className="surface space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items…"
                className="w-full rounded-lg border-2 border-[#3a5c5c]/50 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-400/40"
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
            {slot === "input" ? " Stake becomes that item’s World Lock value." : " Chance uses its catalog price."}
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
                    <CashAmount wl={item.value} className="justify-center text-[11px]" iconClassName="h-3 w-3" />
                  </p>
                </button>
              );
            })}
          </div>
          {catalog.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No items match those filters.</p>}
        </div>
      )}

      <ProvablyFairPanel />
    </div>
  );
}
