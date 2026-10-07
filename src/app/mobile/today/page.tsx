import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ActorBadge, AiLabel, RiskBadge } from "@/components/ui/badges";
import { StatCard } from "@/components/ui/rows";
import { MobileHeader, MobileTabBar } from "@/components/mobile/mobile-chrome";
import { MobileResendBlock } from "@/components/mobile/mobile-resend-block";
import { MobileSessionList } from "@/components/mobile/mobile-session-list";
import { approvals, briefing, today } from "@/data/sample";
import { weekSessions } from "@/data/schedule";

export const metadata: Metadata = { title: "오늘 (모바일) · 재진필라테스" };

/*
 * 관리자 모바일 오늘 — 데스크톱 오늘(12:2)을 한 손으로 보는 순서로 줄였어요.
 * 위에서부터: 수치 → 가장 급한 승인 → AI 브리핑 → 확인이 필요한 일 → 오늘 회차. Figma 참고: Staff 홈 159:1795.
 */
const mobileHref: Record<(typeof briefing)[number]["kind"], string> = {
  clock: "/mobile/approvals",
  risk: "/mobile/approvals",
  attendance: "/mobile/attendance/S-1014-10",
  failed: "#todo",
};

export default function MobileTodayPage() {
  const first = approvals[0];
  return (
    <>
      <MobileHeader title={today.dateLabel} sub="강남점 · 홍지수(오너) · 회차 5개 · 예약 23건" />
      <main className="flex flex-1 flex-col gap-5 p-4 pb-28">
        <section aria-label="오늘 수치" className="grid grid-cols-2 gap-2">
          {today.stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </section>

        <section aria-labelledby="urgent" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <h2 id="urgent" className="text-label-sm text-fg-secondary">
            승인 대기 {approvals.length}건 · 가장 급한 요청
          </h2>
          <div className="flex flex-col gap-1.5">
            <span className="flex flex-wrap gap-1">
              <ActorBadge actor={first.actor} />
              <RiskBadge tier={first.risk} />
            </span>
            <span className="text-label-md text-fg">{first.title}</span>
            <span className="text-caption text-fg-secondary">{first.queueMeta}</span>
          </div>
          <Link href={`/mobile/approvals/${first.id}`} className="flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-label-md text-on-primary hover:bg-primary-hover">
            승인 카드 열기
          </Link>
        </section>

        <section aria-labelledby="briefing" className="flex flex-col gap-1 rounded-xl border border-ai-border bg-surface p-4">
          <div className="flex items-center gap-2 pb-1">
            <AiLabel />
            <h2 id="briefing" className="flex-1 text-h3 text-fg">
              오늘 브리핑
            </h2>
            <span className="text-caption text-fg-muted">08:00 갱신</span>
          </div>
          {briefing.map((b) => (
            <Link key={b.text} href={mobileHref[b.kind]} className="flex items-start gap-2 rounded-md py-2 text-body-sm text-fg hover:bg-subtle">
              <span className="flex-1">{b.text}</span>
              {mobileHref[b.kind].startsWith("/admin") ? (
                <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-fg-muted" aria-label="PC 화면으로 열려요" />
              ) : (
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden />
              )}
            </Link>
          ))}
        </section>

        <section id="todo" aria-labelledby="todo-title" className="flex scroll-mt-20 flex-col gap-2">
          <h2 id="todo-title" className="text-h3 text-fg">
            확인이 필요한 일
          </h2>
          <MobileResendBlock />
          <Link href="/admin/bookings?tab=pending" className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:bg-subtle">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label-md text-fg">회원 신청 2건 · 관리자 확인 대기</span>
              <span className="text-caption text-fg-secondary">윤서아님 1:1 레슨 · 강도윤님 휴강 대체 기구 · 가장 빠른 만료 내일 09:00</span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 text-fg-muted" aria-label="PC 화면으로 열려요" />
          </Link>
        </section>

        <section aria-labelledby="sessions" className="flex flex-col gap-2">
          <div className="flex items-center">
            <h2 id="sessions" className="flex-1 text-h3 text-fg">
              오늘 회차 5
            </h2>
            <Link href="/mobile/schedule" className="rounded-md px-2 py-1 text-label-sm text-fg hover:bg-subtle">
              일정 보기
            </Link>
          </div>
          <MobileSessionList sessions={weekSessions.filter((s) => s.day === "2026-10-14")} />
          <p className="text-caption text-fg-muted">출석 미확인 회차는 모바일 출석부로, 회차 상세는 PC 화면으로 열려요.</p>
        </section>
      </main>
      <MobileTabBar />
    </>
  );
}
