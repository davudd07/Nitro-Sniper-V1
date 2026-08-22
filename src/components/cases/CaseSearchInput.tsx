import { Search } from "lucide-react";
import { clsx } from "clsx";

export function CaseSearchInput({
  value,
  onChange,
  placeholder = "Search cases",
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={clsx("relative min-w-[200px] flex-1", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border-2 border-[#3d5a3a] bg-black/30 py-2 pl-8 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
      />
    </label>
  );
}
