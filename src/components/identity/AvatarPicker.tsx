import { useRef } from "react";
import { Camera } from "lucide-react";
import { PlayerAvatar } from "./PlayerAvatar";
import { useIdentityStore } from "../../store/identityStore";
import { useToastStore } from "../../store/toastStore";
import { sound } from "../../lib/sound";
import { AVATAR_MAX_CHANGES_PER_WEEK, formatAvatarResetAt } from "../../lib/identity";
import { LOCAL_PLAYER } from "../../store/moderationStore";

export function AvatarPicker({
  name = LOCAL_PLAYER,
  color = "#019201",
  size = 56,
  kind = "you",
}: {
  name?: string;
  color?: string;
  size?: number;
  kind?: "you" | "bot" | "player";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const avatar = useIdentityStore((s) => s.avatarFor(name));
  const remaining = useIdentityStore((s) => s.avatarChangeStatus(name).remaining);
  const nextAt = useIdentityStore((s) => s.avatarChangeStatus(name).nextAt);
  const setAvatarPng = useIdentityStore((s) => s.setAvatarPng);
  const push = useToastStore((s) => s.push);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const err = await setAvatarPng(file, name);
    if (err) {
      sound.lose();
      push(err, "warning");
      return;
    }
    sound.click();
    push("Profile picture updated.", "success");
  }

  const hint =
    remaining > 0
      ? `Change picture — PNG only, ${remaining} of ${AVATAR_MAX_CHANGES_PER_WEEK} left this week`
      : nextAt
        ? `PNG change limit reached. Next change ${formatAvatarResetAt(nextAt)}`
        : "PNG change limit reached for this week";

  return (
    <button
      type="button"
      onClick={() => {
        if (remaining <= 0) {
          sound.lose();
          push(hint, "warning");
          return;
        }
        inputRef.current?.click();
      }}
      className="group relative shrink-0"
      title={hint}
      aria-label={hint}
    >
      <PlayerAvatar src={avatar} name={name} color={color} size={size} kind={kind} />
      <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
        <Camera className="h-4 w-4 text-white" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onFile(file);
        }}
      />
    </button>
  );
}

export function AvatarChangeCopy({ name = LOCAL_PLAYER }: { name?: string }) {
  const remaining = useIdentityStore((s) => s.avatarChangeStatus(name).remaining);
  const nextAt = useIdentityStore((s) => s.avatarChangeStatus(name).nextAt);
  if (remaining > 0) {
    return (
      <>
        PNG only · {remaining} of {AVATAR_MAX_CHANGES_PER_WEEK} change{remaining === 1 ? "" : "s"} left this week
      </>
    );
  }
  if (nextAt) {
    return <>PNG only · next change {formatAvatarResetAt(nextAt)}</>;
  }
  return <>PNG only · {AVATAR_MAX_CHANGES_PER_WEEK} changes per rolling 7 days</>;
}
