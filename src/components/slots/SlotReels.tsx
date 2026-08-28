import { useLayoutEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { EASE_OUT_QUART_CSS } from "../../lib/easing";
import { pickWeightedIndex, type SlotDef, type SlotLineWin } from "../../lib/slots";
import { SlotGlyph } from "./SlotGlyph";

const LAND = 22;
const STRIP = 26;

function fillerId(def: SlotDef): string {
  const idx = pickWeightedIndex(Math.random(), def.weights);
  return def.symbols[idx]?.id ?? def.symbols[0]!.id;
}

function buildStrip(def: SlotDef, landId: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < STRIP; i++) out.push(i === LAND ? landId : fillerId(def));
  return out;
}

export function SlotReels({
  def,
  result,
  spinId,
  win,
  onSettled,
}: {
  def: SlotDef;
  result: string[];
  spinId: number;
  win: SlotLineWin | null;
  onSettled: () => void;
}) {
  const cell = def.reels === 3 ? 84 : 68;
  const [strips, setStrips] = useState(() => result.map((id) => buildStrip(def, id)));
  const [offset, setOffset] = useState(() => -(LAND - 1) * cell);
  const [motion, setMotion] = useState(false);
  const [landed, setLanded] = useState(true);
  const doneRef = useRef(onSettled);
  doneRef.current = onSettled;

  useLayoutEffect(() => {
    setStrips(result.map((id) => buildStrip(def, id)));
    if (spinId <= 0) {
      setMotion(false);
      setOffset(-(LAND - 1) * cell);
      setLanded(true);
      return;
    }
    setLanded(false);
    setMotion(false);
    setOffset(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOffset(-(LAND - 1) * cell);
      setLanded(true);
      doneRef.current();
      return;
    }
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        setMotion(true);
        setOffset(-(LAND - 1) * cell);
      });
    });
    const lastMs = 1080 + (def.reels - 1) * 240 + 90;
    const done = window.setTimeout(() => {
      setLanded(true);
      doneRef.current();
    }, lastMs);
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      window.clearTimeout(done);
    };
  }, [spinId, def, result, cell]);

  const windowH = cell * 3;
  const hitCount = landed && win && win.multi > 0 ? win.count : 0;

  return (
    <div className="slot-window mx-auto w-full max-w-xl" style={{ height: windowH }}>
      <div className="slot-payline" />
      <div className="relative flex h-full">
        {strips.map((strip, reel) => (
          <div key={reel} className="slot-reel-col min-w-0 flex-1">
            <div
              className="flex flex-col items-center"
              style={{
                transform: `translateY(${offset}px)`,
                transition: motion
                  ? `transform ${1080 + reel * 240}ms ${EASE_OUT_QUART_CSS} ${reel * 90}ms`
                  : "none",
              }}
            >
              {strip.map((id, i) => {
                const symbol = def.symbols.find((s) => s.id === id) ?? def.symbols[0]!;
                const center = i === LAND;
                const glow = center && reel < hitCount;
                return (
                  <div key={`${reel}-${i}`} className={clsx("grid place-items-center", glow && "z-10")} style={{ height: cell }}>
                    <SlotGlyph symbol={symbol} size={def.reels === 3 ? "lg" : "md"} win={glow} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
