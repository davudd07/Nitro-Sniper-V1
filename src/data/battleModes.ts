export interface BattleMode {
  id: string;
  label: string;
  /** Each entry is a team; the number is how many players are on it. */
  teamSizes: number[];
}

export const BATTLE_MODES: BattleMode[] = [
  { id: "1v1", label: "1v1", teamSizes: [1, 1] },
  { id: "1v1v1", label: "1v1v1", teamSizes: [1, 1, 1] },
  { id: "1v1v1v1", label: "1v1v1v1", teamSizes: [1, 1, 1, 1] },
  { id: "1v1v1v1v1", label: "1v1v1v1v1", teamSizes: [1, 1, 1, 1, 1] },
  { id: "1v1v1v1v1v1", label: "1v1v1v1v1v1", teamSizes: [1, 1, 1, 1, 1, 1] },
  { id: "2v2", label: "2v2", teamSizes: [2, 2] },
  { id: "2v2v2", label: "2v2v2", teamSizes: [2, 2, 2] },
  { id: "2v2v2v2", label: "2v2v2v2", teamSizes: [2, 2, 2, 2] },
  { id: "3v3", label: "3v3", teamSizes: [3, 3] },
  { id: "4v4", label: "4v4", teamSizes: [4, 4] },
];

export function totalPlayers(mode: BattleMode): number {
  return mode.teamSizes.reduce((s, n) => s + n, 0);
}

export const MAX_BATTLE_PLAYERS = Math.max(...BATTLE_MODES.map(totalPlayers));
export const MAX_SHARED_PLAYERS = 6;

export function battleModesFor(shared: boolean): BattleMode[] {
  if (!shared) return BATTLE_MODES;
  return BATTLE_MODES.filter((m) => totalPlayers(m) <= MAX_SHARED_PLAYERS);
}

/** Keep the current format when it still fits; otherwise pick the closest seat count ≤ 6. */
export function clampBattleMode(modeId: string, shared: boolean): string {
  const allowed = battleModesFor(shared);
  if (allowed.some((m) => m.id === modeId)) return modeId;
  const current = BATTLE_MODES.find((m) => m.id === modeId);
  const target = current ? Math.min(totalPlayers(current), MAX_SHARED_PLAYERS) : 2;
  const ranked = [...allowed].sort(
    (a, b) => Math.abs(totalPlayers(a) - target) - Math.abs(totalPlayers(b) - target),
  );
  return ranked[0]?.id ?? "1v1";
}

export function teamIndexForSeat(mode: BattleMode, seat: number): number {
  let cursor = 0;
  for (let t = 0; t < mode.teamSizes.length; t++) {
    cursor += mode.teamSizes[t];
    if (seat < cursor) return t;
  }
  return Math.max(0, mode.teamSizes.length - 1);
}

export const PLAYER_COLORS = [
  "#f43f5e", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4",
  "#ec4899", "#84cc16", "#f97316", "#14b8a6",
];

export const TEAM_COLORS = [
  "#f43f5e", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4",
];
