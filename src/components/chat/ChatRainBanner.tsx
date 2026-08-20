import { Gem, HandCoins } from "lucide-react";
import { clsx } from "clsx";
import {
  useChatStore,
  CHAT_RAIN_JOIN_MS,
  CHAT_RAIN_PRIZE,
  CHAT_RAIN_WINNERS,
} from "../../store/chatStore";
import { sound } from "../../lib/sound";
import { formatCredits } from "../../lib/format";
import { useEffect, useState } from "react";

function formatRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function ChatRainBanner() {
  const nextRainAt = useChatStore((s) => s.nextRainAt);
  const joinedRain = useChatStore((s) => s.joinedRain);
  const joinRain = useChatStore((s) => s.joinRain);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remain = nextRainAt - now;
  const joinOpen = remain > 0 && remain <= CHAT_RAIN_JOIN_MS;
  const joined = joinedRain ?? [];
  const youJoined = joined.includes("You");
  const pot = CHAT_RAIN_WINNERS * CHAT_RAIN_PRIZE;

  function handleJoin() {
    if (!joinOpen || youJoined) return;
    if (joinRain()) sound.click();
  }

  return (
    <div className="rain-banner mx-2 mt-2 shrink-0 overflow-hidden rounded-lg border border-cyan-500/25">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0 leading-none">
          <p className="flex items-center gap-1 text-[10px] font-extrabold tracking-[0.18em] text-white">
            CHAT
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-400 text-bg-950">
              <Gem className="h-2.5 w-2.5" />
            </span>
          </p>
          <p className="rain-title text-[28px] font-extrabold uppercase leading-none">Rain</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-[#0c1410] py-1 pl-2 pr-1">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-cyan-400 text-bg-950">
            <Gem className="h-3 w-3" />
          </span>
          <span className="px-0.5 font-mono text-[13px] font-bold tabular-nums text-white">
            {joinOpen ? formatCredits(pot) : formatRemain(remain)}
          </span>
          <button
            type="button"
            disabled={!joinOpen || youJoined}
            onClick={handleJoin}
            title={
              youJoined
                ? "Already joined"
                : joinOpen
                  ? `Join rain · ${joined.length} in`
                  : `Join opens in the last 60 seconds`
            }
            className={clsx(
              "grid h-8 w-8 place-items-center rounded-md transition-opacity",
              joinOpen && !youJoined ? "bg-cyan-400 text-bg-950" : "bg-cyan-400/35 text-bg-950/70",
            )}
          >
            <HandCoins className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
