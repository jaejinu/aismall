"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, Calendar, Home, Inbox, MoreHorizontal, SquareCheck, type LucideIcon } from "lucide-react";

/*
 * 관리자 모바일 공통 틀 — 상단 제목과 하단 탭 5개(오늘·승인함·문의함·일정·더보기).
 * Figma: Mobile Approvals 121:263 하단 탭, Staff 홈 159:1795 헤더.
 * 승인함·문의함 점은 처리할 일이 있다는 표시예요(승인 대기 3 · 답장 전 문의).
 */
const tabs: { label: string; icon: LucideIcon; href: string; dot?: boolean }[] = [
  { label: "오늘", icon: Home, href: "/mobile/today" },
  { label: "승인함", icon: SquareCheck, href: "/mobile/approvals", dot: true },
  { label: "문의함", icon: Inbox, href: "/mobile/inbox", dot: true },
  { label: "일정", icon: Calendar, href: "/mobile/schedule" },
  { label: "더보기", icon: MoreHorizontal, href: "/mobile/more" },
];

/* active: 하위 화면(출석부 등)에서 강조할 탭 주소. 없으면 지금 주소로 정해요. */
export function MobileTabBar({ active: activeHref }: { active?: string } = {}) {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 모바일 메뉴" className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[430px] border-t border-line bg-surface px-2 pb-5">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = (activeHref ?? pathname).startsWith(t.href);
        return (
          <Link key={t.label} href={t.href} aria-current={active ? "page" : undefined} className="flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2">
            <span className="relative">
              <Icon size={22} strokeWidth={1.5} className={active ? "text-fg" : "text-fg-muted"} aria-hidden />
              {t.dot && <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-danger" aria-hidden />}
            </span>
            <span className={active ? "text-caption font-medium text-fg" : "text-caption text-fg-muted"}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileHeader({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface px-4 pb-3 pt-4">
      {back && (
        <Link href={back} aria-label="뒤로" className="-ml-1 flex size-8 items-center justify-center rounded-md hover:bg-subtle">
          <ArrowLeft size={18} className="text-fg" aria-hidden />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className={back ? "truncate text-h3 text-fg" : "text-h2 text-fg"}>{title}</h1>
        {sub && <p className="truncate text-caption text-fg-muted">{sub}</p>}
      </div>
      <Link href="/mobile/push" aria-label="알림 예시" className="flex size-8 items-center justify-center rounded-md hover:bg-subtle">
        <Bell size={18} className="text-fg" aria-hidden />
      </Link>
    </header>
  );
}

/* PC 화면으로만 있는 기능으로 가는 링크 — 모바일 틀 밖으로 나간다는 걸 알려요. */
export const desktopNote = "PC 화면으로 열려요";
