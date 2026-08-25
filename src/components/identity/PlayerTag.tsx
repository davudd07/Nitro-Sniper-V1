import { clsx } from "clsx";
import { PlayerAvatar } from "./PlayerAvatar";
import { RoleBadge } from "./RoleBadge";
import { useIdentityStore } from "../../store/identityStore";
import { useDemoProfileStore } from "../../store/demoProfileStore";
import { publicPlayerName } from "../../lib/publicName";

export function PlayerTag({
  name,
  you = false,
  color,
  size = 20,
  kind,
  className,
  nameClassName,
  tintName = false,
  fromChat = false,
}: {
  name: string;
  you?: boolean;
  color?: string;
  size?: number;
  kind?: "you" | "bot" | "player";
  className?: string;
  nameClassName?: string;
  tintName?: boolean;
  /** Chat always shows the real username, even when anonymous. */
  fromChat?: boolean;
}) {
  useDemoProfileStore((s) => s.anonymous);
  const shown = you || fromChat ? name : publicPlayerName(name);
  const idName = you ? "You" : name;
  const avatar = useIdentityStore((s) => s.avatarFor(idName));
  const role = useIdentityStore((s) => s.roleFor(idName));
  return (
    <span className={clsx("inline-flex min-w-0 items-center gap-1.5", className)}>
      <PlayerAvatar
        src={avatar}
        name={you ? "You" : shown}
        color={color}
        size={size}
        kind={kind ?? (you ? "you" : "player")}
      />
      <span className={clsx("truncate", nameClassName)} style={tintName && color ? { color } : undefined}>
        {shown}
      </span>
      <RoleBadge role={role} />
    </span>
  );
}
