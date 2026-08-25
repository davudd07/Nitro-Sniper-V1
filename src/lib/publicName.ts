import { useAuthStore } from "../store/authStore";
import { useDemoProfileStore } from "../store/demoProfileStore";

export const ANONYMOUS_LABEL = "Anonymous";

export function isLocalPlayerName(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  if (n === "You" || n === "you") return true;
  const session = useAuthStore.getState().session;
  if (session && n.toLowerCase() === session.toLowerCase()) return true;
  const display = useDemoProfileStore.getState().displayName?.trim();
  if (display && n.toLowerCase() === display.toLowerCase()) return true;
  return false;
}

/**
 * Name shown to other players. Chat should pass `{ chat: true }` so talking
 * always reveals the real username.
 */
export function publicPlayerName(
  name: string,
  opts?: { chat?: boolean; self?: boolean },
): string {
  if (opts?.chat || opts?.self) return name;
  if (!useDemoProfileStore.getState().anonymous) return name;
  if (isLocalPlayerName(name)) return ANONYMOUS_LABEL;
  return name;
}
