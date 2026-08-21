export const VISUAL_ROLES = ["og", "owner", "admin", "mod", "helper", "content_creator"] as const;
export type VisualRole = (typeof VISUAL_ROLES)[number];

export interface VisualRoleMeta {
  id: VisualRole;
  label: string;
  color: string;
}

export const VISUAL_ROLE_META: Record<VisualRole, VisualRoleMeta> = {
  og: { id: "og", label: "OG", color: "#f5c56b" },
  owner: { id: "owner", label: "Owner", color: "#f07178" },
  admin: { id: "admin", label: "Admin", color: "#5ee1f0" },
  mod: { id: "mod", label: "Mod", color: "#6ee7b7" },
  helper: { id: "helper", label: "Helper", color: "#7dd3fc" },
  content_creator: { id: "content_creator", label: "Content Creator", color: "#e9a8f5" },
};

export const VISUAL_ROLE_LIST: VisualRoleMeta[] = VISUAL_ROLES.map((id) => VISUAL_ROLE_META[id]);

export const AVATAR_MAX_CHANGES_PER_WEEK = 2;
export const AVATAR_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const AVATAR_SIZE_PX = 96;

export function changesInWindow(timestamps: number[], now = Date.now()): number[] {
  const since = now - AVATAR_WEEK_MS;
  return timestamps.filter((t) => t > since);
}
