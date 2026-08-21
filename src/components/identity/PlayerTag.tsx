import { clsx } from "clsx";
import { PlayerAvatar } from "./PlayerAvatar";
import { RoleBadge } from "./RoleBadge";
import { useIdentityStore } from "../../store/identityStore";

export function PlayerTag({
  name,
  you = false,
  color,
  size = 20,
  kind,
  className,
  nameClassName,
  tintName = false,
}: {
  name: string;
  you?: boolean;
  color?: string;
  size?: number;
  kind?: "you" | "bot" | "player";
  className?: string;
  nameClassName?: string;
  tintName?: boolean;
}) {
  const idName = you ? "You" : name;
  const avatar = useIdentityStore((s) => s.avatarFor(idName));
  const role = useIdentityStore((s) => s.roleFor(idName));
  return (
    <span className={clsx("inline-flex min-w-0 items-center gap-1.5", className)}>
      <PlayerAvatar
        src={avatar}
        name={you ? "You" : name}
        color={color}
        size={size}
        kind={kind ?? (you ? "you" : "player")}
      />
      <span className={clsx("truncate", nameClassName)} style={tintName && color ? { color } : undefined}>
        {name}
      </span>
      <RoleBadge role={role} />
    </span>
  );
}
