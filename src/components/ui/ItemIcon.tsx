import {
  Gem, Sparkles, Star, Crown, Flame, Snowflake, Shield, Sword, Zap, Rocket,
  Trophy, Diamond, Feather, Leaf, Anchor, Compass, Key, Moon, Sun, Skull,
  Ghost, Wand2, Orbit, Atom, Clover, Eye, Hexagon, Infinity as InfinityIcon,
  Sparkle, Bird,
} from "lucide-react";
import type { IconKey } from "../../data/items";
import { RARITIES, type RarityId } from "../../data/rarities";
import { clsx } from "clsx";

const ICON_MAP: Record<IconKey, React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>> = {
  gem: Gem, sparkles: Sparkles, star: Star, crown: Crown, flame: Flame,
  snowflake: Snowflake, shield: Shield, sword: Sword, zap: Zap, rocket: Rocket,
  trophy: Trophy, diamond: Diamond, feather: Feather, leaf: Leaf, anchor: Anchor,
  compass: Compass, key: Key, moon: Moon, sun: Sun, skull: Skull, ghost: Ghost,
  wand: Wand2, orbit: Orbit, atom: Atom, clover: Clover, eye: Eye,
  hexagon: Hexagon, infinity: InfinityIcon, meteor: Sparkle, bird: Bird,
};

export function ItemIcon({
  icon,
  rarity,
  className,
  size = "md",
  glow = false,
}: {
  icon: IconKey;
  rarity: RarityId;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}) {
  const Icon = ICON_MAP[icon] ?? Gem;
  const r = RARITIES[rarity];
  const dims = { sm: "h-8 w-8 p-1.5", md: "h-14 w-14 p-3", lg: "h-20 w-20 p-4", xl: "h-28 w-28 p-6" }[size];
  const iconDims = { sm: "h-full w-full", md: "h-full w-full", lg: "h-full w-full", xl: "h-full w-full" }[size];

  return (
    <div
      className={clsx("rounded-xl shrink-0", dims, className)}
      style={{
        background: `linear-gradient(155deg, ${r.from}55, ${r.to}dd)`,
        boxShadow: glow ? `0 0 24px ${r.ring}88, inset 0 0 20px ${r.ring}33` : `inset 0 0 12px ${r.ring}22`,
        border: `1px solid ${r.ring}66`,
      }}
    >
      <Icon className={iconDims} strokeWidth={1.6} style={{ color: r.text }} />
    </div>
  );
}
