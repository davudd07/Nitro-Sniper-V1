import { useEffect } from "react";
import { useChatStore, CHAT_RAIN_PRIZE } from "../../store/chatStore";
import { useEconomyStore } from "../../store/economyStore";
import { useToastStore } from "../../store/toastStore";
import { formatCredits } from "../../lib/format";
import { sound } from "../../lib/sound";

/** Drives the 30-minute chat rain while the app is open. */
export function ChatRainController() {
  const maybeFillJoins = useChatStore((s) => s.maybeFillJoins);
  const maybeRain = useChatStore((s) => s.maybeRain);
  const credit = useEconomyStore((s) => s.credit);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      maybeFillJoins(now);
      const result = maybeRain(now);
      if (!result) return;
      if (result.youWon) {
        sound.win("small");
        credit(CHAT_RAIN_PRIZE);
        push(`Chat rain! You won ${formatCredits(CHAT_RAIN_PRIZE)} SH.`, "success");
      } else if (result.winners.length > 0) {
        push(`Chat rain — ${result.winners.join(", ")} each won ${formatCredits(CHAT_RAIN_PRIZE)} SH.`, "info");
      } else {
        push("Chat rain — nobody joined this round.", "info");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [maybeFillJoins, maybeRain, credit, push]);

  return null;
}
