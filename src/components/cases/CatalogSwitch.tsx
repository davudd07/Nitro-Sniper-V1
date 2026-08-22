import { clsx } from "clsx";
import { sound } from "../../lib/sound";

export type CaseCatalogKind = "official" | "community";

export function CatalogSwitch({
  value,
  onChange,
}: {
  value: CaseCatalogKind;
  onChange: (next: CaseCatalogKind) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border-2 border-[#3d5a3a] bg-black/40 p-0.5">
      {(["official", "community"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            sound.click();
            onChange(id);
          }}
          className={clsx(
            "rounded-md px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition-colors",
            value === id ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white",
          )}
        >
          {id === "official" ? "Official" : "Community"}
        </button>
      ))}
    </div>
  );
}
