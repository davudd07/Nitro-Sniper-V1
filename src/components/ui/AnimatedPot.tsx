import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import { clsx } from "clsx";
import { easeOutQuart } from "../../lib/easing";
import { CashAmount } from "./CurrencyIcon";
import type { PlayCurrency } from "../../lib/playWallet";

export function AnimatedPot({
  value,
  label = "Jackpot pot",
  size = "md",
  currency,
}: {
  value: number;
  label?: string;
  size?: "md" | "lg" | "hub";
  currency?: PlayCurrency;
}) {
  const [shown, setShown] = useState(value);
  const [pulse, setPulse] = useState(0);
  const shownRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = shownRef.current;
    const to = value;
    if (from === to) return;
    if (to > from) setPulse((n) => n + 1);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const delta = Math.abs(to - from);
    const dur = Math.min(720, Math.max(380, 280 + delta * 4));

    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const next = Math.round(from + (to - from) * easeOutQuart(t));
      shownRef.current = next;
      setShown(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const hub = size === "hub";

  return (
    <div className="text-center">
      <p
        className={clsx(
          "flex items-center justify-center gap-1 font-bold uppercase",
          hub
            ? "text-[9px] tracking-[0.16em] text-cyan-300/80"
            : "text-[10px] tracking-[0.22em] text-amber-300",
        )}
      >
        <Coins className={size === "lg" ? "h-4 w-4" : hub ? "h-3 w-3" : "h-3.5 w-3.5"} /> {label}
      </p>
      <motion.div
        key={pulse}
        initial={pulse === 0 ? false : { scale: 1.16 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 22 }}
        className={clsx(
          "inline-flex origin-center items-center justify-center font-black tracking-tight text-white",
          hub
            ? "text-xl drop-shadow-[0_0_10px_rgba(251,191,36,0.22)] sm:text-2xl"
            : size === "lg"
              ? "text-4xl drop-shadow-[0_0_16px_rgba(251,191,36,0.35)] sm:text-5xl"
              : "text-2xl drop-shadow-[0_0_16px_rgba(251,191,36,0.35)] sm:text-3xl",
        )}
      >
        <CashAmount
          wl={shown}
          currency={currency}
          iconClassName={size === "lg" ? "h-8 w-8 sm:h-10 sm:w-10" : hub ? "h-5 w-5" : "h-6 w-6"}
        />
      </motion.div>
    </div>
  );
}
