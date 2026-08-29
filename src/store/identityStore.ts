import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AVATAR_MAX_CHANGES_PER_WEEK,
  AVATAR_SIZE_PX,
  AVATAR_WEEK_MS,
  changesInWindow,
  type VisualRole,
} from "../lib/identity";
import { useAuthStore } from "./authStore";

const LOCAL_KEY = "local";
const LOCAL_NAMES = new Set(["You", "you", "local"]);

interface IdentityState {
  roles: Record<string, VisualRole>;
  avatars: Record<string, string>;
  avatarChanges: Record<string, number[]>;
  setRole: (name: string, role: VisualRole | null) => void;
  roleFor: (name: string) => VisualRole | null;
  avatarFor: (name: string) => string | null;
  avatarChangeStatus: (name?: string) => { remaining: number; nextAt: number | null };
  setAvatarPng: (file: File, name?: string) => Promise<string | null>;
}

function identityKey(name: string): string {
  const session = useAuthStore.getState().session;
  const n = name.trim();
  if (!n || LOCAL_NAMES.has(n) || (session && n.toLowerCase() === session.toLowerCase())) {
    return LOCAL_KEY;
  }
  return n;
}

function isPngFile(file: File): boolean {
  if (file.type === "image/png") return true;
  if (file.type && file.type !== "application/octet-stream") return false;
  return file.name.toLowerCase().endsWith(".png");
}

function readPng(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isPngFile(file)) {
      reject(new Error("PNG only."));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error("Keep the PNG under 2 MB."));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE_PX;
      canvas.height = AVATAR_SIZE_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not read that image."));
        return;
      }
      ctx.clearRect(0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that PNG."));
    };
    img.src = url;
  });
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set, get) => ({
      roles: {},
      avatars: {},
      avatarChanges: {},
      setRole: (name, role) => {
        const key = identityKey(name);
        set((s) => {
          const roles = { ...s.roles };
          if (!role) delete roles[key];
          else roles[key] = role;
          return { roles };
        });
      },
      roleFor: (name) => get().roles[identityKey(name)] ?? null,
      avatarFor: (name) => get().avatars[identityKey(name)] ?? null,
      avatarChangeStatus: (name = "You") => {
        const key = identityKey(name);
        const recent = changesInWindow(get().avatarChanges[key] ?? []);
        const remaining = Math.max(0, AVATAR_MAX_CHANGES_PER_WEEK - recent.length);
        const oldest = recent[0];
        return { remaining, nextAt: remaining === 0 && oldest ? oldest + AVATAR_WEEK_MS : null };
      },
      setAvatarPng: async (file, name = "You") => {
        const key = identityKey(name);
        const recent = changesInWindow(get().avatarChanges[key] ?? []);
        if (recent.length >= AVATAR_MAX_CHANGES_PER_WEEK) {
          return "You can change your picture twice a week.";
        }
        try {
          const dataUrl = await readPng(file);
          set((s) => ({
            avatars: { ...s.avatars, [key]: dataUrl },
            avatarChanges: { ...s.avatarChanges, [key]: [...recent, Date.now()] },
          }));
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : "Could not use that PNG.";
        }
      },
    }),
    { name: "prism-vault-identity" },
  ),
);
