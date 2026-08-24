import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Palette, Plus, Trash2 } from "lucide-react";
import { ITEM_LIST } from "../../data/items";
import { ItemIcon } from "../ui/ItemIcon";
import { ColorPicker } from "../ui/ColorPicker";
import { sound } from "../../lib/sound";
import {
  CHEST_MAX_STICKERS,
  clampSticker,
  type ChestSticker,
} from "../../lib/chest";
import { ChestArt } from "./ChestArt";

function newStickerId() {
  return `sticker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type DragMode = "move" | "rotate" | "scale";

interface DragState {
  id: string;
  mode: DragMode;
  grabX: number;
  grabY: number;
  startScale: number;
  startDist: number;
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
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;
  const onStickersRef = useRef(onStickers);
  onStickersRef.current = onStickers;
  const dragRef = useRef<DragState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const allowed = ITEM_LIST.filter((item) => allowedItemIds.includes(item.id));
  const selected = stickers.find((s) => s.id === selectedId) ?? null;

  function patch(id: string, partial: Partial<ChestSticker>) {
    const next = stickersRef.current.map((s) => (s.id === id ? clampSticker({ ...s, ...partial }) : s));
    stickersRef.current = next;
    onStickersRef.current(next);
  }

  function pointerPct(clientX: number, clientY: number): { x: number; y: number } | null {
    const box = boxRef.current;
    if (!box) return null;
    const rect = box.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * 100,
      y: ((clientY - rect.top) / Math.max(1, rect.height)) * 100,
    };
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const pos = pointerPct(e.clientX, e.clientY);
      if (!pos) return;
      const cur = stickersRef.current.find((s) => s.id === drag.id);
      if (!cur) return;
      if (drag.mode === "move") {
        patch(drag.id, { x: pos.x - drag.grabX, y: pos.y - drag.grabY });
        return;
      }
      if (drag.mode === "rotate") {
        const deg = (Math.atan2(pos.x - cur.x, -(pos.y - cur.y)) * 180) / Math.PI;
        patch(drag.id, { rotate: deg });
        return;
      }
      const dist = Math.hypot(pos.x - cur.x, pos.y - cur.y);
      if (drag.startDist > 0.2) {
        patch(drag.id, { scale: drag.startScale * (dist / drag.startDist) });
      }
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function beginMove(id: string, clientX: number, clientY: number) {
    const pos = pointerPct(clientX, clientY);
    const cur = stickersRef.current.find((s) => s.id === id);
    if (!pos || !cur) return;
    dragRef.current = {
      id,
      mode: "move",
      grabX: pos.x - cur.x,
      grabY: pos.y - cur.y,
      startScale: cur.scale,
      startDist: 1,
    };
    setSelectedId(id);
  }

  function beginRotate(id: string) {
    const cur = stickersRef.current.find((s) => s.id === id);
    if (!cur) return;
    dragRef.current = {
      id,
      mode: "rotate",
      grabX: 0,
      grabY: 0,
      startScale: cur.scale,
      startDist: 1,
    };
    setSelectedId(id);
  }

  function beginScale(id: string, clientX: number, clientY: number) {
    const pos = pointerPct(clientX, clientY);
    const cur = stickersRef.current.find((s) => s.id === id);
    if (!pos || !cur) return;
    dragRef.current = {
      id,
      mode: "scale",
      grabX: 0,
      grabY: 0,
      startScale: cur.scale,
      startDist: Math.max(0.4, Math.hypot(pos.x - cur.x, pos.y - cur.y)),
    };
    setSelectedId(id);
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

  const boxPx = 56;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
          <Palette className="h-3.5 w-3.5" /> Chest color
        </p>
        <p className="mb-3 text-[11px] text-slate-500">
          Recolors the gold wood and the open interior. The cyan heart, lid studs, and side studs stay locked.
        </p>
        <div className="relative flex items-start gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="h-10 w-10 shrink-0 rounded-lg border-2 border-white/20"
            style={{ background: color }}
            aria-label="Open color picker"
          />
          {pickerOpen && (
            <div className="absolute left-12 top-0 z-30">
              <ColorPicker value={color} onChange={onColor} />
            </div>
          )}
        </div>
      </div>

      <div
        ref={boxRef}
        className="relative mx-auto w-full max-w-[280px] select-none"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelectedId(null);
        }}
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
                e.stopPropagation();
                beginMove(sticker.id, e.clientX, e.clientY);
              }}
              className={clsx(
                "absolute z-[4] cursor-grab touch-none active:cursor-grabbing",
                on && "z-[5]",
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
        {selected && (
          <div
            className="pointer-events-none absolute z-[6]"
            style={{
              left: `${selected.x}%`,
              top: `${selected.y}%`,
              width: boxPx * selected.scale,
              height: boxPx * selected.scale,
              transform: `translate(-50%, -50%) rotate(${selected.rotate}deg)`,
            }}
          >
            <div className="absolute inset-0 rounded-md border border-dashed border-emerald-300/80" />
            <button
              type="button"
              aria-label="Rotate"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                beginRotate(selected.id);
              }}
              className="pointer-events-auto absolute left-1/2 top-0 z-10 h-4 w-4 -translate-x-1/2 -translate-y-7 cursor-grab rounded-full border-2 border-white bg-emerald-400 shadow touch-none"
            />
            <div className="pointer-events-none absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 -translate-y-7 bg-emerald-300/80" />
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <button
                key={corner}
                type="button"
                aria-label="Resize"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  beginScale(selected.id, e.clientX, e.clientY);
                }}
                className={clsx(
                  "pointer-events-auto absolute z-10 h-3 w-3 cursor-nwse-resize rounded-[2px] border border-emerald-200 bg-white touch-none",
                  corner === "tl" && "-left-1.5 -top-1.5",
                  corner === "tr" && "-right-1.5 -top-1.5",
                  corner === "bl" && "-bottom-1.5 -left-1.5",
                  corner === "br" && "-bottom-1.5 -right-1.5",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="flex items-center justify-end">
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
