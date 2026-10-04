import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Clock, MessageCircle, Sparkles } from "lucide-react";
import { MemberHeader } from "@/components/member/member-shell";
import { StatusChip } from "@/components/ui/badges";
import { memberSessions, programLabel, week, type MemberSession } from "@/data/member";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "홈 · 재진필라테스" };

function day(s: MemberSession) {
  const w = week.find((x) => x.date === s.day)!;
  return `10/${w.num}(${w.day})`;
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center">
        <h2 className="flex-1 text-label-sm text-fg-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* manyfast 와이어프레임 n23 '회원 홈 화면' — Figma에는 아직 이 화면이 없어 디자인 시스템으로 구성 */
export default function MemberHomePage() {
  const booked = memberSessions.filter((s) => s.state === "booked");
  const waiting = memberSessions.filter((s) => s.state === "waitlisted");
  const open = memberSessions.filter((s) => s.state === "open").slice(0, 3);

  return (
    <>
      <MemberHeader title="재진필라테스 강남점" subtitle="회원 · 김하늘" />
      <main className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-h2 text-fg">안녕하세요, 하늘님</p>
          <p className="text-body-sm text-fg-secondary">내일 오전 10:00 그룹 필라테스가 있어요.</p>
        </div>

        <Section
          title="다가오는 예약"
          action={
            <Link href="/member/bookings" className="inline-flex items-center text-label-sm text-fg-secondary hover:text-fg">
              전체 보기
              <ChevronRight size={14} aria-hidden />
            </Link>
          }
        >
          {booked.map((s) => (
            <Link key={s.id} href="/member/bookings" className="flex items-center gap-3 rounded-lg border border-success-fg/30 bg-success-bg px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-label-md text-fg">{programLabel[s.kind]}</span>
                <span className="text-caption text-fg-secondary">
                  {day(s)} {s.time} · {s.coach} · {s.room}
                </span>
              </div>
              <StatusChip status="confirmed" />
            </Link>
          ))}
          {waiting.map((s) => (
            <Link key={s.id} href="/member/bookings" className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-label-md text-fg">{programLabel[s.kind]}</span>
                <span className="text-caption text-fg-secondary">
                  {day(s)} {s.time} · 대기 신청은 예약이 아니에요
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-label-sm text-info-fg">
                <Clock size={12} aria-hidden />
                대기 {s.myWaitNo}번
              </span>
            </Link>
          ))}
        </Section>

        <Section title="확인 중인 문의">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
            <MessageCircle size={16} className="shrink-0 text-fg-secondary" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label-md text-fg">10/16(금) 19:00 그룹 필라테스 · 2명</span>
              <span className="text-caption text-fg-secondary">정다은님과 함께 · 스튜디오에서 확인하고 있어요. 확정되면 알림톡으로 알려 드려요.</span>
            </div>
          </div>
        </Section>

        <Section
          title="이번 주 자리 있는 회차"
          action={
            <Link href="/member/schedule" className="inline-flex items-center text-label-sm text-fg-secondary hover:text-fg">
              수업 전체
              <ChevronRight size={14} aria-hidden />
            </Link>
          }
        >
          {open.map((s) => {
            const left = s.capacity - s.booked;
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-label-md text-fg">
                    {programLabel[s.kind]} · {day(s)} {s.time}
                  </span>
                  <span className={cn("text-caption", left <= 2 ? "text-warning-fg" : "text-fg-secondary")}>
                    {s.booked}/{s.capacity}명 · {left}자리 남음
                  </span>
                </div>
                <Link href="/member/schedule" className="shrink-0 rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
                  보기
                </Link>
              </div>
            );
          })}
        </Section>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-body-sm text-fg-secondary">원하는 시간을 찾기 어려우세요?</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/member/schedule" className="flex items-center justify-center rounded-md bg-secondary px-4 py-3 text-label-md text-on-secondary hover:bg-secondary-hover">
              수업 둘러보기
            </Link>
            <Link href="/member/assistant" className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-label-md text-on-primary hover:bg-primary-hover">
              <Sparkles size={16} aria-hidden />
              AI 도우미에게 묻기
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
