import type { BattleCaseEntry, BattleConfig } from "../store/battleStore";
import { getCase } from "../data/cases";

export const FUNDED_WINDOW_MS = 180 * 60 * 1000;
export const FUNDED_MIN_OFFSET_MS = 1 * 60 * 1000;
export const FUNDED_MAX_OFFSET_MS = FUNDED_WINDOW_MS;
export const FUNDED_STAKE_MIN = 100;
export const FUNDED_STAKE_MAX = 250;
/** First visit only — so the house battle is visible without waiting a full window. */
export const FUNDED_BOOTSTRAP_DELAY_MS = 12_000;

const PACK_CASES: { id: string; price: number }[] = [
  { id: "pocket", price: 10 },
  { id: "starter", price: 25 },
  { id: "vault", price: 50 },
  { id: "angel", price: 80 },
  { id: "prime", price: 120 },
  { id: "chaos", price: 150 },
];

export interface FundedBattleTemplate {
  modeId: string;
  crazy: boolean;
  jackpot: boolean;
  goldSpin: boolean;
  wildcard: boolean;
  terminal: boolean;
  label: string;
}

const TEMPLATES: FundedBattleTemplate[] = [
  { modeId: "2v2", crazy: false, jackpot: false, goldSpin: true, terminal: false, wildcard: false, label: "2v2" },
  { modeId: "2v2", crazy: true, jackpot: false, goldSpin: true, terminal: false, wildcard: false, label: "2v2 Crazy" },
  { modeId: "2v2", crazy: false, jackpot: true, goldSpin: true, terminal: false, wildcard: false, label: "2v2 Jackpot" },
  { modeId: "2v2", crazy: true, jackpot: true, goldSpin: true, terminal: false, wildcard: false, label: "2v2 Crazy JP" },
  { modeId: "1v1v1v1", crazy: false, jackpot: false, goldSpin: true, terminal: false, wildcard: false, label: "FFA" },
  { modeId: "1v1v1v1", crazy: true, jackpot: false, goldSpin: true, terminal: false, wildcard: false, label: "FFA Crazy" },
  { modeId: "1v1v1v1", crazy: false, jackpot: true, goldSpin: true, terminal: false, wildcard: false, label: "FFA Jackpot" },
  { modeId: "1v1v1v1", crazy: true, jackpot: true, goldSpin: false, terminal: false, wildcard: true, label: "FFA Crazy JP Wild" },
  { modeId: "2v2", crazy: false, jackpot: false, goldSpin: true, terminal: true, wildcard: false, label: "2v2 Terminal" },
  { modeId: "2v2", crazy: false, jackpot: false, goldSpin: true, terminal: false, wildcard: true, label: "2v2 Wildcard" },
];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pickOne<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

/** Stake is a multiple of 10 between 100 and 250 so Dirt Pile (10 WL) can fill the remainder. */
export function pickFundedStake(rng: () => number): number {
  const steps = (FUNDED_STAKE_MAX - FUNDED_STAKE_MIN) / 10;
  return FUNDED_STAKE_MIN + pickInt(rng, 0, steps) * 10;
}

export function packFundedCases(target: number, rng: () => number): BattleCaseEntry[] {
  let remaining = target;
  const counts = new Map<string, number>();
  let entries = 0;
  while (remaining >= 10 && entries < 6) {
    const fit = PACK_CASES.filter((p) => p.price <= remaining);
    if (fit.length === 0) break;
    const pick = pickOne(rng, fit);
    counts.set(pick.id, (counts.get(pick.id) ?? 0) + 1);
    remaining -= pick.price;
    entries += 1;
  }
  while (remaining >= 10) {
    counts.set("pocket", (counts.get("pocket") ?? 0) + 1);
    remaining -= 10;
  }
  const order = PACK_CASES.map((p) => p.id);
  return order
    .filter((id) => (counts.get(id) ?? 0) > 0)
    .map((caseId) => ({ caseId, count: counts.get(caseId)! }));
}

export function costOfCases(cases: BattleCaseEntry[]): number {
  return cases.reduce((s, e) => s + e.count * (getCase(e.caseId)?.price ?? 0), 0);
}

export function randomOffsetMs(rng: () => number): number {
  return pickInt(rng, 1, 180) * 60 * 1000;
}

export function nextWindowStart(windowStart: number, now: number): number {
  let start = windowStart;
  while (now >= start + FUNDED_WINDOW_MS) start += FUNDED_WINDOW_MS;
  return start;
}

export function fundedBattleId(windowStart: number): string {
  return `funded_${windowStart}`;
}

export function rollFundedBattle(windowStart: number): Omit<BattleConfig, "status"> {
  const rng = mulberry32(windowStart >>> 0);
  const template = pickOne(rng, TEMPLATES);
  const target = pickFundedStake(rng);
  const cases = packFundedCases(target, rng);
  const costPerPlayer = costOfCases(cases);
  return {
    id: fundedBattleId(windowStart),
    modeId: template.modeId,
    crazy: template.crazy,
    jackpot: template.jackpot,
    goldSpin: template.goldSpin,
    terminal: template.terminal,
    wildcard: template.wildcard,
    cases,
    costPerPlayer,
    fundedPct: 1,
    isPrivate: false,
    shared: false,
    coinflip: false,
    fastSpin: false,
    currency: "wl",
    createdAt: Date.now(),
    source: "lobby",
    prefillBots: 0,
    creatorBorrowPct: 0,
    eventKind: "funded",
  };
}

export function fundedTemplateLabel(battle: Pick<BattleConfig, "modeId" | "crazy" | "jackpot" | "terminal" | "wildcard">): string {
  const hit = TEMPLATES.find(
    (t) =>
      t.modeId === battle.modeId &&
      t.crazy === battle.crazy &&
      t.jackpot === battle.jackpot &&
      t.terminal === battle.terminal &&
      t.wildcard === battle.wildcard,
  );
  return hit?.label ?? battle.modeId;
}
