import { useRef, useState } from "react";
import { clsx } from "clsx";
import { Palette, Plus, Trash2 } from "lucide-react";
import { ITEM_LIST } from "../../data/items";
import { ItemIcon } from "../ui/ItemIcon";
import { sound } from "../../lib/sound";
import {
  CHEST_MAX_STICKERS,
  clampSticker,
  hexToHsl,
  hslToHex,
  normalizeHex,
  type ChestSticker,
} from "../../lib/chest";
import { ChestArt } from "./ChestArt";

function newStickerId() {
  return `sticker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function ChestDesigner({
  color,
  onColor,
  stickers,
  onStickers,
  allowedItemIds,
}: {
  color: string;
  onColor: (hex: string) => void;
  stickers: ChestSticker[];
  onStickers: (next: ChestSticker[]) => void;
  allowedItemIds: string[];
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hsl = hexToHsl(color);
  const allowed = ITEM_LIST.filter((item) => allowedItemIds.includes(item.id));

  function setHsl(next: { h?: number; s?: number; l?: number }) {
    onColor(hslToHex(next.h ?? hsl.h, next.s ?? hsl.s, next.l ?? hsl.l));
  }

  function addItem(itemId: string) {
    if (!allowedItemIds.includes(itemId) || stickers.length >= CHEST_MAX_STICKERS) return;
    sound.click();
    const jitter = (stickers.length % 5) * 3;
    const sticker = clampSticker({
      id: newStickerId(),
      itemId,
      x: 46 + jitter,
      y: 47 + (stickers.length % 3) * 2,
      scale: 1,
      rotate: (stickers.length % 2 === 0 ? -1 : 1) * (8 + stickers.length * 2),
    });
    onStickers([...stickers, sticker]);
    setSelectedId(sticker.id);
  }

  function moveTo(id: string, clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    onStickers(stickers.map((s) => (s.id === id ? clampSticker({ ...s, x, y }) : s)));
  }

  const selected = stickers.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
          <Palette className="h-3.5 w-3.5" /> Chest color
        </p>
        <p className="mb-3 text-[11px] text-slate-500">
          Recolors the gold wood only. The cyan heart, lid studs, and side studs stay locked.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative h-10 w-10 overflow-hidden rounded-lg border-2 border-white/20">
            <input
              type="color"
              value={normalizeHex(color)}
              onChange={(e) => onColor(e.target.value)}
              className="absolute -inset-2 h-16 w-16 cursor-pointer"
            />
          </label>
          <input
            value={normalizeHex(color)}
            onChange={(e) => onColor(normalizeHex(e.target.value, color))}
            className="w-28 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-emerald-400/40"
          />
        </div>
        <div className="mt-3 space-y-2">
          <Slider label="Hue" min={0} max={360} value={hsl.h} onChange={(h) => setHsl({ h })} />
          <Slider label="Saturation" min={10} max={100} value={hsl.s} onChange={(s) => setHsl({ s })} />
          <Slider label="Lightness" min={16} max={68} value={hsl.l} onChange={(l) => setHsl({ l })} />
        </div>
      </div>

      <div
        ref={boxRef}
        className="relative mx-auto w-full max-w-[280px] select-none"
        onPointerMove={(e) => {
          if (!dragId || e.buttons === 0) return;
          moveTo(dragId, e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragId(null)}
        onPointerLeave={() => setDragId(null)}
      >
        <ChestArt color={color} stickers={[]} className="w-full" />
        {stickers.map((sticker) => {
          const item = ITEM_LIST.find((i) => i.id === sticker.itemId);
          if (!item) return null;
          const on = sticker.id === selectedId;
          return (
            <button
              key={sticker.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragId(sticker.id);
                setSelectedId(sticker.id);
                moveTo(sticker.id, e.clientX, e.clientY);
              }}
              className={clsx(
                "absolute z-[4] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing",
                on && "ring-2 ring-emerald-300 ring-offset-2 ring-offset-black/40",
              )}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `translate(-50%, -50%) rotate(${sticker.rotate}deg) scale(${sticker.scale})`,
              }}
            >
              <ItemIcon icon={item.icon} rarity={item.rarity} size="md" lite />
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-black/30 px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Selected item</span>
          <Slider
            label="Size"
            min={55}
            max={160}
            value={selected.scale * 100}
            onChange={(v) =>
              onStickers(stickers.map((s) => (s.id === selected.id ? clampSticker({ ...s, scale: v / 100 }) : s)))
            }
          />
          <Slider
            label="Rotate"
            min={-40}
            max={40}
            value={selected.rotate}
            onChange={(v) =>
              onStickers(stickers.map((s) => (s.id === selected.id ? clampSticker({ ...s, rotate: v }) : s)))
            }
          />
          <button
            type="button"
            onClick={() => {
              sound.click();
              onStickers(stickers.filter((s) => s.id !== selected.id));
              setSelectedId(null);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-200 hover:bg-white/5"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Fill the chest — items from this case ({stickers.length}/{CHEST_MAX_STICKERS})
        </p>
        {allowed.length === 0 ? (
          <p className="text-sm text-slate-500">Add items to the case first, then drop their icons into the chest.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allowed.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={stickers.length >= CHEST_MAX_STICKERS}
                onClick={() => addItem(item.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-left hover:border-emerald-400/40 disabled:opacity-40"
              >
                <ItemIcon icon={item.icon} rarity={item.rarity} size="sm" lite />
                <span className="text-xs text-white">{item.name}</span>
                <Plus className="h-3 w-3 text-slate-500" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex min-w-[140px] flex-1 items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 accent-emerald-400"
      />
    </label>
  );
}
