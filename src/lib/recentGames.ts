const KEY = "pv-recent-games";

export function listRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function trackRecent(id: string) {
  const next = [id, ...listRecent().filter((x) => x !== id)].slice(0, 8);
  localStorage.setItem(KEY, JSON.stringify(next));
}
