/** Demo-only client lock. Plaintext credentials are never stored in this file. */
export const ADMIN_AUTH_SALT = "pv.demo.admin.v1.kestrel";

/** SHA-256 hex of `${ADMIN_AUTH_SALT}:${username}:${key}` */
export const ADMIN_CREDENTIAL_HASH =
  "1bd68b32c723d237e78069f356640778a747719775fc72d1cabf2d2a1be9637c";

const SESSION_KEY = "prism-vault-admin-session";

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashAdminCredentials(username: string, key: string): Promise<string> {
  const payload = `${ADMIN_AUTH_SALT}:${username.trim()}:${key}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return toHex(digest);
}

function hashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyAdminLogin(username: string, key: string): Promise<boolean> {
  const hash = await hashAdminCredentials(username, key);
  return hashesMatch(hash, ADMIN_CREDENTIAL_HASH);
}

export function persistAdminSession(): void {
  sessionStorage.setItem(SESSION_KEY, "1");
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasAdminSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
