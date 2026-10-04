"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

/*
 * 모듈 관리 — Figma 화면 없음 · manyfast 와이어프레임 n126 기준.
 * v1에 없는 이용권(Pass)·예약 작업(Job) 모듈은 뺐어요. 여러 지점 브랜드는 Team을 끌 수 없어요.
 * 모듈을 끄면 메뉴가 숨겨지고 새 제안·자동 실행이 멈춰요. 진행 중인 일은 끝까지 하거나 보류해요.
 */
type ModuleId = "team" | "automation" | "integrations" | "analytics" | "search";
type Mod = { id: ModuleId; name: string; obj?: "를"; desc: string; group: string; locked?: string; onEffect: string; offEffect?: { rows: [string, string][] } };

const modules: Mod[] = [
  {
    id: "team",
    name: "Team",
    desc: "직원 초대, 역할, 승인 라우팅, 오프보딩",
    group: "운영",
    locked: "여러 지점 브랜드라 끌 수 없어요",
    onEffect: "",
  },
  {
    id: "automation",
    name: "Automation",
    desc: "정해 둔 조건에 맞으면 리마인드·후기 요청 같은 일을 대신해요",
    group: "자동화와 연결",
    onEffect: "켜도 바로 실행되는 규칙은 없어요. 규칙마다 지켜보기 모드로 먼저 시작하고, 결과를 본 뒤 켜요. Automation은 예약을 바꾸지 않아요.",
    offEffect: { rows: [["켜진 규칙", "0개"], ["승인 대기", "0건"]] },
  },
  {
    id: "integrations",
    name: "연결된 앱",
    desc: "Google Calendar 같은 외부 앱과 일정 주고받기",
    group: "자동화와 연결",
    onEffect: "켜면 설정 › 연결된 앱에서 계정을 연결할 수 있어요. 연결 전에는 아무것도 주고받지 않아요.",
    offEffect: { rows: [["연결된 앱", "1개 (Google Calendar)"], ["충돌 확인 대기", "1건"]] },
  },
  {
    id: "analytics",
    name: "Analytics",
    obj: "를",
    desc: "채움률·노쇼·문의 응답 시간 같은 운영 지표와 인사이트",
    group: "분석과 검색",
    onEffect: "켜면 지난 30일 기록으로 지표를 계산해요. 회원에게는 보이지 않아요.",
    offEffect: { rows: [["저장된 보고서", "0개"]] },
  },
  {
    id: "search",
    name: "전체 검색",
    desc: "회원·예약·문의를 상단 검색창 하나로 찾기 (⌘K)",
    group: "분석과 검색",
    onEffect: "",
    offEffect: { rows: [["영향", "상단 검색창이 사라져요"]] },
  },
];

const initial: Record<ModuleId, boolean> = { team: true, automation: false, integrations: true, analytics: false, search: true };

export function ModuleSettings() {
  const [on, setOn] = useState(initial);
  const [confirm, setConfirm] = useState<{ mod: Mod; next: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const groups = [...new Set(modules.map((m) => m.group))];

  const apply = (mod: Mod, next: boolean, note?: string) => {
    setOn((o) => ({ ...o, [mod.id]: next }));
    setConfirm(null);
    setToast(`${mod.name}${mod.obj ?? "을"} ${next ? "켰어요" : "껐어요"}${note ? ` · ${note}` : ""}`);
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <p className="text-caption text-fg-muted">
        <Link href="/admin/settings" className="hover:text-fg">
          설정
        </Link>{" "}
        › 모듈 관리
      </p>
      <header className="flex flex-col gap-0.5">
        <h1 className="text-h1 text-fg">모듈 관리</h1>
        <p className="text-body-md text-fg-secondary">필요한 기능만 켜서 써요. 끈 모듈은 메뉴에서 숨겨지고, 언제든 다시 켤 수 있어요. 브랜드 전체에 적용돼요.</p>
      </header>

      {toast && (
        <p role="status" className="flex max-w-[880px] items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          {toast}
        </p>
      )}

      <div className="flex max-w-[880px] flex-wrap gap-2">
        <span className="text-label-sm text-fg-secondary">켜진 모듈</span>
        {modules
          .filter((m) => on[m.id])
          .map((m) => (
            <span key={m.id} className="rounded-full bg-success-bg px-2 py-0.5 text-label-sm text-success-fg">
              {m.name}
            </span>
          ))}
      </div>

      {groups.map((g) => (
        <section key={g} className="flex max-w-[880px] flex-col gap-3">
          <h2 className="text-h3 text-fg">{g}</h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {modules
              .filter((m) => m.group === g)
              .map((m) => (
                <li key={m.id} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-label-md text-fg">{m.name}</span>
                    <span className="text-body-sm text-fg-secondary">{m.desc}</span>
                    {m.locked && (
                      <span className="inline-flex items-center gap-1 text-caption text-fg-muted">
                        <Lock size={12} aria-hidden />
                        {m.locked}
                      </span>
                    )}
                  </span>
                  <span className="w-10 text-right text-caption text-fg-muted">{on[m.id] ? "켜짐" : "꺼짐"}</span>
                  <span className={m.locked ? "pointer-events-none opacity-40" : undefined}>
                    <Toggle checked={on[m.id]} onChange={(v) => setConfirm({ mod: m, next: v })} label={`${m.name} 켜기`} />
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <section className="flex max-w-[880px] flex-col gap-1 rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">
        <span className="text-label-md text-fg">모듈을 끄면</span>
        <span>· 그 메뉴가 사이드바에서 숨겨져요</span>
        <span>· 새 AI 제안과 자동 실행이 멈춰요</span>
        <span>· 진행 중인 일은 끝까지 하거나 보류로 정리해요 · 기록은 지우지 않아요</span>
      </section>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4" role="dialog" aria-modal="true" aria-labelledby="mod-title">
          <div className="flex w-full max-w-[460px] flex-col gap-4 rounded-xl bg-surface p-6 shadow-lg">
            <h2 id="mod-title" className="text-h3 text-fg">
              {confirm.mod.name}
              {confirm.mod.obj ?? "을"} {confirm.next ? "켤까요?" : "끌까요?"}
            </h2>
            {confirm.next ? (
              confirm.mod.onEffect && <p className="text-body-md text-fg-secondary">{confirm.mod.onEffect}</p>
            ) : (
              <>
                {confirm.mod.offEffect && (
                  <dl className="flex flex-col gap-1 rounded-lg border border-line px-4 py-3 text-body-sm">
                    {confirm.mod.offEffect.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <dt className="text-fg-secondary">{k}</dt>
                        <dd className="text-label-md text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="text-body-sm text-fg-secondary">진행 중인 일을 어떻게 할지 골라 주세요. 기록은 남아요.</p>
              </>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                취소
              </Button>
              {confirm.next ? (
                <Button variant="primary" onClick={() => apply(confirm.mod, true)}>
                  켜기
                </Button>
              ) : (
                <>
                  <Button onClick={() => apply(confirm.mod, false, "진행 중인 일은 보류했어요")}>보류하고 끄기</Button>
                  <Button variant="danger" onClick={() => apply(confirm.mod, false, "진행 중인 일은 끝까지 해요")}>
                    끝까지 하고 끄기
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
