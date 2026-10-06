import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, Bot, ClipboardList, LayoutGrid, Settings, Smartphone, Users, type LucideIcon } from "lucide-react";
import { MobileHeader, MobileTabBar } from "@/components/mobile/mobile-chrome";

export const metadata: Metadata = { title: "더보기 (모바일) · 재진필라테스" };

/*
 * 관리자 모바일 더보기 — 모바일에서 자주 쓰는 건 아래 탭 4개(오늘·승인함·문의함·일정)이고,
 * 설정·기록처럼 넓은 화면이 필요한 메뉴는 PC 화면으로 열어요.
 */
const desktop: { href: string; label: string; desc: string; icon: LucideIcon; count?: number }[] = [
  { href: "/admin/bookings?tab=pending", label: "예약", desc: "승인 대기 회원 신청 확정·거절", icon: ClipboardList, count: 2 },
  { href: "/admin/programs", label: "프로그램·회차", desc: "정원·확정 방식·마감", icon: LayoutGrid },
  { href: "/admin/members", label: "회원·고객", desc: "예약·문의 이력, AI 요약, 내부 메모", icon: Users },
  { href: "/admin/ai", label: "AI 관리", desc: "업무 유형별 결과, 지켜보기 모드", icon: Bot },
  { href: "/admin/activity", label: "활동 기록", desc: "누가·무엇을·왜, 사건 다시 보기", icon: Activity },
  { href: "/admin/settings", label: "설정", desc: "운영정보·회원 앱·AI 권한·응대 지침", icon: Settings },
];

export default function MobileMorePage() {
  return (
    <>
      <MobileHeader title="더보기" />
      <main className="flex flex-1 flex-col gap-5 p-4 pb-28">
        <section className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-human-bg text-label-md text-human-fg">홍</span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label-md text-fg">홍지수</span>
            <span className="text-caption text-fg-secondary">재진필라테스 강남점 · 사업장 오너</span>
          </span>
          <span className="rounded-md bg-ai-bg px-2 py-0.5 text-label-sm text-ai-fg">AI Level 2</span>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-label-sm text-fg-secondary">PC 화면으로 열려요</h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {desktop.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.href} className="border-b border-line last:border-b-0">
                  <Link href={m.href} className="flex items-center gap-3 px-4 py-3 hover:bg-subtle">
                    <Icon size={18} strokeWidth={1.5} className="shrink-0 text-fg-secondary" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-label-md text-fg">
                        {m.label}
                        {m.count !== undefined && <span className="rounded-full bg-subtle px-1.5 text-caption text-fg-secondary">{m.count}</span>}
                      </span>
                      <span className="truncate text-caption text-fg-secondary">{m.desc}</span>
                    </span>
                    <ArrowUpRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-label-sm text-fg-secondary">다른 화면 미리보기</h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {[
              { href: "/mobile/push", label: "잠금 화면 승인 알림" },
              { href: "/member/home", label: "회원 앱 (김하늘 회원)" },
              { href: "/ask", label: "공개 문의 페이지 (비회원)" },
            ].map((m) => (
              <li key={m.href} className="border-b border-line last:border-b-0">
                <Link href={m.href} className="flex items-center gap-3 px-4 py-3 text-label-md text-fg hover:bg-subtle">
                  <Smartphone size={18} strokeWidth={1.5} className="shrink-0 text-fg-secondary" aria-hidden />
                  <span className="flex-1">{m.label}</span>
                  <ArrowRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <MobileTabBar />
    </>
  );
}
