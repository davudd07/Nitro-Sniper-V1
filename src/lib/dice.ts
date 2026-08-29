/** Dice: 96% RTP, max 960×. Rolls 0.10–100.00 (two decimals). */

export const DICE_RTP = 0.96;
export const DICE_HOUSE_EDGE = 1 - DICE_RTP;
export const DICE_MAX_MULTI = 960;
export const DICE_MIN_ROLL = 0.1;
export const DICE_MAX_ROLL = 100;
export const DICE_STEP = 0.01;
/** 96 / 960 = 0.1% — the lowest win chance that still hits max multi. */
export const DICE_MIN_CHANCE = 0.1;
/** Keep multiplier ≥ ~1.01× so a win always pays more than the stake. */
export const DICE_MAX_CHANCE = 95;

export type DiceCondition = "under" | "over";

export function roundDice(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100 + Number.EPSILON * Math.sign(n || 1)) / 100;
}

export function clampChance(n: number): number {
  return roundDice(Math.min(DICE_MAX_CHANCE, Math.max(DICE_MIN_CHANCE, n)));
}

export function multiplierFromChance(chance: number): number {
  return (DICE_RTP * 100) / clampChance(chance);
}

export function chanceFromMultiplier(multi: number): number {
  const minMulti = multiplierFromChance(DICE_MAX_CHANCE);
  const m = Math.min(DICE_MAX_MULTI, Math.max(minMulti, multi));
  return clampChance((DICE_RTP * 100) / m);
}

export function targetFromChance(chance: number, condition: DiceCondition): number {
  const c = clampChance(chance);
  return condition === "under" ? c : roundDice(DICE_MAX_ROLL - c);
}

export function chanceFromTarget(target: number, condition: DiceCondition): number {
  const t = roundDice(Math.min(DICE_MAX_ROLL - DICE_MIN_ROLL, Math.max(DICE_MIN_ROLL, target)));
  return condition === "under" ? clampChance(t) : clampChance(DICE_MAX_ROLL - t);
}

export function clampTarget(target: number, condition: DiceCondition): number {
  return targetFromChance(chanceFromTarget(target, condition), condition);
}

/** Map a provably-fair float in [0,1) onto 0.10–100.00 inclusive. */
export function rollDice(float: number): number {
  const u = Number.isFinite(float) ? Math.min(0.999999, Math.max(0, float)) : 0;
  const units = 10 + Math.floor(u * 9991);
  return roundDice(Math.min(DICE_MAX_ROLL, units / 100));
}

export function diceWon(roll: number, target: number, condition: DiceCondition): boolean {
  return condition === "under" ? roll < target : roll > target;
}

export function dicePayout(stake: number, chance: number): number {
  if (!(stake > 0)) return 0;
  return Math.round(stake * multiplierFromChance(chance));
}

export function formatDiceMulti(m: number): string {
  if (!Number.isFinite(m)) return "—";
  if (m >= 100) return m.toFixed(m % 1 < 0.005 ? 0 : 2);
  return m.toFixed(2);
}
