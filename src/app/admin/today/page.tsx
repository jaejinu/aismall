import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { ApprovalPanel } from "@/components/approval-panel";
import { AiLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { BriefingItem, ResultBlock, ScheduleRow, StatCard } from "@/components/ui/rows";
import { approvals, briefing, today, todaySessions } from "@/data/sample";

export const metadata: Metadata = { title: "오늘 · 재진필라테스" };

const briefingIcon = {
  clock: { icon: Clock, tone: "fg" },
  risk: { icon: AlertTriangle, tone: "warning" },
  attendance: { icon: CheckCircle, tone: "info" },
  failed: { icon: XCircle, tone: "danger" },
} as const;

/* Figma: Desktop / Today (12:2) */
export default function TodayPage() {
  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <header className="flex flex-col gap-0.5">
          <h1 className="text-h1 text-fg">{today.dateLabel}</h1>
          <p className="text-body-md text-fg-secondary">{today.summary}</p>
        </header>

        <section aria-label="오늘 수치" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {today.stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </section>

        <section aria-labelledby="briefing" className="flex flex-col gap-1 rounded-xl border border-ai-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <AiLabel />
            <h2 id="briefing" className="flex-1 text-h3 text-fg">
              오늘 브리핑
            </h2>
            <span className="text-caption text-fg-muted">08:00 갱신 · 실제 집계값만 사용</span>
          </div>
          {briefing.map((b) => (
            <BriefingItem key={b.text} icon={briefingIcon[b.kind].icon} tone={briefingIcon[b.kind].tone} text={b.text} href={b.href} />
          ))}
        </section>

        <section aria-labelledby="sessions" className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 id="sessions" className="flex-1 text-h3 text-fg">
              오늘 회차 {todaySessions.length}
            </h2>
            <Link href="/admin/schedule" className="rounded-md px-3 py-1 text-label-sm text-fg hover:bg-subtle">
              주간 일정 보기
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            {todaySessions.map((s) => (
              <ScheduleRow key={s.time} s={s} />
            ))}
          </div>
        </section>

        <section id="todo" aria-labelledby="todo-title" className="flex flex-col gap-3">
          <h2 id="todo-title" className="text-h3 text-fg">
            확인이 필요한 일
          </h2>
          <ResultBlock
            title="예약은 완료, 메시지는 보내지 못했어요"
            done={["예약 생성 · 강도윤님 10/17(토) 09:00 기구 필라테스"]}
            failed={["메시지 전송 실패 · 알림톡 일시 오류"]}
            actions={
              <>
                <Button size="sm">메시지 다시 보내기</Button>
                <Button size="sm" variant="ghost">
                  직접 연락함으로 확인 처리
                </Button>
              </>
            }
          />
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label-md text-fg">회원 신청 2건 · 관리자 확인 대기</span>
              <span className="text-body-sm text-fg-secondary">윤서아님 10/15(목) 11:00 1:1 레슨 · 강도윤님 휴강 대체 10/17(토) 09:00 기구 · 가장 빠른 만료 내일 09:00</span>
            </div>
            <Link href="/admin/bookings?tab=pending" className="shrink-0 rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
              신청 확인하기
            </Link>
          </div>
          <div id="attendance" className="flex items-center gap-3 rounded-xl border border-line bg-surface p-5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label-md text-fg">출석 미확인 · 오늘 10:00 그룹 필라테스</span>
              <span className="text-body-sm text-fg-secondary">5명 중 3명 기록 · 김하늘·정다은 미확인</span>
            </div>
            <Link href="/admin/schedule/attendance" className="shrink-0 rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
              출석부 열기
            </Link>
          </div>
        </section>
      </main>

      <ApprovalPanel requests={approvals} />
    </div>
  );
}
