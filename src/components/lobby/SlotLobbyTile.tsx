import { SLOT_GAMES, type SlotGameId } from "../../lib/slots";

export function SlotLobbyTile({ kind }: { kind: SlotGameId }) {
  const def = SLOT_GAMES[kind];
  const fruit = def.theme === "fruit";
  const preview = def.symbols.slice(0, def.reels);
  return (
    <div
      className="lobby-slot-tile"
      style={{
        background: fruit
          ? "linear-gradient(165deg, #3f2a14 0%, #122020 58%, #0a1212 100%)"
          : "linear-gradient(165deg, #2e1064 0%, #122028 58%, #0a1212 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{
        background:
          "repeating-linear-gradient(0deg, rgba(88,255,255,0.06) 0 1px, transparent 1px 8px)",
      }} />
      <div className="relative flex h-full flex-col p-3 sm:p-4">
        <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-cyan-200/80">
          Fun spins · Shards
          <span className="rounded-full bg-fuchsia-500 px-1.5 py-0.5 text-[8px] tracking-wide text-white">New</span>
        </p>
        <p className="pixel-label mt-1 text-2xl font-extrabold uppercase leading-none text-white drop-shadow sm:text-3xl">
          {def.name}
        </p>
        <div className="mt-auto flex items-end justify-center gap-1 pb-1">
          {preview.map((s) => (
            <span
              key={s.id}
              className="grid h-8 w-8 place-items-center rounded-[4px] border-2 text-[9px] font-black sm:h-9 sm:w-9"
              style={{ background: s.fill, borderColor: s.ring, color: s.ink }}
            >
              {s.mark}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
