"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { FilterChip } from "@/components/ui/filter-chip";
import { confirmLabel, programs, weekStats, type ConfirmMode } from "@/data/programs";
import { cn } from "@/lib/cn";

/*
 * 프로그램 목록 — Figma 화면 없음 · manyfast 와이어프레임 n33 기준.
 * 프로그램 → 회차 → 예약. 확정 방식은 프로그램마다 정해요. 운영 현황은 강남점 이번 주 기준.
 */
export function ProgramsView() {
  const [mode, setMode] = useState<ConfirmMode | "all">("all");
  const [query, setQuery] = useState("");
  const list = programs.filter((p) => (mode === "all" || p.confirm === mode) && (!query || p.name.includes(query.trim())));

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-h1 text-fg">프로그램·회차</h1>
          <p className="text-body-md text-fg-secondary">프로그램마다 정원·확정 방식·마감을 정하고, 회차는 일정에서 만들어요 · 운영 현황은 강남점 이번 주(10/12–10/18)</p>
        </div>
        <Link href="/admin/schedule" className="rounded-md px-4 py-2 text-label-md text-fg hover:bg-subtle">
          주간 일정 보기
        </Link>
        <Link href="/admin/programs/new" className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-label-md text-on-primary hover:bg-primary-hover">
          <Plus size={16} aria-hidden />새 프로그램
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="프로그램 이름 검색"
          aria-label="프로그램 이름 검색"
          className="h-9 w-56 rounded-md border border-line bg-surface px-3 text-body-sm text-fg"
        />
        <FilterChip label="전체" count={programs.length} selected={mode === "all"} onClick={() => setMode("all")} />
        <FilterChip label="자동 확정" count={programs.filter((p) => p.confirm === "auto").length} selected={mode === "auto"} onClick={() => setMode("auto")} />
        <FilterChip label="관리자 확인" count={programs.filter((p) => p.confirm === "manual").length} selected={mode === "manual"} onClick={() => setMode("manual")} />
      </div>

      <ul className="flex max-w-[960px] flex-col gap-3">
        {list.length === 0 && <li className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-body-md text-fg-secondary">조건에 맞는 프로그램이 없어요.</li>}
        {list.map((p) => {
          const st = weekStats(p.id);
          return (
            <li key={p.id}>
              <Link href={`/admin/programs/${p.id}`} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-5 py-4 hover:border-line-strong">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-label-md text-fg">{p.name}</span>
                    <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-caption text-neutral-fg">{p.typeLabel}</span>
                    <span className="rounded-full bg-success-bg px-2 py-0.5 text-caption text-success-fg">{p.status}</span>
                  </span>
                  <span className="text-body-sm text-fg-secondary">
                    {p.duration}분 · 정원 {p.capacity}명 · {p.branches.join("·")} ·{" "}
                    <span className={cn(p.confirm === "auto" ? "text-fg" : "text-info-fg")}>
                      {confirmLabel[p.confirm]}
                      {p.confirmNote && ` (${p.confirmNote})`}
                    </span>
                  </span>
                </span>
                <span className="flex w-[220px] shrink-0 flex-col items-end gap-0.5 text-right">
                  <span className="text-label-md text-fg">이번 주 회차 {st.count}개</span>
                  <span className="text-caption text-fg-secondary">
                    {st.count === 0 ? "강남점 이번 주 회차 없음" : `예약 ${st.booked}명 · 채움률 ${st.fill}%${st.cancelled ? ` · 휴강 ${st.cancelled}` : ""}`}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-fg-secondary" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-caption text-fg-muted">프로그램은 브랜드 단위로 만들고, 지점마다 운영 여부와 회차를 정해요. 용어(프로그램·회차)는 설정에서 브랜드 단위로 바꿀 수 있어요.</p>
    </main>
  );
}
