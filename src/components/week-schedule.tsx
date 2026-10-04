"use client";

import { useState } from "react";
import Link from "next/link";
import { AiLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { kindShort, slots, weekDays, weekSessions, type Kind, type WeekSession } from "@/data/schedule";
import { cn } from "@/lib/cn";

type Tone = "open" | "few" | "full" | "past" | "cancelled";

function toneOf(s: WeekSession): Tone {
  if (s.cancelled) return "cancelled";
  if (s.past) return "past";
  const left = s.capacity - s.booked;
  if (left <= 0) return "full";
  if (left <= 2) return "few";
  return "open";
}

const toneCls: Record<Tone, string> = {
  open: "border-line bg-surface",
  few: "border-transparent bg-warning-bg",
  full: "border-line bg-subtle",
  past: "border-line bg-subtle",
  cancelled: "border-dashed border-line-strong bg-canvas text-fg-muted",
};

function SessionBlock({ s }: { s: WeekSession }) {
  const tone = toneOf(s);
  const left = s.capacity - s.booked;
  const status =
    tone === "cancelled"
      ? s.cancelled
      : tone === "past"
        ? `${s.booked}/${s.capacity} · 마감`
        : tone === "full"
          ? s.kind === "private"
            ? `${s.booked}/${s.capacity} · 확정`
            : `${s.booked}/${s.capacity} · 대기 ${s.waitlist ?? 0}`
          : `${s.booked}/${s.capacity} · 잔여 ${left}`;
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-md border p-2", toneCls[tone])}>
      <span className={cn("text-label-sm", tone === "cancelled" ? "text-fg-muted" : "text-fg")}>
        {s.time} {kindShort[s.kind]}
      </span>
      <span className="text-caption text-fg-secondary">
        {s.coach} · {s.room}
        {tone === "past" && " · 지난 회차"}
      </span>
      <span className={cn("text-caption", tone === "few" ? "text-warning-fg" : "text-fg-secondary")}>{status}</span>
    </div>
  );
}

const legend: { tone: Tone; label: string }[] = [
  { tone: "open", label: "여유" },
  { tone: "few", label: "잔여 적음(2석 이하)" },
  { tone: "full", label: "마감 · 대기" },
  { tone: "cancelled", label: "휴강(회원 안내 완료)" },
];

/* Figma: Desktop / Weekly Schedule (23:2310) */
export function WeekSchedule() {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const list = weekSessions.filter((s) => filter === "all" || s.kind === filter);
  const active = weekSessions.filter((s) => !s.cancelled);
  const fill = Math.round((active.reduce((a, s) => a + s.booked, 0) / active.reduce((a, s) => a + s.capacity, 0)) * 100);

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-h1 text-fg">일정</h1>
          <p className="text-body-md text-fg-secondary">
            강남점 · 10월 셋째 주 (10/12–10/18) · 회차 {weekSessions.length}개 · 평균 채움률 {fill}%
          </p>
        </div>
        <Button>프로그램 관리</Button>
        <Button variant="primary">회차 추가</Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="전체" selected={filter === "all"} onClick={() => setFilter("all")} />
        <FilterChip label="그룹" selected={filter === "group"} onClick={() => setFilter("group")} />
        <FilterChip label="기구" selected={filter === "reformer"} onClick={() => setFilter("reformer")} />
        <FilterChip label="듀엣" selected={filter === "duet"} onClick={() => setFilter("duet")} />
        <FilterChip label="1:1" selected={filter === "private"} onClick={() => setFilter("private")} />
        <div className="flex-1" />
        <FilterChip label="주" selected />
        <FilterChip label="월" />
      </div>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-ai-border bg-ai-bg px-4 py-3" aria-label="AI 편성 제안">
        <AiLabel />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-label-md text-fg">다음 주 화 10/20 10:00 그룹 필라테스 회차를 추가하면 대기 회원 2명이 들어올 수 있어요</p>
          <p className="text-caption text-fg-secondary">근거: 지난 10/13(화) 10:00 마감 · 대기 2명 · 박준서 강사와 A룸이 그 시간에 비어 있음</p>
        </div>
        <Button size="sm" variant="ghost">
          나중에
        </Button>
        <Link href="/admin/approvals?id=apr-3" className="rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
          승인 카드 보기
        </Link>
      </section>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <div className="grid min-w-[900px] grid-cols-[72px_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-line bg-subtle" />
          {weekDays.map((d) => (
            <div key={d.date} className="border-b border-line bg-subtle px-3 py-2 text-label-sm text-fg-secondary">
              <span className={cn(d.today && "text-fg")}>{d.label}</span>
              {d.today && <span className="ml-1 text-link">오늘</span>}
            </div>
          ))}
          {slots.map((t) => (
            <div key={t} className="contents">
              <div className="border-b border-line px-3 py-2 text-caption text-fg-secondary">{t}</div>
              {weekDays.map((d) => {
                const cell = list.filter((s) => s.day === d.date && s.time === t);
                return (
                  <div key={d.date + t} className={cn("flex min-h-24 flex-col gap-2 border-b border-line p-1.5", d.today && "bg-info-bg/30")}>
                    {cell.map((s) => (
                      <SessionBlock key={s.id} s={s} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-4 text-caption text-fg-secondary" aria-label="범례">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm border", toneCls[l.tone])} aria-hidden />
            {l.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
