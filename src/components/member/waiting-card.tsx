"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

/* Figma: Member / 내 예약 · 대기 중 (129:811) — 대기 신청은 예약이 아니고, 자동 확정은 회원이 동의해야 한다. */
export function WaitingCard({ title, sub, waitNo }: { title: string; sub: string; waitNo: number }) {
  const [auto, setAuto] = useState(true);
  const [cancelled, setCancelled] = useState(false);

  if (cancelled)
    return <p className="rounded-lg border border-dashed border-line-strong p-4 text-body-sm text-fg-secondary">대기 신청을 취소했어요.</p>;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label-md text-fg">{title}</span>
          <span className="text-caption text-fg-secondary">{sub}</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-label-sm text-info-fg">
          <Clock size={12} aria-hidden />
          대기 {waitNo}번째
        </span>
      </div>
      <div className="flex items-start gap-3 rounded-md bg-subtle p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label-md text-fg">자리 나면 자동 확정 · {auto ? "동의함" : "동의 안 함"}</span>
          <span className="text-caption text-fg-secondary">
            {auto
              ? "수업 3시간 전(16:00)까지 자리가 나면 순서대로 자동 확정하고 바로 알려 드려요. 확정 후 1시간 안에는 취소할 수 있어요."
              : "자리가 나면 빈자리 안내만 받아요. 먼저 예약한 분께 확정돼요."}
          </span>
        </div>
        <Toggle label="자리 나면 자동 확정" checked={auto} onChange={setAuto} />
      </div>
      <button type="button" onClick={() => setCancelled(true)} className="self-start cursor-pointer rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
        대기 취소
      </button>
    </article>
  );
}
