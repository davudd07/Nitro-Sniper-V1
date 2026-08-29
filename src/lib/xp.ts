/** XP needed to finish `level` and reach the next one. Level 24 requires 305,500. */
export function xpRequiredForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return 12_000 * lv + 17_500;
}

export function progressFromXp(totalXp: number): {
  level: number;
  intoLevel: number;
  required: number;
  ratio: number;
} {
  let xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < 9999) {
    const required = xpRequiredForLevel(level);
    if (xp < required) {
      return {
        level,
        intoLevel: xp,
        required,
        ratio: required > 0 ? xp / required : 1,
      };
    }
    xp -= required;
    level += 1;
  }
  const required = xpRequiredForLevel(level);
  return { level, intoLevel: xp, required, ratio: 1 };
}

export function totalXpForLevelProgress(level: number, intoLevel: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpRequiredForLevel(l);
  return total + Math.max(0, intoLevel);
}

/** Seeded so the header matches a filled mid-level bar on first visit. */
export const DEFAULT_REWARDS_XP = totalXpForLevelProgress(24, 182_815);

export function formatDropCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d}D ${pad(h)}H ${pad(m)}M ${pad(s)}S`;
}
