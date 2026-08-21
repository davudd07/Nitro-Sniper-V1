function Coin({
  className,
  fill,
  stroke,
}: {
  className?: string;
  fill: string;
  stroke: string;
}) {
  return (
    <svg viewBox="0 0 72 44" className={className} aria-hidden>
      <ellipse cx="36" cy="26" rx="30" ry="15" fill={stroke} />
      <ellipse cx="36" cy="18" rx="30" ry="15" fill={fill} stroke={stroke} strokeWidth="2.4" />
      <ellipse cx="36" cy="18" rx="14" ry="7" fill="none" stroke={stroke} strokeWidth="2" opacity="0.4" />
    </svg>
  );
}

export function CoinStackArt({ accent }: { accent: "green" | "lime" }) {
  const fill = accent === "green" ? "#86efac" : "#bef264";
  const stroke = accent === "green" ? "#016b01" : "#3f6212";
  return (
    <div className="relative h-40 w-44">
      <Coin className="absolute bottom-2 left-8 h-16 w-24 rotate-[-8deg] drop-shadow-md" fill={fill} stroke={stroke} />
      <Coin className="absolute bottom-7 left-2 h-16 w-24 rotate-[10deg] drop-shadow-md" fill="#fde68a" stroke="#854d0e" />
      <Coin className="absolute bottom-12 left-10 h-16 w-24 rotate-[-4deg] drop-shadow-md" fill={fill} stroke={stroke} />
      <Coin className="absolute bottom-[4.25rem] left-5 h-16 w-24 rotate-[6deg] drop-shadow-md" fill="#facc15" stroke="#a16207" />
    </div>
  );
}

export function TreasureChestArt() {
  return (
    <div className="relative h-44 w-48">
      <svg viewBox="0 0 200 150" className="h-full w-full drop-shadow-[0_10px_12px_rgba(0,0,0,0.55)]" aria-hidden>
        <ellipse cx="100" cy="138" rx="72" ry="10" fill="#050805" opacity="0.55" />
        <path d="M28 62 L100 28 L172 62 L164 78 L36 78 Z" fill="#14532d" stroke="#a3e635" strokeWidth="3" />
        <path d="M44 48 L100 36 L156 48 L148 62 L52 62 Z" fill="#1a3d28" />
        <path d="M36 76 L164 76 L154 132 L46 132 Z" fill="#0c1410" stroke="#ca8a04" strokeWidth="3" />
        <path d="M36 76 L164 76 L160 92 L40 92 Z" fill="#163326" />
        <rect x="88" y="96" width="24" height="22" rx="4" fill="#fbbf24" stroke="#854d0e" strokeWidth="2" />
        <circle cx="100" cy="107" r="4" fill="#14532d" />
        <path d="M46 132 L154 132 L148 140 L52 140 Z" fill="#052e16" />
        <rect x="58" y="84" width="8" height="40" rx="2" fill="#a3e635" opacity="0.85" />
        <rect x="134" y="84" width="8" height="40" rx="2" fill="#a3e635" opacity="0.85" />
      </svg>
    </div>
  );
}
