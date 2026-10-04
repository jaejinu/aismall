"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { confirmLabel, weekStats, type ConfirmMode, type Program } from "@/data/programs";
import { kindShort } from "@/data/schedule";
import { sessionLabels } from "@/data/sessions";
import { cn } from "@/lib/cn";

/*
 * 프로그램 상세·설정 — Figma 화면 없음 · manyfast 와이어프레임 n35 기준.
 * 대기자 자동 확정은 자동 확정 프로그램에서만 켤 수 있어요(관리자 확인 프로그램은 신청이 '승인 대기'로 가요).
 */
const hours = [1, 2, 3, 6, 12, 24, 48];
const durations = [30, 50, 60, 90];
const branches = ["강남점", "홍대점", "마포점"];

type Form = Omit<Program, "id" | "status" | "typeLabel" | "confirmNote">;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-sm text-fg-secondary">{label}</span>
      {children}
      {hint && <span className="text-caption text-fg-muted">{hint}</span>}
    </label>
  );
}

const inputCls = "h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg disabled:bg-subtle disabled:text-fg-secondary";

export function ProgramDetail({ program }: { program: Program | null }) {
  const isNew = !program;
  const initial: Form = program ?? {
    name: "",
    duration: 50,
    capacity: 4,
    branches: ["강남점"],
    confirm: "manual",
    waitlistAuto: false,
    applyDeadline: 24,
    changeDeadline: 24,
    cancelDeadline: 24,
    description: "",
  };
  const [form, setForm] = useState<Form>(initial);
  const [saved, setSaved] = useState<Form>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const st = program ? weekStats(program.id) : null;

  const save = () => {
    setSaved(form);
    setToast(isNew ? `'${form.name}' 프로그램을 만들었어요 · 프로토타입이라 목록에는 남지 않아요` : "프로그램 설정을 저장했어요 · 예약 가능 여부에 바로 반영돼요");
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <Link href="/admin/programs" className="inline-flex items-center gap-1 self-start text-label-sm text-link">
        <ArrowLeft size={16} aria-hidden />
        프로그램 목록으로
      </Link>
      <header className="flex flex-col gap-0.5">
        <h1 className="text-h1 text-fg">{isNew ? "새 프로그램" : program.name}</h1>
        <p className="text-body-md text-fg-secondary">{isNew ? "정원·확정 방식·마감을 정하면 일정에서 회차를 만들 수 있어요" : `${program.typeLabel} · ${program.status} · 브랜드 공통 설정`}</p>
      </header>

      {toast && !dirty && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          {toast}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,580px)_340px]">
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-h3 text-fg">기본 정보</h2>
            <Field label="프로그램 이름">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 저녁 요가" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="소요 시간">
                <select value={form.duration} onChange={(e) => set("duration", Number(e.target.value))} className={inputCls}>
                  {durations.map((d) => (
                    <option key={d} value={d}>
                      {d}분
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="기본 정원" hint={program?.id === "private" ? "1:1 레슨은 1명이에요" : "회차마다 이 값 이하로 바꿀 수 있어요"}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.capacity}
                  disabled={program?.id === "private"}
                  onChange={(e) => set("capacity", Math.max(1, Number(e.target.value)))}
                  className={inputCls}
                />
              </Field>
            </div>
            <fieldset className="flex flex-col gap-1">
              <legend className="pb-1 text-label-sm text-fg-secondary">운영 지점</legend>
              <div className="flex flex-wrap gap-4">
                {branches.map((b) => (
                  <label key={b} className="flex items-center gap-2 text-body-md text-fg">
                    <input
                      type="checkbox"
                      checked={form.branches.includes(b)}
                      disabled={b !== "강남점"}
                      onChange={(e) => set("branches", e.target.checked ? [...form.branches, b] : form.branches.filter((x) => x !== b))}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    {b}
                  </label>
                ))}
              </div>
              <span className="text-caption text-fg-muted">사업장 오너는 강남점 운영 여부만 바꿀 수 있어요</span>
            </fieldset>
            <Field label="프로그램 설명 · 회원 앱에 보여요">
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={cn(inputCls, "h-auto py-2")} />
            </Field>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-h3 text-fg">예약 규칙</h2>
            <Field
              label="예약 확정 방식"
              hint={form.confirm === "auto" ? "자리가 있으면 바로 확정, 마감되면 대기 신청을 받아요" : "신청은 예약 '승인 대기'로 들어와요 · 예약 목록과 오늘 화면에서 확정·거절해요(승인함은 AI 제안 전용)"}
            >
              <select
                value={form.confirm}
                onChange={(e) => {
                  const v = e.target.value as ConfirmMode;
                  setForm((f) => ({ ...f, confirm: v, waitlistAuto: v === "manual" ? false : f.waitlistAuto }));
                }}
                className={inputCls}
              >
                {(["auto", "manual"] as ConfirmMode[]).map((m) => (
                  <option key={m} value={m}>
                    {confirmLabel[m]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-start gap-4 rounded-lg bg-subtle px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-label-md text-fg">대기자 자동 확정</span>
                <span className="text-body-sm text-fg-secondary">
                  {form.confirm === "manual"
                    ? "자동 확정 프로그램에서만 켤 수 있어요. 지금은 자리가 나면 대기자에게 알리고 먼저 신청한 사람이 가져가요."
                    : "자리가 나면 대기 순번대로 바로 확정해요. 조건: 회원 동의(대기 신청 때 직접 체크) · 수업 3시간 전까지 · 확정 즉시 알림 · 확정 후 1시간 안에는 취소할 수 있어요. 끄면 알림 후 선착순이에요."}
                </span>
              </span>
              <span className={cn(form.confirm === "manual" && "pointer-events-none opacity-40")}>
                <Toggle checked={form.waitlistAuto} onChange={(v) => set("waitlistAuto", v)} label="대기자 자동 확정" />
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  ["applyDeadline", "신청 마감"],
                  ["changeDeadline", "변경 마감"],
                  ["cancelDeadline", "취소 마감"],
                ] as const
              ).map(([k, l]) => (
                <Field key={k} label={l}>
                  <select value={form[k]} onChange={(e) => set(k, Number(e.target.value))} className={inputCls}>
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        수업 {h}시간 전
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <p className="text-caption text-fg-muted">마감은 회차 시작 시각을 기준으로 계산해요. 참석 확인에 &lsquo;못 가요&rsquo;로 답하면 취소 마감이 지나도 수업 전까지 바로 취소돼요.</p>
          </section>

          <div className="flex justify-end gap-2">
            {isNew ? (
              <Link href="/admin/programs" className="rounded-md px-4 py-2 text-label-md text-fg hover:bg-subtle">
                취소
              </Link>
            ) : (
              <Button variant="ghost" disabled={!dirty} onClick={() => setForm(saved)}>
                되돌리기
              </Button>
            )}
            <Button variant="primary" disabled={!dirty || !form.name.trim() || form.branches.length === 0} onClick={save}>
              {isNew ? "프로그램 만들기" : "저장"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {st && (
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
              <h2 className="text-h3 text-fg">강남점 이번 주</h2>
              <dl className="flex flex-col gap-2 text-body-sm">
                {[
                  ["회차", `${st.count}개${st.cancelled ? ` (휴강 ${st.cancelled})` : ""}`],
                  ["예약", `${st.booked}명`],
                  ["채움률", st.fill === null ? "—" : `${st.fill}%`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-fg-secondary">{k}</dt>
                    <dd className="text-label-md text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
              {st.sessions.length > 0 && (
                <ul className="flex flex-col border-t border-line pt-2">
                  {st.sessions.map((s) => (
                    <li key={s.id}>
                      <Link href={`/admin/schedule/${s.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-body-sm hover:bg-subtle">
                        <span className="text-fg">
                          {sessionLabels(s).date} {s.time} {kindShort[s.kind]}
                        </span>
                        <span className={cn("text-caption", s.cancelled ? "text-fg-muted" : "text-fg-secondary")}>
                          {s.cancelled ? "휴강" : `${s.booked}/${s.capacity}`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/schedule" className="text-label-sm text-link">
                주간 일정 보기
              </Link>
            </section>
          )}
          <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-h3 text-fg">설정 안내</h2>
            <ul className="flex flex-col gap-1.5 text-body-sm text-fg-secondary">
              <li>· 정원과 마감은 저장하면 예약 가능 여부에 바로 반영돼요. 이미 확정된 예약은 그대로예요.</li>
              <li>· 확정 방식을 &lsquo;관리자 확인&rsquo;으로 바꾸면 이후 신청부터 &lsquo;승인 대기&rsquo;로 들어와요.</li>
              <li>· AI는 프로그램 설정을 바꾸지 않아요. 회차 편성 제안은 승인함에서 따로 확인해요.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
