import { useEffect } from "react";
import { useChatStore, CHAT_RAIN_PRIZE } from "../../store/chatStore";
import { useEconomyStore } from "../../store/economyStore";
import { useToastStore } from "../../store/toastStore";
import { formatCredits } from "../../lib/format";
import { sound } from "../../lib/sound";

/** Drives the 30-minute chat rain while the app is open. */
export function ChatRainController() {
  const maybeRain = useChatStore((s) => s.maybeRain);
  const credit = useEconomyStore((s) => s.credit);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    const tick = () => {
      const result = maybeRain(Date.now());
      if (!result) return;
      sound.win("small");
      if (result.youWon) {
        credit(CHAT_RAIN_PRIZE);
        push(`Chat rain! You won ${formatCredits(CHAT_RAIN_PRIZE)} SH.`, "success");
      } else {
        push(`Chat rain — ${result.winners.join(", ")} each won ${formatCredits(CHAT_RAIN_PRIZE)} SH.`, "info");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [maybeRain, credit, push]);

  return null;
}
