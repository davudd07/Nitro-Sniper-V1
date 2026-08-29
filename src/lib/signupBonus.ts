import { normalizeAffiliateCode } from "./affiliate";
import { useAffiliateStore } from "../store/affiliateStore";
import { useAuthStore } from "../store/authStore";
import { useEconomyStore } from "../store/economyStore";

/** Promo / referral codes that credit World Locks on first signup. */
export const SIGNUP_BONUS_BY_CODE: Record<string, number> = {
  welcome: 100,
  zapp: 100,
  lock100: 100,
};

const STORAGE_KEY = "prism-vault-signup-bonus-v1";

function loadClaimed(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveClaimed(set: Set<string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

function claimKey(username: string, code: string): string {
  return `${username.trim().toLowerCase()}::${code}`;
}

export function signupBonusFor(raw: string): number {
  const code = normalizeAffiliateCode(raw);
  if (!code) return 0;
  return SIGNUP_BONUS_BY_CODE[code] ?? 0;
}

export interface SignupReferralResult {
  code: string | null;
  attributed: boolean;
  bonus: number;
  unknown: boolean;
}

/**
 * Optional signup referral. Valid claimed affiliate codes bind first-touch.
 * Codes in SIGNUP_BONUS_BY_CODE also credit that many World Locks once per username.
 */
export function applySignupReferral(raw: string): SignupReferralResult {
  const typed = normalizeAffiliateCode(raw);
  const captured = useAffiliateStore.getState().attributedCode;
  const code = typed || captured;
  if (!code) return { code: null, attributed: false, bonus: 0, unknown: false };

  const username = useAuthStore.getState().session || "";
  let attributed = false;
  let unknown = false;
  const apply = useAffiliateStore.getState().applyCode(code);
  if (apply === "ok" || apply === "already") attributed = true;
  else if (apply === "unknown" || apply === "invalid") unknown = !signupBonusFor(code);

  const bonus = signupBonusFor(code);
  let credited = 0;
  if (bonus > 0 && username) {
    const claimed = loadClaimed();
    const key = claimKey(username, code);
    if (!claimed.has(key)) {
      claimed.add(key);
      saveClaimed(claimed);
      useEconomyStore.getState().credit(bonus);
      credited = bonus;
    }
  }

  return { code, attributed, bonus: credited, unknown: unknown && credited === 0 && !attributed };
}
