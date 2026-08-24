import { useEffect, useMemo, useState } from "react";
import { useMaxxxWinStore } from "../../store/maxxxWinStore";
import { sound } from "../../lib/sound";

const COIN_COUNT = 72;

export function MaxxxWinOverlay() {
  const nonce = useMaxxxWinStore((s) => s.nonce);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (nonce <= 0) return;
    setBurst(nonce);
    sound.maxxxWin();
    const t = window.setTimeout(() => setBurst(0), 5200);
    return () => window.clearTimeout(t);
  }, [nonce]);

  const coins = useMemo(() => {
    if (!burst) return [];
    return Array.from({ length: COIN_COUNT }, (_, i) => ({
      id: `${burst}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      duration: 2.4 + Math.random() * 1.8,
      size: 14 + Math.random() * 18,
      spin: 180 + Math.random() * 540,
      drift: (Math.random() - 0.5) * 80,
    }));
  }, [burst]);

  if (!burst) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.28),transparent_58%)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/images/items/maxxx.png"
          alt="MAXXX WIN"
          className="maxxx-pop w-[min(92vw,520px)] drop-shadow-[0_0_40px_rgba(251,191,36,0.85)]"
        />
      </div>
      {coins.map((coin) => (
        <span
          key={coin.id}
          className="maxxx-coin absolute top-[-8%] rounded-full"
          style={{
            left: `${coin.left}%`,
            width: coin.size,
            height: coin.size,
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
            ["--spin" as string]: `${coin.spin}deg`,
            ["--drift" as string]: `${coin.drift}px`,
            background:
              "radial-gradient(circle at 30% 28%, #fff7c2 0%, #fbbf24 42%, #b45309 100%)",
            boxShadow: "0 0 10px rgba(251,191,36,0.7)",
          }}
        />
      ))}
    </div>
  );
}
