"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Calendar, ClipboardList, Home, Sparkles, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/* Figma: 회원 모바일 하단 탭 — 홈 · 수업 · 내 예약 · AI 도우미 · 내 정보 */
const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/member/home", label: "홈", icon: Home },
  { href: "/member/schedule", label: "수업", icon: Calendar },
  { href: "/member/bookings", label: "내 예약", icon: ClipboardList },
  { href: "/member/assistant", label: "AI 도우미", icon: Sparkles },
  { href: "/member/me", label: "내 정보", icon: User },
];

export function MemberHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex items-center gap-3 bg-surface px-4 pb-3 pt-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="text-h3 text-fg">{title}</h1>
        <p className="text-caption text-fg-muted">{subtitle}</p>
      </div>
      <Link href="/member/notifications" aria-label="알림" className="flex size-8 items-center justify-center rounded-md hover:bg-subtle">
        <Bell size={16} className="text-fg" />
      </Link>
    </header>
  );
}

export function MemberShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-canvas sm:border-x sm:border-line">
      <div className="flex flex-1 flex-col pb-20">{children}</div>
      <nav
        aria-label="회원 메뉴"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[430px] border-t border-line bg-surface px-2 pb-5"
      >
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2"
            >
              <Icon size={24} strokeWidth={1.5} className={active ? "text-fg" : "text-fg-muted"} aria-hidden />
              <span className={cn("text-caption", active ? "font-medium text-fg" : "text-fg-muted")}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
