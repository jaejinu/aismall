import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle, Clock, type LucideIcon } from "lucide-react";
import { MemberHeader } from "@/components/member/member-shell";
import { memberNotices, type NoticeKind } from "@/data/notices";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "내 알림 · 재진필라테스" };

const icon: Record<NoticeKind, LucideIcon> = { waitlist: AlertTriangle, "open-seat": Bell, attendance: Clock, confirmed: CheckCircle };

function NoticeList({ items }: { items: typeof memberNotices }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {items.map((n) => {
        const Icon = icon[n.kind];
        return (
          <li key={n.id}>
            <Link href={n.href ?? "#"} className="flex gap-3 px-4 py-3 hover:bg-subtle">
              <Icon size={16} className={cn("mt-0.5 shrink-0", n.unread ? "text-fg" : "text-fg-secondary")} aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn("text-body-md", n.unread ? "font-medium text-fg" : "text-fg")}>{n.title}</span>
                <span className="text-caption text-fg-muted">{n.meta}</span>
              </span>
              {n.unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-info-fg" aria-label="읽지 않음" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* Figma: Member / 내 알림 (129:1255) */
export default function MemberNotificationsPage() {
  const fresh = memberNotices.filter((n) => n.unread);
  const old = memberNotices.filter((n) => !n.unread);
  return (
    <>
      <MemberHeader title="내 알림" subtitle="재진필라테스 강남점 · 김하늘님" />
      <main className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-2">
          <h2 className="text-label-sm text-fg-muted">새 알림 · {fresh.length}</h2>
          <NoticeList items={fresh} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-label-sm text-fg-muted">지난 알림</h2>
          <NoticeList items={old} />
        </section>
        <Link href="/member/me" className="self-center text-label-sm text-fg-secondary hover:text-fg">
          알림 받는 방법 바꾸기
        </Link>
      </main>
    </>
  );
}
