"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";
import { FilterChip } from "@/components/ui/filter-chip";
import { people } from "@/data/members";
import { cn } from "@/lib/cn";

/*
 * 회원·고객 목록 — Figma 화면 없음 · manyfast 와이어프레임 n51 기준.
 * 사업장 오너·매니저·직원은 배정 지점(강남점) 고객만 봐요. 노쇼 위험은 점수 없이 표시만 해요.
 */
type Tab = "all" | "member" | "lead";

export function MembersView() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const q = query.trim();
  const list = people.filter((p) => (tab === "all" || p.kind === tab) && (!q || p.name.includes(q) || p.phone.replaceAll("-", "").includes(q.replaceAll("-", ""))));

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-h1 text-fg">회원·고객</h1>
        <p className="text-body-md text-fg-secondary">강남점 · 배정 지점 고객만 보여요 · 회원은 직접 예약하고, 문의 고객은 가입 없이 문의 페이지로 문의해요</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-64 items-center gap-2 rounded-md border border-line bg-surface px-3">
          <Search size={16} className="text-fg-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 전화번호 뒷자리"
            aria-label="이름, 전화번호 검색"
            className="min-w-0 flex-1 bg-transparent text-body-sm text-fg outline-none"
          />
        </label>
        <FilterChip label="전체" count={people.length} selected={tab === "all"} onClick={() => setTab("all")} />
        <FilterChip label="회원" count={people.filter((p) => p.kind === "member").length} selected={tab === "member"} onClick={() => setTab("member")} />
        <FilterChip label="문의 고객" count={people.filter((p) => p.kind === "lead").length} selected={tab === "lead"} onClick={() => setTab("lead")} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[960px] text-left text-body-sm">
          <thead className="border-b border-line bg-subtle text-label-sm text-fg-secondary">
            <tr>
              <th className="px-4 py-2 font-medium">이름</th>
              <th className="px-4 py-2 font-medium">연락처</th>
              <th className="px-4 py-2 font-medium">다음 예약</th>
              <th className="px-4 py-2 font-medium">최근 30일</th>
              <th className="px-4 py-2 font-medium">최근 문의</th>
              <th className="px-4 py-2 font-medium">예약 안내 수신</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-fg-secondary">
                  찾는 고객이 없어요.
                </td>
              </tr>
            )}
            {list.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-b-0 hover:bg-subtle/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/members/${p.id}`} className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-human-bg text-caption text-human-fg">{p.name[0]}</span>
                    <span className="flex flex-col">
                      <span className="flex items-center gap-1.5 text-label-md text-fg hover:underline">
                        {p.name}
                        {p.kind === "lead" && <span className="rounded-full bg-neutral-bg px-1.5 text-caption text-neutral-fg">문의 고객</span>}
                      </span>
                      {p.risk && (
                        <span className="inline-flex items-center gap-1 text-caption text-warning-fg">
                          <AlertTriangle size={12} aria-hidden />
                          노쇼 위험 높음
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-fg-secondary">{p.phone}</td>
                <td className="px-4 py-3 text-fg">{p.next ?? <span className="text-fg-muted">—</span>}</td>
                <td className="px-4 py-3 text-fg-secondary">
                  {p.kind === "lead" ? "—" : `출석 ${p.stats.attended} · 노쇼 ${p.stats.noshow}${p.stats.waiting ? ` · 대기 ${p.stats.waiting}` : ""}`}
                </td>
                <td className="px-4 py-3 text-fg-secondary">{p.inquiries[0] ? `${p.inquiries[0].when.split(" ")[0]} ${p.inquiries[0].text}` : "—"}</td>
                <td className={cn("whitespace-nowrap px-4 py-3", p.consent.booking ? "text-fg" : "text-warning-fg")}>{p.consent.booking ? "동의" : "동의 없음"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-fg-muted">노쇼 위험은 관리자에게만 보이고 참석 확인에만 써요. 노쇼 위험을 이유로 예약을 막거나 취소하지 않아요.</p>
    </main>
  );
}
