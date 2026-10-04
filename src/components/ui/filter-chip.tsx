import { cn } from "@/lib/cn";

/* Figma: Filter Chip (17:516) — 목록 필터. 선택되면 검은 칩. */
export function FilterChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-label-sm",
        selected ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-fg-secondary hover:bg-subtle",
      )}
    >
      {label}
      {count !== undefined && <span className="font-normal">{count}</span>}
    </button>
  );
}
