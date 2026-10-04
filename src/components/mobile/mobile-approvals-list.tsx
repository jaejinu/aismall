"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Calendar, Home, Inbox, MoreHorizontal, SquareCheck, type LucideIcon } from "lucide-react";
import { ActorBadge, RiskBadge } from "@/components/ui/badges";
import { FilterChip } from "@/components/ui/filter-chip";
import { approvals } from "@/data/sample";
import { stateMeta, type CardState } from "@/data/mobile-approvals";

/*
 * Figma: Mobile / Approvals / 승인함 (121:263)
 * AI·Automation 제안만 모여요. 회원 신청은 예약 '승인 대기'에서 처리해요.
 */
const urgent = (expiresIn: string) => /^\d+시간/.test(expiresIn) && parseInt(expiresIn) <= 3;

const tabs: { label: string; icon: LucideIcon; href?: string; dot?: boolean }[] = [
  { label: "오늘", icon: Home },
  { label: "승인함", icon: SquareCheck, href: "/mobile/approvals", dot: true },
  { label: "문의함", icon: Inbox, dot: true },
  { label: "일정", icon: Calendar },
  { label: "더보기", icon: MoreHorizontal },
];

export function MobileApprovalsList() {
  const [filter, setFilter] = useState<"all" | "urgent" | "customer">("all");
  const list = approvals.filter((a) => filter === "all" || (filter === "urgent" ? urgent(a.expiresIn) : !!a.message));
  const groups = [
    { title: "만료 임박", items: list.filter((a) => urgent(a.expiresIn)) },
    { title: "그 밖의 제안", items: list.filter((a) => !urgent(a.expiresIn)) },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 pb-3 pt-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-h2 text-fg">승인함</h1>
          <p className="text-caption text-fg-muted">강남점 · 홍지수(오너) · AI 제안만 모여요</p>
        </div>
        <Link href="/mobile/push" aria-label="알림 예시" className="flex size-8 items-center justify-center rounded-md hover:bg-subtle">
          <Bell size={18} className="text-fg" aria-hidden />
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="전체" count={approvals.length} selected={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label="만료 임박" count={approvals.filter((a) => urgent(a.expiresIn)).length} selected={filter === "urgent"} onClick={() => setFilter("urgent")} />
          <FilterChip label="고객 영향" count={approvals.filter((a) => a.message).length} selected={filter === "customer"} onClick={() => setFilter("customer")} />
        </div>

        {groups.map((g) => (
          <section key={g.title} className="flex flex-col gap-2">
            <h2 className="text-label-sm text-fg-secondary">
              {g.title} · {g.items.length}
            </h2>
            {g.items.map((a) => (
              <Link key={a.id} href={`/mobile/approvals/${a.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:border-line-strong">
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex flex-wrap gap-1">
                    <ActorBadge actor={a.actor} />
                    <RiskBadge tier={a.risk} />
                  </span>
                  <span className="text-label-md text-fg">{a.title}</span>
                  <span className="text-caption text-fg-secondary">{a.queueMeta}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-fg-secondary" aria-hidden />
              </Link>
            ))}
          </section>
        ))}

        <section className="flex flex-col gap-2 rounded-xl border border-dashed border-line-strong p-4">
          <h2 className="text-label-sm text-fg-secondary">프로토타입 · 카드 상태 미리보기</h2>
          <ul className="flex flex-col">
            {(Object.keys(stateMeta) as CardState[]).map((s) => (
              <li key={s}>
                <Link href={`/mobile/approvals/apr-1?state=${s}`} className="flex items-center justify-between py-1.5 text-body-sm text-link">
                  {stateMeta[s].chip} · {stateMeta[s].preview}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <nav aria-label="관리자 모바일 메뉴" className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[430px] border-t border-line bg-surface px-2 pb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.href === "/mobile/approvals";
          const inner = (
            <>
              <span className="relative">
                <Icon size={22} strokeWidth={1.5} className={active ? "text-fg" : "text-fg-muted"} aria-hidden />
                {t.dot && <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-danger" aria-hidden />}
              </span>
              <span className={active ? "text-caption font-medium text-fg" : "text-caption text-fg-muted"}>{t.label}</span>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} aria-current="page" className="flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2">
              {inner}
            </Link>
          ) : (
            <span key={t.label} title="모바일 화면은 승인함만 만들었어요" className="flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2 opacity-60">
              {inner}
            </span>
          );
        })}
      </nav>
    </>
  );
}
