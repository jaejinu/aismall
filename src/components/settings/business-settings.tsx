"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { confirmLabel, programs } from "@/data/programs";
import { cn } from "@/lib/cn";

/*
 * 사업장 운영정보 — Figma 화면 없음 · manyfast 와이어프레임 n125 기준.
 * 프로그램별 정원·확정 방식·마감은 '프로그램·회차'에서 정하고, 여기서는 강남점 기본값만 정해요.
 * 와이어프레임의 '수동 승인'은 '관리자 확인'으로, '서비스'는 '프로그램'으로 맞췄어요.
 */
const days = ["월", "화", "수", "목", "금", "토", "일"];
const inputCls = "h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg disabled:bg-subtle disabled:text-fg-muted";
const sections = [
  ["info", "기본 정보"],
  ["programs", "프로그램"],
  ["hours", "영업시간·휴무"],
  ["rules", "예약 기본값"],
  ["terms", "용어"],
] as const;

type Hours = { open: boolean; start: string; end: string }[];
type Form = {
  name: string;
  phone: string;
  address: string;
  category: string;
  intro: string;
  hours: Hours;
  closures: { date: string; reason: string }[];
  minHours: number;
  maxDays: number;
  buffer: number;
  defaultConfirm: "auto" | "manual";
};

const initial: Form = {
  name: "재진필라테스 강남점",
  phone: "02-000-0000",
  address: "서울 강남구 예시로 12, 4층",
  category: "필라테스",
  intro: "그룹·기구·1:1 필라테스를 하는 강남역 4번 출구 앞 스튜디오예요.",
  hours: days.map((_, i) => (i === 6 ? { open: false, start: "10:00", end: "18:00" } : i === 5 ? { open: true, start: "09:00", end: "14:00" } : { open: true, start: "09:00", end: "21:00" })),
  closures: [
    { date: "2026-10-09", reason: "한글날" },
    { date: "2026-12-25", reason: "성탄절" },
  ],
  minHours: 1,
  maxDays: 14,
  buffer: 10,
  defaultConfirm: "manual",
};

