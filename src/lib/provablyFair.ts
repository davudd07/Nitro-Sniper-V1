// A lightweight, client-side re-creation of the classic "provably fair"
// commit/reveal pattern used by many case-opening sites, for demonstration
// purposes only. Because this app has no real backend, the "server seed"
// lives in the browser too — this reproduces the UX/verification flow
// (hash shown up front, seed revealed after, roll re-derivable & checkable)
// without claiming to be a cryptographically trustless system.

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return toHex(sig);
}

export function randomSeed(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface FairSeedState {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export async function createServerSeed(): Promise<{ serverSeed: string; serverSeedHash: string }> {
  const serverSeed = randomSeed(32);
  const serverSeedHash = await sha256Hex(serverSeed);
  return { serverSeed, serverSeedHash };
}

/**
 * Derives a deterministic float in [0, 1) from the seed triple, in the same
 * spirit as the HMAC-based "float" roll used across the industry.
 */
export async function rollFloat(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor = 0,
): Promise<number> {
  const hex = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:${cursor}`);
  // Use the first 13 hex chars (52 bits) for a well-distributed float.
  const slice = hex.slice(0, 13);
  const int = parseInt(slice, 16);
  return int / Math.pow(16, 13);
}

/** Convenience: roll several independent floats from one seed triple. */
export async function rollFloats(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  count: number,
): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(await rollFloat(serverSeed, clientSeed, nonce, i));
  }
  return out;
}

export async function verifyRoll(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
  cursor: number,
): Promise<{ ok: boolean; roll: number }> {
  const hash = await sha256Hex(serverSeed);
  const roll = await rollFloat(serverSeed, clientSeed, nonce, cursor);
  return { ok: hash === serverSeedHash, roll };
}
