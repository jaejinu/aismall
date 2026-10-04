"use client";

import { useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import { ApprovalCard } from "@/components/approval-card";
import { ActorBadge, StatusChip, type Actor, type Status } from "@/components/ui/badges";
import { FilterChip } from "@/components/ui/filter-chip";
import { ApprovalQueueRow } from "@/components/ui/rows";
import { approvals } from "@/data/sample";

const processed: { actor: Actor; status: Status; title: string; meta: string }[] = [
  { actor: "ai", status: "expired", title: "정다은님 10/13(화) 10:00 신청", meta: "48시간 동안 응답이 없어 만료됐어요 · 다시 만들 수 있어요" },
  { actor: "human", status: "superseded", title: "강도윤님 10/16(금) 10:00 변경 요청", meta: "회원이 요청을 바꿔서 이전 제안은 쓸 수 없어요 · 새 제안을 확인하세요" },
  { actor: "automation", status: "confirmed", title: "노쇼 위험 참석 확인 2건 (묶음)", meta: "김민준 매니저가 먼저 승인했어요 · 결과 보기" },
];

type Filter = "all" | "ai" | "soon" | "automation";

/* Figma: Desktop / Approvals (17:3) — 승인함은 AI·Automation 제안 전용. 회원 신청은 예약 목록 '승인 대기' 탭에서. */
export function ApprovalsView({ initialId }: { initialId?: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(approvals.find((a) => a.id === initialId)?.id ?? approvals[0].id);
  const list = approvals.filter((a) =>
    filter === "all" || filter === "ai" ? true : filter === "soon" ? a.expiresIn.startsWith("2시간") : a.actor === "automation",
  );
  const index = approvals.findIndex((a) => a.id === selectedId);
  const selected = approvals[index];

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <header className="flex flex-col gap-0.5">
          <h1 className="text-h1 text-fg">승인함</h1>
          <p className="text-body-md text-fg-secondary">
            AI·Automation이 제안한 일 중 승인이 필요한 것만 모여요. 회원 신청은 예약 목록 &apos;승인 대기&apos;에서 확인해요. 승인해도 실행 직전에 정원·정책·연결을 다시 확인해요.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <FilterChip label="전체" count={approvals.length} selected={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label="AI 제안" count={approvals.filter((a) => a.actor === "ai").length} selected={filter === "ai"} onClick={() => setFilter("ai")} />
          <FilterChip label="만료 임박" count={1} selected={filter === "soon"} onClick={() => setFilter("soon")} />
          <FilterChip label="Automation" count={0} selected={filter === "automation"} onClick={() => setFilter("automation")} />
        </div>
        <p className="flex items-center gap-2 rounded-lg bg-info-bg px-4 py-3 text-body-sm text-info-fg">
          <Info size={16} className="shrink-0" aria-hidden />
          같은 회차·같은 종류의 위험 중간 요청은 한 번에 승인할 수 있어요. 지금은 해당 요청이 없어요.
        </p>

        <section className="flex flex-col gap-2" aria-labelledby="queue">
          <h2 id="queue" className="text-label-sm text-fg-muted">
            대기 {list.length} · 만료가 가까운 순
          </h2>
          {list.length === 0 && <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-body-sm text-fg-secondary">이 조건의 요청이 없어요.</p>}
          {list.map((a) => (
            <ApprovalQueueRow
              key={a.id}
              actor={a.actor}
              risk={a.risk}
              title={a.title}
              meta={a.queueMeta}
              selected={a.id === selectedId}
              onSelect={() => setSelectedId(a.id)}
            />
          ))}
        </section>

        <section className="flex flex-col gap-2" aria-labelledby="done">
          <h2 id="done" className="text-label-sm text-fg-muted">
            처리됨 · 최근 24시간
          </h2>
          {processed.map((p) => (
            <div key={p.title} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex gap-1">
                  <ActorBadge actor={p.actor} />
                  <StatusChip status={p.status} />
                </span>
                <span className="text-label-md text-fg">{p.title}</span>
                <span className="text-caption text-fg-secondary">{p.meta}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-fg-secondary" aria-hidden />
            </div>
          ))}
        </section>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[440px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <div className="flex items-center">
          <h2 className="flex-1 text-h2 text-fg">선택한 요청</h2>
          <span className="text-label-sm text-fg-secondary">
            {index + 1} / {approvals.length}
          </span>
        </div>
        <p className="text-label-sm text-fg-muted">지금 보는 요청 · {selected.expiresIn}</p>
        <ApprovalCard key={selected.id} request={selected} />
        <p className="text-label-sm text-fg-muted">승인 후 일어나는 일</p>
        <ol className="flex flex-col gap-1 rounded-lg bg-subtle p-4 text-body-sm text-fg">
          <li>1. 실행 직전 다시 확인 · 회차 잔여석, 정책, 알림톡 연결</li>
          <li>2. {selected.actions.map((a) => a.split(" · ")[0]).join(" → ")}</li>
          {selected.message && <li className="text-fg-secondary">메시지만 실패하면 예약은 유지되고 실패 항목만 다시 보낼 수 있어요</li>}
        </ol>
      </aside>
    </div>
  );
}
