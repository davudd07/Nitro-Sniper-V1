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
  { id: "2v2", label: "2v2", teamSizes: [2, 2] },
  { id: "2v2v2", label: "2v2v2", teamSizes: [2, 2, 2] },
  { id: "3v3", label: "3v3", teamSizes: [3, 3] },
];

export function totalPlayers(mode: BattleMode): number {
  return mode.teamSizes.reduce((s, n) => s + n, 0);
}

export const PLAYER_COLORS = [
  "#f43f5e", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4",
  "#ec4899", "#84cc16", "#f97316", "#14b8a6",
];

export const TEAM_COLORS = [
  "#f43f5e", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4",
];
