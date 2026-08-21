const PLAYER_AUTH_SALT = "pv.demo.player.v1.shard";

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPlayerPassword(password: string): Promise<string> {
  const payload = `${PLAYER_AUTH_SALT}:${password}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return toHex(digest);
}

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, "").slice(0, 20);
}

export function usernameIssue(raw: string): string | null {
  const name = normalizeUsername(raw);
  if (name.length < 3) return "Username must be at least 3 characters.";
  if (!/^[A-Za-z0-9_]+$/.test(name)) return "Use letters, numbers, and underscores only.";
  return null;
}

/** At least 8 characters, one uppercase letter, and one number. */
export function passwordIssue(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/\d/.test(password)) return "Include at least one number.";
  return null;
}

export function emailIssue(raw: string): string | null {
  const email = raw.trim();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email, or leave it blank.";
  return null;
}
