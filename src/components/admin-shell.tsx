"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  Calendar,
  ChevronsUpDown,
  ClipboardList,
  Home,
  Inbox,
  LayoutGrid,
  Search,
  Settings,
  SquareCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AiLabel, CountBadge } from "@/components/ui/badges";
import { cn } from "@/lib/cn";

/* Figma: Nav Item (10:117) — 꺼진 모듈의 메뉴는 노출하지 않는다. Count는 처리할 건수에만. */
type NavItem = { href: string; label: string; icon: LucideIcon; count?: number };

const mainNav: NavItem[] = [
  { href: "/admin/today", label: "오늘", icon: Home },
  { href: "/admin/inbox", label: "문의함", icon: Inbox, count: 5 },
  { href: "/admin/approvals", label: "승인함", icon: SquareCheck, count: 3 },
  { href: "/admin/schedule", label: "일정", icon: Calendar },
  { href: "/admin/bookings", label: "예약", icon: ClipboardList, count: 2 },
  { href: "/admin/programs", label: "프로그램·회차", icon: LayoutGrid },
  { href: "/admin/members", label: "회원·고객", icon: Users },
];

const aiNav: NavItem[] = [
  { href: "/admin/ai", label: "AI 관리", icon: Bot },
  { href: "/admin/activity", label: "활동 기록", icon: Activity },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2",
        active ? "bg-subtle text-label-md text-fg" : "text-body-md text-fg-secondary hover:bg-subtle hover:text-fg",
      )}
    >
      <Icon size={16} className="shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.count !== undefined && <CountBadge count={item.count} />}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-0.5 border-r border-line bg-surface px-3 py-4 lg:flex">
        <button type="button" className="mb-3 flex cursor-pointer items-center gap-2 rounded-md p-2 text-left hover:bg-subtle">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-label-md text-on-primary">바</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-label-md text-fg">재진필라테스</span>
            <span className="text-caption text-fg-muted">강남점 · 사업장 오너</span>
          </span>
          <ChevronsUpDown size={16} className="text-fg" aria-label="지점 바꾸기" />
        </button>
        <nav aria-label="주 메뉴" className="flex flex-col gap-0.5">
          {mainNav.map((n) => (
            <NavLink key={n.href} item={n} active={pathname.startsWith(n.href)} />
          ))}
          <p className="px-3 pb-1 pt-4 text-label-sm text-fg-muted">AI · 기록</p>
          {aiNav.map((n) => (
            <NavLink key={n.href} item={n} active={pathname.startsWith(n.href)} />
          ))}
        </nav>
        <div className="flex-1" />
        <div className="mb-1 flex flex-col gap-0.5 rounded-lg bg-subtle p-3 text-caption">
          <span className="text-label-sm text-fg">필요할 때 켜서 쓰세요</span>
          <span className="text-fg-secondary">Automation · Analytics는 꺼져 있어요</span>
          <Link href="/admin/settings" className="text-label-sm text-link">
            모듈 켜기
          </Link>
        </div>
        <NavLink item={{ href: "/admin/settings", label: "설정", icon: Settings }} active={pathname.startsWith("/admin/settings")} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface px-6 py-3">
          <label className="flex w-full max-w-[420px] items-center gap-2 rounded-md bg-subtle px-3 py-2">
            <Search size={16} className="shrink-0 text-fg" aria-hidden />
            <input
              placeholder="회원 · 예약 · 명령 검색 (초성, 전화번호 뒷자리)"
              className="min-w-0 flex-1 bg-transparent text-body-sm text-fg placeholder:text-fg-muted focus:outline-none"
            />
            <kbd className="rounded-sm border border-line bg-surface px-1 py-0.5 text-caption text-fg-secondary">⌘K</kbd>
          </label>
          <div className="flex-1" />
          <span className="hidden items-center gap-2 rounded-full border border-ai-border bg-ai-bg py-1 pl-1 pr-3 md:inline-flex">
            <AiLabel />
            <span className="text-label-sm text-ai-fg">승인 후 실행 · Level 2</span>
          </span>
          <button type="button" className="relative flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-subtle" aria-label="알림 1건">
            <Bell size={16} className="text-fg" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger" />
          </button>
          <span className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-human-bg text-label-sm text-human-fg">홍</span>
            <span className="hidden text-label-md text-fg sm:inline">홍지수</span>
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
