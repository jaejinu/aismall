"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle, FileSpreadsheet, Mail } from "lucide-react";
import { AiLabel, RiskBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";

/*
 * 연결된 앱 — Figma 화면 없음 · manyfast 와이어프레임 n127 기준.
 * 회차가 기준이에요. 외부 캘린더에서 바뀐 건 회차·예약에 자동으로 반영하지 않고 확인을 받아요.
 * AI는 캘린더를 회차 편성 제안의 근거로 읽기만 하고, 답장은 항상 사람이 보내요(와이어프레임의 'AI 답변 발송 허용'은 뺐어요).
 */
type Conflict = { id: string; text: string; detail: string };

export function IntegrationsSettings() {
  const [connected, setConnected] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([
    {
      id: "c1",
      text: "Google Calendar에서 '10/17(토) 09:00 기구 필라테스' 일정이 지워졌어요",
      detail: "강남점 회차는 그대로 있고 확정 3명 · 승인 대기 1명이 있어요. 캘린더에서 지운 건 회차에 반영하지 않아요.",
    },
  ]);
  const [toast, setToast] = useState<string | null>(null);

  const resolve = (id: string, text: string) => {
    setConflicts((c) => c.filter((x) => x.id !== id));
    setToast(text);
  };

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <p className="text-caption text-fg-muted">
          <Link href="/admin/settings" className="hover:text-fg">
            설정
          </Link>{" "}
          › 연결된 앱
        </p>
        <header className="flex flex-col gap-0.5">
          <h1 className="text-h1 text-fg">연결된 앱</h1>
          <p className="text-body-md text-fg-secondary">외부 앱과 주고받는 범위를 확인해요. 회차와 예약은 이 서비스가 기준이에요.</p>
        </header>

        {toast && (
          <p role="status" className="flex max-w-[760px] items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            <CheckCircle size={16} aria-hidden />
            {toast}
          </p>
        )}

        <section className="flex max-w-[760px] flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-info-bg text-info-fg">
              <CalendarDays size={20} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-label-md text-fg">Google Calendar</span>
              <span className="text-caption text-fg-secondary">{connected ? "연결됨 · 홍지수 계정 · 마지막 동기화 10/14 12:58" : "연결 안 됨"}</span>
            </span>
            {connected ? (
              <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
                연결 끊기
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => {
                  setConnected(true);
                  setToast("Google Calendar를 다시 연결했어요");
                }}>
                다시 연결
              </Button>
            )}
          </div>
          {connected && (
            <dl className="grid gap-3 border-t border-line pt-4 text-body-sm sm:grid-cols-3">
              <div>
                <dt className="text-caption text-fg-muted">주고받는 것</dt>
                <dd className="text-fg">강남점 회차를 캘린더에 표시 · 캘린더 일정 읽기</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-caption text-fg-muted">
                  AI <AiLabel />
                </dt>
                <dd className="text-fg">회차 편성 제안의 근거로 읽기만 해요 · 캘린더에 쓰지 않아요</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-muted">Automation</dt>
                <dd className="text-fg">꺼져 있어서 쓰지 않아요</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="flex max-w-[760px] flex-col gap-3">
          <h2 className="text-h3 text-fg">연결할 수 있는 앱</h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {[
              { icon: Mail, name: "Gmail", desc: "사람이 보낸 답장을 메일로도 보내기 · AI가 직접 보내지는 않아요" },
              { icon: FileSpreadsheet, name: "Google Sheets", desc: "예약·출석 기록을 시트로 내보내기 · 회원 연락처는 빼고 보내요" },
            ].map((a) => (
              <li key={a.name} className="flex items-center gap-3 border-b border-line px-5 py-4 last:border-b-0">
                <span className="flex size-10 items-center justify-center rounded-lg bg-subtle text-fg-secondary">
                  <a.icon size={20} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label-md text-fg">{a.name}</span>
                  <span className="text-caption text-fg-secondary">{a.desc}</span>
                </span>
                <Button size="sm" onClick={() => setToast(`${a.name} 연결은 프로토타입이라 실제로 하지 않아요`)}>
                  연결하기
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[400px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <h2 className="text-h3 text-fg">동기화 충돌 {conflicts.length}건</h2>
        {conflicts.length === 0 && <p className="rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">확인할 충돌이 없어요.</p>}
        {conflicts.map((c) => (
          <article key={c.id} className="flex flex-col gap-2 rounded-lg border border-line p-4">
            <p className="flex items-start gap-2 text-label-md text-fg">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden />
              {c.text}
            </p>
            <p className="text-body-sm text-fg-secondary">{c.detail}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => resolve(c.id, "충돌을 그대로 두기로 했어요 · 회차는 바뀌지 않아요")}>
                그대로 두기
              </Button>
              <Button size="sm" onClick={() => resolve(c.id, "캘린더에 회차를 다시 표시했어요")}>
                캘린더에 다시 표시
              </Button>
            </div>
            <Link href="/admin/schedule/S-1017-09" className="text-label-sm text-link">
              회차 보기
            </Link>
          </article>
        ))}
        <div className="flex flex-col gap-1 rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">
          <span className="text-label-md text-fg">외부 앱 규칙</span>
          <span>· 외부에서 바뀐 건 회차·예약을 자동으로 바꾸지 않아요</span>
          <span>· 회원 개인정보는 외부 앱으로 보내지 않아요</span>
          <span>· 연결 끊기는 위험 중간이라 한 번 더 확인해요</span>
        </div>
      </aside>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4" role="dialog" aria-modal="true" aria-labelledby="disc-title">
          <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-xl bg-surface p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <h2 id="disc-title" className="flex-1 text-h3 text-fg">
                Google Calendar 연결을 끊을까요?
              </h2>
              <RiskBadge tier="medium" />
            </div>
            <p className="text-body-md text-fg-secondary">회차가 캘린더에 더 이상 표시되지 않고, AI가 캘린더 일정을 근거로 쓰지 않아요. 회차와 예약은 그대로예요.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConnected(false);
                  setConflicts([]);
                  setConfirm(false);
                  setToast("Google Calendar 연결을 끊었어요 · 기록은 남아요");
                }}
              >
                연결 끊기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
