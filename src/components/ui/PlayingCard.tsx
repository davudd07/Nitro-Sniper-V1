import { motion } from "framer-motion";
import type { Card } from "../../lib/blackjack";

const RED_SUITS = new Set(["♥", "♦"]);

export function PlayingCard({ card, hidden = false, delay = 0 }: { card?: Card; hidden?: boolean; delay?: number }) {
  const isRed = card ? RED_SUITS.has(card.suit) : false;
  return (
    <motion.div
      initial={{ opacity: 0, y: -24, rotate: -6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 20 }}
      className="relative h-24 w-16 shrink-0 sm:h-28 sm:w-20"
      style={{ perspective: 600 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: hidden ? 180 : 0 }}
        transition={{ duration: 0.45, delay: hidden ? 0 : delay }}
      >
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-lg border border-white/10 bg-white p-1.5 shadow-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className={`text-sm font-bold leading-none ${isRed ? "text-rose-600" : "text-slate-900"}`}>
            {card?.rank}
          </span>
          <span className={`self-center text-2xl leading-none ${isRed ? "text-rose-600" : "text-slate-900"}`}>
            {card?.suit}
          </span>
          <span className={`self-end rotate-180 text-sm font-bold leading-none ${isRed ? "text-rose-600" : "text-slate-900"}`}>
            {card?.rank}
          </span>
        </div>
        <div
          className="absolute inset-0 rounded-lg border border-white/10 bg-gradient-to-br from-fuchsia-600 to-cyan-600 shadow-lg"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="absolute inset-1.5 rounded-md border border-white/20" />
        </div>
      </motion.div>
    </motion.div>
  );
}
