"use client";

import { useState } from "react";
import { ApprovalCard } from "@/components/approval-card";
import { ApprovalQueueRow } from "@/components/ui/rows";
import type { ApprovalRequest } from "@/data/sample";

/* 오늘 화면 오른쪽 패널 — 지금 보는 요청 1건 + 다음 대기 목록 */
export function ApprovalPanel({ requests }: { requests: ApprovalRequest[] }) {
  const [selectedId, setSelectedId] = useState(requests[0]?.id);
  const selected = requests.find((r) => r.id === selectedId) ?? requests[0];
  const rest = requests.filter((r) => r.id !== selected?.id);

  return (
    <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[440px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-h2 text-fg">승인 대기 {requests.length}</h2>
        <span className="text-label-sm text-fg-secondary">급한 순</span>
      </div>
      {selected && (
        <>
          <p className="text-label-sm text-fg-muted">지금 보는 요청 · {selected.expiresIn}</p>
          <ApprovalCard key={selected.id} request={selected} />
        </>
      )}
      {rest.length > 0 && <p className="text-label-sm text-fg-muted">다음 대기</p>}
      {rest.map((r) => (
        <ApprovalQueueRow
          key={r.id}
          actor={r.actor}
          risk={r.risk}
          title={r.title}
          meta={r.queueMeta}
          onSelect={() => setSelectedId(r.id)}
        />
      ))}
    </aside>
  );
}
