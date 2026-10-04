"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { guardrails } from "@/data/ai";

/*
 * 고급 AI 설정 — Figma 화면 없음 · manyfast 와이어프레임 n101 기준.
 * 와이어프레임의 '자동 실행 최대 위험 등급(낮음/중간)'은 규칙상 위험 낮음으로 고정이라 바꿀 수 없게 했어요.
 * 끌 수 없는 규칙과 지시 조작 감지 시 처리도 고정이에요.
 */
type Form = { sensitivity: "낮음" | "보통" | "높음"; expiry: number; shadowDays: number; unsure: "handoff" | "draft"; suggestions: boolean };
const initial: Form = { sensitivity: "보통", expiry: 48, shadowDays: 7, unsure: "handoff", suggestions: true };
const selectCls = "h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg";

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-line py-3 last:border-b-0">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label-md text-fg">{title}</span>
        <span className="text-body-sm text-fg-secondary">{desc}</span>
      </span>
      {children}
    </li>
  );
}

function Fixed({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-3 py-1.5 text-label-sm text-fg-secondary">
      <Lock size={12} aria-hidden />
      {label}
    </span>
  );
}

export function AiAdvancedSettings() {
  const [form, setForm] = useState<Form>(initial);
  const [saved, setSaved] = useState<Form>(initial);
  const [savedAt, setSavedAt] = useState("10/14 09:22 · 이미래");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <p className="text-caption text-fg-muted">
          <Link href="/admin/settings" className="hover:text-fg">
            설정
          </Link>{" "}
          › 고급 AI 설정
        </p>
        <header className="flex flex-col gap-0.5">
          <h1 className="text-h1 text-fg">고급 AI 설정</h1>
          <p className="text-body-md text-fg-secondary">AI가 판단하는 기준을 세부 조정해요. 권한 수준은 AI 권한에서, 말투는 응대 지침에서 정해요.</p>
          <p className="text-caption text-fg-muted">바꾸기는 최고관리자·사업장 오너만 · 매니저·직원은 보기만 해요</p>
        </header>

        <section className="flex max-w-[760px] flex-col rounded-xl border border-line bg-surface px-5 py-4">
          <h2 className="pb-1 text-h3 text-fg">끌 수 없는 규칙</h2>
          <p className="pb-2 text-body-sm text-fg-secondary">권한 설정보다 먼저 적용돼요.</p>
          <ul>
            {[...guardrails, "회원 개인정보를 외부 앱으로 보내기", "참고 자료에 없는 정보를 지어내서 답하기"].map((g) => (
              <Row key={g} title={g} desc="항상 막혀 있어요">
                <span className="pointer-events-none opacity-60">
                  <Toggle checked onChange={() => {}} label={`${g} 금지`} />
                </span>
              </Row>
            ))}
          </ul>
        </section>

        <section className="flex max-w-[760px] flex-col rounded-xl border border-line bg-surface px-5 py-4">
          <h2 className="pb-1 text-h3 text-fg">지시 조작 막기</h2>
          <p className="pb-2 text-body-sm text-fg-secondary">문의에 &lsquo;이전 안내는 무시해&rsquo;처럼 AI를 조작하려는 문장이 있으면 막아요.</p>
          <ul>
            <Row title="감지 민감도" desc="높을수록 평범한 문의도 '확인 필요'로 표시될 수 있어요">
              <select value={form.sensitivity} onChange={(e) => set("sensitivity", e.target.value as Form["sensitivity"])} className={selectCls}>
                {["낮음", "보통", "높음"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Row>
            <Row title="감지했을 때" desc="AI 초안을 만들지 않고 '확인 필요'로 표시한 뒤 오너·매니저에게 알려요">
              <Fixed label="고정" />
            </Row>
          </ul>
        </section>

        <section className="flex max-w-[760px] flex-col rounded-xl border border-line bg-surface px-5 py-4">
          <h2 className="pb-1 text-h3 text-fg">판단 기준</h2>
          <ul>
            <Row title="자동 실행 최대 위험 등급" desc="위험 낮음만 자동 실행할 수 있어요. 위험 중간은 묶음 승인, 높음 이상은 항상 승인이에요">
              <Fixed label="위험 낮음 · 바꿀 수 없어요" />
            </Row>
            <Row title="승인 만료 시간" desc="이 시간이 지나면 제안이 만료돼요. 회차 시작이 더 빠르면 그때 만료돼요">
              <select value={form.expiry} onChange={(e) => set("expiry", Number(e.target.value))} className={selectCls}>
                {[24, 48, 72].map((h) => (
                  <option key={h} value={h}>
                    {h}시간
                  </option>
                ))}
              </select>
            </Row>
            <Row title="지켜보기 모드 비교 기간" desc="AI가 실행했다면 어땠을지 사람의 처리와 비교하는 기간이에요 · AI 관리에 이 기간으로 보여요">
              <select value={form.shadowDays} onChange={(e) => set("shadowDays", Number(e.target.value))} className={selectCls}>
                {[7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </Row>
            <Row title="답이 확실하지 않을 때" desc="참고 자료로 답할 수 없으면 어떻게 할지 정해요">
              <select value={form.unsure} onChange={(e) => set("unsure", e.target.value as Form["unsure"])} className={selectCls}>
                <option value="handoff">담당자에게 넘기기</option>
                <option value="draft">초안만 만들고 &lsquo;확인 필요&rsquo; 표시</option>
              </select>
            </Row>
            <Row title="응대 지침 개선 제안 받기" desc="여러 번 고치거나 거절한 패턴을 찾아 지침에 더할 문장을 제안해요">
              <Toggle checked={form.suggestions} onChange={(v) => set("suggestions", v)} label="응대 지침 개선 제안 받기" />
            </Row>
          </ul>
        </section>

        <div className="flex max-w-[760px] justify-end gap-2">
          <Button variant="ghost" disabled={!dirty} onClick={() => setForm(saved)}>
            되돌리기
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            onClick={() => {
              setSaved(form);
              setSavedAt("방금 · 홍지수");
            }}
          >
            저장
          </Button>
        </div>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[360px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <h2 className="text-h3 text-fg">적용 상태</h2>
        <dl className="flex flex-col gap-2 text-body-sm">
          {[
            ["마지막 저장", savedAt],
            ["자동 실행", "위험 낮음만"],
            ["끌 수 없는 규칙", `${guardrails.length + 2}개`],
            ["감지 민감도", saved.sensitivity],
            ["저장하지 않은 변경", dirty ? "있어요" : "없어요"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-fg-secondary">{k}</dt>
              <dd className={dirty && k === "저장하지 않은 변경" ? "text-label-md text-warning-fg" : "text-label-md text-fg"}>{v}</dd>
            </div>
          ))}
        </dl>
        {!dirty && savedAt.startsWith("방금") && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-3 py-2 text-label-sm text-success-fg">
            <CheckCircle size={14} aria-hidden />
            저장했어요 · 활동 기록에 남았어요
          </p>
        )}
        <div className="flex flex-col gap-1">
          <Link href="/admin/settings/ai" className="text-label-sm text-link">
            AI 권한
          </Link>
          <Link href="/admin/settings/playbook" className="text-label-sm text-link">
            응대 지침
          </Link>
          <Link href="/admin/activity" className="text-label-sm text-link">
            활동 기록에서 바뀐 이력 보기
          </Link>
        </div>
      </aside>
    </div>
  );
}
