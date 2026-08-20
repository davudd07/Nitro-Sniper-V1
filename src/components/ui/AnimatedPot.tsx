import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import { clsx } from "clsx";
import { easeOutQuart } from "../../lib/easing";
import { formatCredits } from "../../lib/format";

export function AnimatedPot({
  value,
  label = "Jackpot pot",
  size = "md",
  suffix = "SH",
}: {
  value: number;
  label?: string;
  size?: "md" | "lg";
  suffix?: string;
}) {
  const [shown, setShown] = useState(value);
  const [pulse, setPulse] = useState(0);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    prevRef.current = to;
    if (to > from) setPulse((n) => n + 1);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const dur = to > from ? 520 : 280;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      setShown(Math.round(from + (to - from) * easeOutQuart(t)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <div className="text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
        <Coins className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} /> {label}
      </p>
      <motion.p
        key={pulse}
        initial={pulse === 0 ? false : { scale: 1.18, color: "#fde68a" }}
        animate={{ scale: 1, color: "#ffffff" }}
        transition={{ type: "spring", stiffness: 520, damping: 22 }}
        className={clsx(
          "inline-block origin-center font-mono font-black tracking-tight tabular-nums text-white drop-shadow-[0_0_16px_rgba(251,191,36,0.35)]",
          size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
        )}
      >
        {formatCredits(shown)}
        <span className={clsx("ml-1.5 font-semibold text-amber-200/80", size === "lg" ? "text-base" : "text-sm")}>
          {suffix}
        </span>
      </motion.p>
    </div>
  );
}
