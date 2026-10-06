"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MobileHeader, MobileTabBar } from "@/components/mobile/mobile-chrome";
import { ActorBadge, RiskBadge } from "@/components/ui/badges";
import { FilterChip } from "@/components/ui/filter-chip";
import { approvals } from "@/data/sample";
import { stateMeta, type CardState } from "@/data/mobile-approvals";

/*
 * Figma: Mobile / Approvals / 승인함 (121:263)
 * AI·Automation 제안만 모여요. 회원 신청은 예약 '승인 대기'에서 처리해요.
 */
const urgent = (expiresIn: string) => /^\d+시간/.test(expiresIn) && parseInt(expiresIn) <= 3;

export function MobileApprovalsList() {
  const [filter, setFilter] = useState<"all" | "urgent" | "customer">("all");
  const list = approvals.filter((a) => filter === "all" || (filter === "urgent" ? urgent(a.expiresIn) : !!a.message));
  const groups = [
    { title: "만료 임박", items: list.filter((a) => urgent(a.expiresIn)) },
    { title: "그 밖의 제안", items: list.filter((a) => !urgent(a.expiresIn)) },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <MobileHeader title="승인함" sub="강남점 · 홍지수(오너) · AI 제안만 모여요" />

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

      <MobileTabBar />
    </>
  );
}
