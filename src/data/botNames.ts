// Original placeholder names used only for simulated bot/player opponents.
export const BOT_NAMES = [
  "NovaByte", "ShardHunter", "PixelFox", "LuckyComet", "VaultRaider",
  "EmberDrift", "GlassWolf", "CrimsonJinx", "SilentQuartz", "ZenithRoam",
  "FrostByte", "DuneStalker", "MysticRex", "TidalGleam", "OrbitJester",
  "ThornSpecter", "GoldRush99", "AshVortex", "NeonWisp", "IronSage",
];

export function randomBotName(exclude: Set<string>): string {
  const available = BOT_NAMES.filter((n) => !exclude.has(n));
  const pool = available.length > 0 ? available : BOT_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}
