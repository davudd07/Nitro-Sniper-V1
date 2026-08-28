import { roundWl } from "./money";
import type { PlayCurrency } from "./playWallet";

/** Public demo dollars → SeedBET ledger. $1.00 in the reels = 100 World Locks (or Shards). */
export const PP_USD_TO_LEDGER = 100;

const PP_HOST = /(^|\.)pragmaticplay\.net$|(^|\.)ppgames\.net$/i;

export function isPragmaticOrigin(origin: string): boolean {
  try {
    return PP_HOST.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function ppCreditsToLedger(credits: number, currency: PlayCurrency): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  const n = credits * PP_USD_TO_LEDGER;
  if (currency === "shards") return Math.max(0, Math.round(n));
  return Math.max(0, roundWl(n));
}

export type PpRoundMsg =
  | { kind: "start"; bet: number }
  | { kind: "end"; win: number }
  | { kind: "bet"; bet: number }
  | { kind: "other" };

function asNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function unwrap(data: unknown): Record<string, unknown> | null {
  let v: unknown = data;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    try {
      v = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

/** Parent messages from Pragmatic’s extend_events hook (studio credits unchanged). */
export function readPpRoundMsg(data: unknown): PpRoundMsg {
  const o = unwrap(data);
  if (!o) return { kind: "other" };
  const name = typeof o.name === "string" ? o.name : "";
  const event = typeof o.event === "string" ? o.event : "";
  const params = o.params && typeof o.params === "object" ? (o.params as Record<string, unknown>) : null;

  if (name === "gameRoundStart") {
    const bet = asNum(o.betAmount);
    return { kind: "start", bet: bet != null && bet > 0 ? bet : 0 };
  }
  if (name === "balanceChanged") {
    const win = asNum(o.winAmount);
    return { kind: "end", win: win != null && win > 0 ? win : 0 };
  }
  if (event === "betChanged") {
    const bet = asNum(params?.bet) ?? asNum(o.betAmount);
    return { kind: "bet", bet: bet != null && bet > 0 ? bet : 0 };
  }
  return { kind: "other" };
}
