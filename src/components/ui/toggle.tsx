"use client";

import { cn } from "@/lib/cn";

/* Figma: Toggle (50:55) */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        checked ? "border-primary bg-primary" : "border-line-strong bg-muted",
      )}
    >
      <span className={cn("absolute size-4 rounded-full bg-surface shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}