function Section({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-h3 text-fg">{title}</h2>
        {desc && <p className="text-body-sm text-fg-secondary">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-sm text-fg-secondary">{label}</span>
      {children}
      {hint && <span className="text-caption text-fg-muted">{hint}</span>}
    </label>
  );
}

export function BusinessSettings() {
  const [form, setForm] = useState<Form>(initial);
  const [saved, setSaved] = useState<Form>(initial);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setDay = (i: number, v: Partial<Hours[number]>) => set("hours", form.hours.map((h, j) => (j === i ? { ...h, ...v } : h)));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-24">
      <p className="text-caption text-fg-muted">
        <Link href="/admin/settings" className="hover:text-fg">
          설정
        </Link>{" "}
        › 사업장 운영정보
      </p>
      <header className="flex flex-col gap-0.5">
        <h1 className="text-h1 text-fg">사업장 운영정보</h1>
        <p className="text-body-md text-fg-secondary">강남점의 기본 정보와 영업시간, 새 프로그램에 쓸 예약 기본값을 정해요.</p>
      </header>

      {toast && !dirty && (
        <p role="status" className="flex max-w-[880px] items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          {toast}
        </p>
      )}

      <div className="flex max-w-[1080px] gap-6">
        <nav aria-label="섹션" className="sticky top-[81px] hidden h-fit w-40 shrink-0 flex-col gap-1 lg:flex">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-md px-3 py-1.5 text-body-sm text-fg-secondary hover:bg-subtle hover:text-fg">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Section id="info" title="기본 정보" desc="회원 앱과 문의 페이지, 안내 메시지에 보여요.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="사업장 이름">
                <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </Field>
              <Field label="대표 전화번호">
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="주소">
              <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
            </Field>
            <Field label="업종" hint="업종은 브랜드 단위예요. 바꾸면 용어 추천이 달라져요.">
              <select value={form.category} disabled className={inputCls}>
                <option>필라테스</option>
              </select>
            </Field>
            <Field label="사업장 소개">
              <textarea value={form.intro} onChange={(e) => set("intro", e.target.value)} rows={2} className={cn(inputCls, "h-auto py-2")} />
            </Field>
          </Section>

          <Section id="programs" title="프로그램" desc="정원·확정 방식·마감은 프로그램마다 정해요.">
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[520px] text-left text-body-sm">
                <thead className="bg-subtle text-label-sm text-fg-secondary">
                  <tr>
                    <th className="px-3 py-2 font-medium">프로그램</th>
                    <th className="px-3 py-2 font-medium">소요 시간</th>
                    <th className="px-3 py-2 font-medium">기본 정원</th>
                    <th className="px-3 py-2 font-medium">확정 방식</th>
                  </tr>
                </thead>
                <tbody>
                  {programs
                    .filter((p) => p.branches.includes("강남점"))
                    .map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="px-3 py-2">
                          <Link href={`/admin/programs/${p.id}`} className="text-link hover:underline">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-fg">{p.duration}분</td>
                        <td className="px-3 py-2 text-fg">{p.capacity}명</td>
                        <td className="px-3 py-2 text-fg">{confirmLabel[p.confirm]}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Link href="/admin/programs" className="self-start text-label-sm text-link">
              프로그램·회차에서 바꾸기
            </Link>
          </Section>

          <Section id="hours" title="영업시간·휴무" desc="영업시간 밖에는 회차를 만들 수 없고, 회원 앱에 '휴무'로 보여요.">
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
              {form.hours.map((h, i) => (
                <li key={days[i]} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <span className="w-6 text-label-md text-fg">{days[i]}</span>
                  <Toggle checked={h.open} onChange={(v) => setDay(i, { open: v })} label={`${days[i]}요일 영업`} />
                  <span className={cn("w-12 text-caption", h.open ? "text-fg-secondary" : "text-fg-muted")}>{h.open ? "영업" : "휴무"}</span>
                  <input type="time" value={h.start} disabled={!h.open} onChange={(e) => setDay(i, { start: e.target.value })} aria-label={`${days[i]}요일 시작`} className={inputCls} />
                  <span className="text-fg-muted">–</span>
                  <input type="time" value={h.end} disabled={!h.open} onChange={(e) => setDay(i, { end: e.target.value })} aria-label={`${days[i]}요일 종료`} className={inputCls} />
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <span className="text-label-md text-fg">임시 휴무</span>
              <ul className="flex flex-col gap-1">
                {form.closures.map((c) => (
                  <li key={c.date} className="flex items-center gap-3 rounded-md bg-subtle px-3 py-2 text-body-sm">
                    <span className="w-28 text-fg">{c.date.replaceAll("-", ".")}</span>
                    <span className="flex-1 text-fg-secondary">{c.reason}</span>
                    <button
                      type="button"
                      aria-label={`${c.date} 휴무 지우기`}
                      onClick={() => set("closures", form.closures.filter((x) => x.date !== c.date))}
                      className="cursor-pointer rounded p-1 text-fg-muted hover:bg-surface hover:text-fg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-end gap-2">
                <Field label="휴무일">
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="사유">
                  <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="예: 내부 공사" className={inputCls} />
                </Field>
                <Button
                  size="sm"
                  disabled={!newDate || form.closures.some((c) => c.date === newDate)}
                  onClick={() => {
                    set("closures", [...form.closures, { date: newDate, reason: newReason || "임시 휴무" }].sort((a, b) => a.date.localeCompare(b.date)));
                    setNewDate("");
                    setNewReason("");
                  }}
                  className="h-9"
                >
                  <Plus size={14} aria-hidden />
                  추가
                </Button>
              </div>
              <p className="text-caption text-fg-muted">이미 예약이 있는 날을 휴무로 정하면, 저장 전에 그날 회차를 휴강 처리하라고 안내해요.</p>
            </div>
          </Section>

          <Section id="rules" title="예약 기본값" desc="새 프로그램을 만들 때 처음 들어가는 값이에요. 프로그램마다 바꿀 수 있어요.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="최소 예약 시점" hint="수업 시작 몇 시간 전까지 받을지">
                <select value={form.minHours} onChange={(e) => set("minHours", Number(e.target.value))} className={inputCls}>
                  {[0, 1, 2, 3, 6, 24].map((h) => (
                    <option key={h} value={h}>
                      {h === 0 ? "시작 전까지" : `수업 ${h}시간 전`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="최대 예약 시점" hint="며칠 뒤 수업까지 열지">
                <select value={form.maxDays} onChange={(e) => set("maxDays", Number(e.target.value))} className={inputCls}>
                  {[7, 14, 21, 28].map((d) => (
                    <option key={d} value={d}>
                      {d}일 뒤까지
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="회차 사이 정리 시간">
                <select value={form.buffer} onChange={(e) => set("buffer", Number(e.target.value))} className={inputCls}>
                  {[0, 10, 15, 30].map((m) => (
                    <option key={m} value={m}>
                      {m === 0 ? "없음" : `${m}분`}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="새 프로그램 확정 방식" hint="자동 확정은 자리가 있으면 바로 확정, 관리자 확인은 예약 '승인 대기'로 들어와요.">
              <select value={form.defaultConfirm} onChange={(e) => set("defaultConfirm", e.target.value as Form["defaultConfirm"])} className={inputCls}>
                <option value="manual">관리자 확인</option>
                <option value="auto">자동 확정</option>
              </select>
            </Field>
            <p className="rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">
              변경·취소 마감은 수업 24시간 전이 기본이에요. 참석 확인에 &lsquo;못 가요&rsquo;로 답하면 마감이 지나도 수업 전까지 바로 취소돼요.
            </p>
          </Section>

          <Section id="terms" title="용어" desc="용어는 브랜드 단위로 정해요. 최고관리자만 바꿀 수 있어요.">
            <dl className="grid gap-2 sm:grid-cols-3">
              {[
                ["프로그램", "수업 종류"],
                ["회차", "날짜·시간이 정해진 수업 한 번"],
                ["회원", "가입하고 직접 예약하는 사람"],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg bg-subtle px-3 py-2">
                  <dt className="text-label-md text-fg">{t}</dt>
                  <dd className="text-caption text-fg-secondary">{d}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-6 py-3 lg:left-60">
          <div className="flex max-w-[1080px] items-center justify-end gap-2">
            <span className="mr-auto text-body-sm text-fg-secondary">저장하지 않은 변경이 있어요</span>
            <Button variant="ghost" onClick={() => setForm(saved)}>
              되돌리기
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSaved(form);
                setToast("운영정보를 저장했어요 · 회원 앱에 바로 반영돼요");
              }}
            >
              저장
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
