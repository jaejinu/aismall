"use client";

import { useEffect, useRef } from "react";

/* 모바일 아래에서 올라오는 시트. 배경(scrim)을 누르거나 Esc로 닫는다. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto w-full max-w-[430px] rounded-t-2xl bg-surface p-0 text-fg backdrop:bg-scrim/40"
    >
      <div className="flex flex-col gap-4 px-4 pb-6 pt-2">
        <span className="mx-auto h-1 w-9 rounded-full bg-muted" aria-hidden />
        <h2 className="text-h2 text-fg">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

export function SummaryRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-col gap-2 rounded-lg bg-subtle p-4">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4 text-body-sm">
          <dt className="w-20 shrink-0 text-fg-secondary">{k}</dt>
          <dd className="flex-1 text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
