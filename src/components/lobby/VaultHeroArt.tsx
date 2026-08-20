/** Original abstract vault door — CSS/SVG only, no character art. */
export function VaultHeroArt() {
  return (
    <div className="relative mx-auto h-[220px] w-[220px] sm:h-[260px] sm:w-[260px]" aria-hidden>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_30%,rgba(34,211,238,0.28),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.22),transparent_50%)] blur-2xl" />
      <svg viewBox="0 0 260 260" className="relative h-full w-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
        <defs>
          <radialGradient id="pv-door" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1f3d32" />
            <stop offset="55%" stopColor="#0f1c16" />
            <stop offset="100%" stopColor="#050805" />
          </radialGradient>
          <linearGradient id="pv-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="45%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="pv-prism" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>
        <circle cx="130" cy="130" r="118" fill="url(#pv-door)" stroke="url(#pv-rim)" strokeWidth="6" />
        <circle cx="130" cy="130" r="92" fill="none" stroke="rgba(163,230,53,0.35)" strokeWidth="3" strokeDasharray="8 10" />
        <circle cx="130" cy="130" r="68" fill="none" stroke="rgba(34,211,238,0.4)" strokeWidth="2" />
        <polygon points="130,78 162,130 130,182 98,130" fill="url(#pv-prism)" opacity="0.9" />
        <circle cx="130" cy="130" r="16" fill="#052e16" stroke="#67e8f9" strokeWidth="3" />
        <rect x="126" y="130" width="8" height="28" rx="2" fill="#67e8f9" />
        <path d="M40 70 L70 52 L78 78 Z" fill="#22d3ee" opacity="0.55" />
        <path d="M198 54 L228 78 L200 92 Z" fill="#e879f9" opacity="0.5" />
        <path d="M36 176 L62 208 L48 152 Z" fill="#a3e635" opacity="0.45" />
        <path d="M210 188 L244 168 L232 214 Z" fill="#67e8f9" opacity="0.4" />
      </svg>
    </div>
  );
}
