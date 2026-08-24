import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { useMaxxxWinStore } from "../../store/maxxxWinStore";
import { sound } from "../../lib/sound";

const COIN_COUNT = 140;
const SPARK_COUNT = 40;
const SHOW_MS = 8000;
const FADE_MS = 1100;

export function MaxxxWinOverlay() {
  const nonce = useMaxxxWinStore((s) => s.nonce);
  const [burst, setBurst] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (nonce <= 0) return;
    setBurst(nonce);
    setFading(false);
    sound.maxxxWin();
    const fade = window.setTimeout(() => setFading(true), SHOW_MS);
    const hide = window.setTimeout(() => {
      setBurst(0);
      setFading(false);
      sound.stopMaxxxWin();
    }, SHOW_MS + FADE_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, [nonce]);

  const coins = useMemo(() => {
    if (!burst) return [];
    return Array.from({ length: COIN_COUNT }, (_, i) => {
      const big = i % 7 === 0;
      return {
        id: `${burst}-c-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 2.2,
        duration: 5.6 + Math.random() * 2.4,
        size: big ? 28 + Math.random() * 22 : 16 + Math.random() * 14,
        spin: 220 + Math.random() * 720,
        drift: (Math.random() - 0.5) * 140,
        tilt: -28 + Math.random() * 56,
      };
    });
  }, [burst]);

  const sparks = useMemo(() => {
    if (!burst) return [];
    return Array.from({ length: SPARK_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / SPARK_COUNT + Math.random() * 0.2;
      const dist = 18 + Math.random() * 38;
      return {
        id: `${burst}-s-${i}`,
        x: 50 + Math.cos(angle) * dist,
        y: 42 + Math.sin(angle) * dist * 0.72,
        delay: Math.random() * 1.4,
        size: 3 + Math.random() * 7,
        duration: 1.1 + Math.random() * 1.4,
      };
    });
  }, [burst]);

  if (!burst) return null;

  return (
    <div
      className={clsx(
        "pointer-events-none fixed inset-0 z-[80] overflow-hidden maxxx-overlay",
        fading && "maxxx-overlay-out",
      )}
      style={{ perspective: "900px" }}
    >
      <div className="maxxx-flash absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,220,120,0.38),rgba(251,191,36,0.12)_34%,transparent_68%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.55),transparent_55%)]" />
      <div className="maxxx-rays absolute inset-[-18%]" />

      <div className="maxxx-shock absolute left-1/2 top-[42%] h-[min(70vw,520px)] w-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div
        className="maxxx-shock absolute left-1/2 top-[42%] h-[min(70vw,520px)] w-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ animationDelay: "0.18s" }}
      />
      <div
        className="maxxx-shock absolute left-1/2 top-[42%] h-[min(70vw,520px)] w-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ animationDelay: "0.4s" }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="maxxx-bloom absolute h-[min(80vw,560px)] w-[min(80vw,560px)] rounded-full" />
          <div className="maxxx-ring absolute h-[min(58vw,420px)] w-[min(58vw,420px)] rounded-full" />
          <img
            src="/images/items/maxxx.png"
            alt="MAXXX WIN"
            className="maxxx-mark relative z-[1] w-[min(92vw,560px)]"
          />
        </div>
      </div>

      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="maxxx-spark absolute rounded-full"
          style={{
            left: `${spark.x}%`,
            top: `${spark.y}%`,
            width: spark.size,
            height: spark.size,
            ["--maxxx-spark-delay" as string]: `${spark.delay}s`,
            ["--maxxx-spark-duration" as string]: `${spark.duration}s`,
          }}
        />
      ))}

      {coins.map((coin) => (
        <span
          key={coin.id}
          className="maxxx-coin absolute top-[-12%] rounded-full"
          style={{
            left: `${coin.left}%`,
            width: coin.size,
            height: coin.size,
            ["--maxxx-delay" as string]: `${coin.delay}s`,
            ["--maxxx-duration" as string]: `${coin.duration}s`,
            ["--maxxx-spin" as string]: `${coin.spin}deg`,
            ["--maxxx-drift" as string]: `${coin.drift}px`,
            ["--maxxx-tilt" as string]: `${coin.tilt}deg`,
            background:
              "radial-gradient(circle at 30% 26%, #fff8d0 0%, #fbbf24 38%, #d97706 68%, #7c2d12 100%)",
            boxShadow:
              "inset 0 -3px 6px rgba(120,53,15,0.55), inset 0 3px 5px rgba(255,251,220,0.7), 0 0 14px rgba(251,191,36,0.75)",
            border: "1px solid rgba(253,230,138,0.55)",
          }}
        >
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: "22%",
              border: "1.5px solid rgba(255, 248, 200, 0.45)",
              background: "radial-gradient(circle at 35% 30%, rgba(255,251,220,0.55), transparent 62%)",
            }}
          />
        </span>
      ))}
    </div>
  );
}
