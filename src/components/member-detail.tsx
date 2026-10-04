"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle } from "lucide-react";
import { AiLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import type { BookingHistory, Person } from "@/data/members";
import { cn } from "@/lib/cn";

/*
 * 회원·고객 상세 — Figma 화면 없음 · manyfast 와이어프레임 n53 기준.
 * AI 요약은 근거와 함께, 숫자 신뢰도 없이. 내부 메모는 회원에게 보이지 않아요.
 */
const toneCls: Record<BookingHistory["tone"], string> = {
  confirmed: "bg-success-bg text-success-fg",
  pending: "bg-info-bg text-info-fg",
  waitlisted: "bg-neutral-bg text-neutral-fg",
  cancelled: "bg-neutral-bg text-fg-muted",
};
const resultCls = (r: string) => (r === "출석" ? "text-success-fg" : r === "노쇼" ? "text-danger-fg" : r === "미확인" ? "text-fg-secondary" : "text-fg-muted");

export function MemberDetail({ person: p }: { person: Person }) {
  const [memo, setMemo] = useState(p.memo ?? "");
  const [savedMemo, setSavedMemo] = useState(p.memo ?? "");
  const [toast, setToast] = useState<string | null>(null);
  const lead = p.kind === "lead";

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <Link href="/admin/members" className="inline-flex items-center gap-1 self-start text-label-sm text-link">
        <ArrowLeft size={16} aria-hidden />
        회원·고객 목록으로
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-human-bg text-h3 text-human-fg">{p.name[0]}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="flex items-center gap-2 text-h1 text-fg">
            {p.name}
            <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-label-sm text-neutral-fg">{lead ? "문의 고객" : "회원"}</span>
          </h1>
          <p className="text-body-md text-fg-secondary">
            {p.phone} · {lead ? p.joined : `가입 ${p.joined}`} · 강남점
          </p>
        </div>
        <Link href="/admin/activity" className="rounded-md px-4 py-2 text-label-md text-fg hover:bg-subtle">
          활동 기록 보기
        </Link>
      </header>

      {toast && memo === savedMemo && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          {toast}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-h3 text-fg">기본 정보</h2>
            <dl className="flex flex-col gap-2 text-body-sm">
              {[
                ["최근 30일 출석", lead ? "—" : `${p.stats.attended}회`],
                ["노쇼", lead ? "—" : `${p.stats.noshow}회`],
                ["대기 중", lead ? "—" : `${p.stats.waiting}건`],
                ["예약 안내 수신", p.consent.booking ? "동의" : "동의 없음"],
                ["광고성 수신", p.consent.marketing ? "동의" : "동의 없음"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-fg-secondary">{k}</dt>
                  <dd className={cn("text-label-md", v === "동의 없음" && k === "예약 안내 수신" ? "text-warning-fg" : "text-fg")}>{v}</dd>
                </div>
              ))}
            </dl>
            {!p.consent.booking && (
              <p className="rounded-lg bg-warning-bg px-3 py-2 text-body-sm text-warning-fg">수신 동의가 없어 알림·참석 확인을 보내지 않아요. 필요하면 직접 연락해요.</p>
            )}
            {p.risk && (
              <p className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-body-sm text-fg">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden />
                <span>
                  {p.risk} · 회원에게는 보이지 않고, 예약을 막지 않아요.
                </span>
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-ai-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-h3 text-fg">{lead ? "AI 문의 요약" : "AI 이용 요약"}</h2>
              <AiLabel />
            </div>
            <ul className="flex flex-col gap-1.5 text-body-sm text-fg">
              {p.summary.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
            <p className="border-t border-line pt-2 text-caption text-fg-muted">근거: {p.summaryBasis}</p>
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-h3 text-fg">내부 메모</h2>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="직원끼리만 보는 메모예요. 회원에게는 보이지 않아요."
              aria-label="내부 메모"
              className="rounded-md border border-line bg-surface p-3 text-body-sm text-fg focus:border-line-strong focus:outline-none"
            />
            <Button
              variant="primary"
              size="sm"
              className="self-end"
              disabled={memo === savedMemo}
              onClick={() => {
                setSavedMemo(memo);
                setToast("메모를 저장했어요");
              }}
            >
              메모 저장
            </Button>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <h2 className="border-b border-line px-5 py-4 text-h3 text-fg">예약 이력</h2>
            {p.bookings.length === 0 ? (
              <p className="px-5 py-6 text-body-sm text-fg-secondary">아직 예약이 없어요. 회원 앱에 가입하면 직접 예약할 수 있어요.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-body-sm">
                  <thead className="border-b border-line bg-subtle text-label-sm text-fg-secondary">
                    <tr>
                      <th className="px-5 py-2 font-medium">일시</th>
                      <th className="px-4 py-2 font-medium">프로그램</th>
                      <th className="px-4 py-2 font-medium">예약 상태</th>
                      <th className="px-4 py-2 font-medium">이용 결과</th>
                      <th className="px-4 py-2 font-medium">
                        <span className="sr-only">이동</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.bookings.map((b) => (
                      <tr key={`${b.when}-${b.program}`} className="border-b border-line last:border-b-0">
                        <td className="whitespace-nowrap px-5 py-3 text-fg">{b.when}</td>
                        <td className="px-4 py-3 text-fg">{b.program}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-md px-2 py-0.5 text-label-sm", toneCls[b.tone])}>{b.status}</span>
                        </td>
                        <td className={cn("px-4 py-3 text-label-sm", resultCls(b.result))}>{b.result}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {b.href && (
                            <Link href={b.href} className="text-label-sm text-link">
                              보기
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <h2 className="border-b border-line px-5 py-4 text-h3 text-fg">문의 이력</h2>
            {p.inquiries.length === 0 ? (
              <p className="px-5 py-6 text-body-sm text-fg-secondary">최근 문의가 없어요.</p>
            ) : (
              <ul>
                {p.inquiries.map((q) => (
                  <li key={q.when} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
                    <span className="w-24 shrink-0 text-caption text-fg-muted">{q.when}</span>
                    <span className="min-w-0 flex-1 text-body-sm text-fg">{q.text}</span>
                    <span className="text-caption text-fg-secondary">{q.state}</span>
                    {q.href && (
                      <Link href={q.href} className="text-label-sm text-link">
                        문의함에서 보기
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
