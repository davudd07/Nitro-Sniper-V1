import { clsx } from "clsx";
import { Bot, User } from "lucide-react";

export function PlayerAvatar({
  src,
  name,
  color = "#334155",
  size = 28,
  kind = "player",
  className,
}: {
  src?: string | null;
  name: string;
  color?: string;
  size?: number;
  kind?: "you" | "bot" | "player";
  className?: string;
}) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <span
      className={clsx("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full text-bg-950", className)}
      style={{
        width: size,
        height: size,
        background: src ? "#0b1210" : color,
        boxShadow: `0 0 0 1px ${color}99`,
      }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : kind === "you" ? (
        <User style={{ width: size * 0.5, height: size * 0.5 }} />
      ) : kind === "bot" ? (
        <Bot style={{ width: size * 0.5, height: size * 0.5 }} />
      ) : (
        <span className="text-[10px] font-black text-white" style={{ fontSize: Math.max(9, size * 0.38) }}>
          {initial}
        </span>
      )}
    </span>
  );
}
