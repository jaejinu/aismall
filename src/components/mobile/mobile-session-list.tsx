import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { WeekSession } from "@/data/schedule";
import { kindLabel, phaseOf, rosters } from "@/data/sessions";
import { cn } from "@/lib/cn";

/*
 * 관리자 모바일 회차 목록 — 오늘·일정 탭이 같이 써요(Figma Staff 홈 159:1795의 '오늘 내 회차').
 * 상태 칩은 회차 데이터에서 계산해요: 휴강 · 출석 미확인 n명 · 마감 · 대기 n · 잔여 n석 · 노쇼 위험.
 * 회차 상세·출석부는 PC 화면으로 열려요.
 */
function chipOf(s: WeekSession): { label: string; cls: string } {
  const phase = phaseOf(s);
  if (phase === "cancelled") return { label: "휴강", cls: "bg-neutral-bg text-neutral-fg" };
  if (phase === "ended") {
    const unknown = (rosters[s.id] ?? []).filter((r) => r.status === "confirmed" && r.result === "unknown").length;
    return unknown > 0 ? { label: `출석 미확인 ${unknown}명`, cls: "bg-warning-bg text-warning-fg" } : { label: "종료 · 기록 완료", cls: "bg-success-bg text-success-fg" };
  }
  if (s.booked >= s.capacity) return { label: `마감${s.waitlist ? ` · 대기 ${s.waitlist}` : ""}`, cls: "bg-neutral-bg text-neutral-fg" };
  return { label: `잔여 ${s.capacity - s.booked}석`, cls: "bg-info-bg text-info-fg" };
}

export function MobileSessionList({ sessions, empty = "회차가 없어요" }: { sessions: WeekSession[]; empty?: string }) {
  if (sessions.length === 0) return <p className="rounded-xl border border-line bg-surface p-4 text-body-sm text-fg-secondary">{empty}</p>;
  return (
    <ul className="overflow-hidden rounded-xl border border-line bg-surface">
      {sessions.map((s) => {
        const chip = chipOf(s);
        const ended = phaseOf(s) === "ended";
        const risk = (rosters[s.id] ?? []).some((r) => r.result === "unknown" && r.note?.includes("노쇼 위험")) && !ended;
        const href = ended && chip.label.startsWith("출석") ? `/admin/schedule/${s.id}/attendance` : `/admin/schedule/${s.id}`;
        return (
          <li key={s.id} className="border-b border-line last:border-b-0">
            <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-subtle">
              <span className={cn("w-12 shrink-0 text-label-md", phaseOf(s) === "cancelled" ? "text-fg-muted line-through" : "text-fg")}>{s.time}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-label-md text-fg">{kindLabel[s.kind]}</span>
                <span className="truncate text-caption text-fg-secondary">
                  {s.room} · {s.coach} 강사 · {s.booked}/{s.capacity}명
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn("rounded-md px-2 py-0.5 text-label-sm", chip.cls)}>{chip.label}</span>
                {risk && <span className="rounded-md bg-warning-bg px-2 py-0.5 text-label-sm text-warning-fg">노쇼 위험 1명</span>}
              </span>
              <ArrowUpRight size={14} className="shrink-0 text-fg-muted" aria-label="PC 화면으로 열려요" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
