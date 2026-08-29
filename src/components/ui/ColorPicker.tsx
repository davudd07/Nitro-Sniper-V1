import { useEffect, useRef, useState } from "react";
import { normalizeHex } from "../../lib/chest";

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const n = normalizeHex(hex);
  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

function hsvToHex(h: number, s: number, v: number): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const val = Math.min(100, Math.max(0, v)) / 100;
  const hue = ((h % 360) + 360) % 360;
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

type Format = "HEX" | "RGB";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const hsv = hexToHsv(value);
  const [format, setFormat] = useState<Format>("HEX");
  const [hexText, setHexText] = useState(normalizeHex(value).slice(1).toUpperCase());
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"sv" | "hue" | null>(null);
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  useEffect(() => {
    setHexText(normalizeHex(value).slice(1).toUpperCase());
  }, [value]);

  function apply(next: { h?: number; s?: number; v?: number }) {
    const cur = hsvRef.current;
    onChange(hsvToHex(next.h ?? cur.h, next.s ?? cur.s, next.v ?? cur.v));
  }

  useEffect(() => {
    function pos(e: PointerEvent, el: HTMLDivElement) {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width))),
        y: Math.min(1, Math.max(0, (e.clientY - rect.top) / Math.max(1, rect.height))),
      };
    }
    function onMove(e: PointerEvent) {
      const mode = dragRef.current;
      if (!mode) return;
      if (mode === "sv" && svRef.current) {
        const { x, y } = pos(e, svRef.current);
        apply({ s: x * 100, v: (1 - y) * 100 });
      } else if (mode === "hue" && hueRef.current) {
        const { x } = pos(e, hueRef.current);
        apply({ h: x * 360 });
      }
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onChange]);

  const rgb = {
    r: parseInt(normalizeHex(value).slice(1, 3), 16),
    g: parseInt(normalizeHex(value).slice(3, 5), 16),
    b: parseInt(normalizeHex(value).slice(5, 7), 16),
  };
  const hueColor = hsvToHex(hsv.h, 100, 100);

  return (
    <div className="w-[240px] rounded-2xl border border-white/10 bg-[#1e232f] p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
      <div
        ref={svRef}
        onPointerDown={(e) => {
          e.preventDefault();
          dragRef.current = "sv";
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
          const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
          apply({ s: x * 100, v: (1 - y) * 100 });
        }}
        className="relative h-[148px] w-full cursor-crosshair touch-none overflow-hidden rounded-xl"
        style={{
          background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hueColor})`,
        }}
      >
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
        />
      </div>

      <div className="mt-3 space-y-2.5">
        <div
          ref={hueRef}
          onPointerDown={(e) => {
            e.preventDefault();
            dragRef.current = "hue";
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            apply({ h: x * 360 });
          }}
          className="relative h-3.5 w-full cursor-ew-resize touch-none rounded-full"
          style={{
            background:
              "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
            style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }}
          />
        </div>
        <div className="relative h-3.5 w-full overflow-hidden rounded-full">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #3a3f4c 25%, transparent 25%), linear-gradient(-45deg, #3a3f4c 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3a3f4c 75%), linear-gradient(-45deg, transparent 75%, #3a3f4c 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `linear-gradient(to right, transparent, ${normalizeHex(value)})` }}
          />
          <div className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <div className="relative">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
            className="appearance-none rounded-lg bg-[#2a2f3c] py-2 pl-2.5 pr-7 text-[11px] font-bold uppercase tracking-wide text-slate-200 outline-none"
          >
            <option value="HEX">HEX</option>
            <option value="RGB">RGB</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▾</span>
        </div>
        {format === "HEX" ? (
          <input
            value={hexText}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
              setHexText(raw.toUpperCase());
              if (raw.length === 6) onChange(`#${raw.toLowerCase()}`);
            }}
            className="min-w-0 flex-1 rounded-lg bg-[#2a2f3c] px-2.5 py-2 font-mono text-xs font-semibold uppercase text-white outline-none"
          />
        ) : (
          <p className="min-w-0 flex-1 truncate rounded-lg bg-[#2a2f3c] px-2.5 py-2 font-mono text-[11px] text-slate-200">
            {rgb.r} {rgb.g} {rgb.b}
          </p>
        )}
        <div className="rounded-lg bg-[#2a2f3c] px-2 py-2 text-[11px] font-bold tabular-nums text-slate-200">100%</div>
      </div>
    </div>
  );
}
