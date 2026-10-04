"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle, ClipboardCheck } from "lucide-react";
import { ActorBadge, AiLabel, RiskBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { confirmMode, kindLabel, programCapacity, waitlistRule, type EntryStatus, type Result, type SessionData } from "@/data/sessions";
import { slots } from "@/data/schedule";
import { cn } from "@/lib/cn";

/*
 * 회차 상세 — Figma 화면 없음 · manyfast 와이어프레임 n39 기준.
 * 출석부 보기(시작한 회차) · 휴강 처리 · 빠른 변경(시작 전 회차) · 신청자 목록 · 이 회차와 관련된 일.
 */
const statusLabel: Record<EntryStatus, string> = { confirmed: "확정", pending: "승인 대기", waitlisted: "대기", cancelled: "취소" };
const statusCls: Record<EntryStatus, string> = {
  confirmed: "bg-success-bg text-success-fg",
  pending: "bg-info-bg text-info-fg",
  waitlisted: "bg-neutral-bg text-neutral-fg",
  cancelled: "bg-neutral-bg text-fg-muted",
};
const resultLabel: Record<Result, string> = { unknown: "미확인", attended: "출석", noshow: "노쇼", none: "—" };
const resultCls: Record<Result, string> = { unknown: "text-fg-secondary", attended: "text-success-fg", noshow: "text-danger-fg", none: "text-fg-muted" };

const endOf = (t: string) => {
  const m = Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + 50;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-caption text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

function ChangeDialog({
  title,
  changes,
  recipients,
  noConsent,
  onCancel,
  onApply,
}: {
  title: string;
  changes: string[];
  recipients: number;
  noConsent: string[];
  onCancel: () => void;
  onApply: (notified: boolean) => void;
}) {
  const timeChanged = changes.some((c) => c.startsWith("시작"));
  const [draft, setDraft] = useState(`안녕하세요, 재진필라테스 강남점이에요. ${title} 수업 일정이 바뀌었어요. ${changes.join(" · ")}. 확인 후 참석이 어려우면 앱에서 취소해 주세요.`);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4" role="dialog" aria-modal="true" aria-labelledby="change-title">
      <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-xl bg-surface p-6 shadow-lg">
        <div className="flex flex-col gap-1">
          <h2 id="change-title" className="text-h3 text-fg">
            회차 변경 확인
          </h2>
          <p className="text-body-md text-fg-secondary">{changes.join(" · ")}</p>
        </div>
        {timeChanged ? (
          <>
            <p className="text-body-sm text-fg">
              적용하면 확정된 {recipients}명 회원에게 일정 변경 안내가 가요.
              {noConsent.length > 0 && ` ${noConsent.join("·")}님은 수신 동의가 없어 직접 연락해야 해요.`}
            </p>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-label-sm text-fg-secondary">
                안내문 초안 <AiLabel />
              </span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="rounded-md border border-line bg-surface p-3 text-body-sm text-fg focus:border-line-strong focus:outline-none"
              />
            </label>
          </>
        ) : (
          <p className="text-body-sm text-fg">정원만 바뀌어서 회원에게 따로 안내하지 않아요.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            취소
          </Button>
          <Button variant="primary" onClick={() => onApply(timeChanged)}>
            {timeChanged ? "변경하고 안내 보내기" : "정원 바꾸기"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SessionDetail({ data }: { data: SessionData }) {
  const { session: s, phase, labels, roster, related, suggestion } = data;
  const [time, setTime] = useState(s.time);
  const [capacity, setCapacity] = useState(s.capacity);
  const [draftTime, setDraftTime] = useState(s.time);
  const [draftCapacity, setDraftCapacity] = useState(s.capacity);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [suggestionState, setSuggestionState] = useState<"open" | "sent" | "dismissed">("open");

  const confirmed = roster.filter((r) => r.status === "confirmed");
  const waitlisted = roster.filter((r) => r.status === "waitlisted");
  const pending = roster.filter((r) => r.status === "pending");
  const unknown = confirmed.filter((r) => r.result === "unknown").length;
  const noConsent = confirmed.filter((r) => r.note?.startsWith("수신 동의")).map((r) => r.name);
  const booked = phase === "cancelled" ? 0 : confirmed.length;
  const started = phase === "ended";
  const title = `${kindLabel[s.kind]} · ${labels.date} ${time}`;

  const changes = [
    draftTime !== time && `시작 ${time} → ${draftTime}`,
    draftCapacity !== capacity && `정원 ${capacity} → ${draftCapacity}`,
  ].filter(Boolean) as string[];
  // 회차 정원은 확정 인원 이상, 프로그램 정원 이하에서만 바꿔요.
  const capacityOptions = Array.from({ length: programCapacity[s.kind] }, (_, i) => i + 1).filter((n) => n >= Math.max(booked, 1));

  const state =
    phase === "cancelled"
      ? { label: `휴강 예정 · 확정했던 ${roster.length}명 안내 완료`, cls: "bg-neutral-bg text-neutral-fg" }
      : started
        ? unknown > 0
          ? { label: `수업 종료 · 이용 결과 미확인 ${unknown}명`, cls: "bg-warning-bg text-warning-fg" }
          : { label: "수업 종료 · 이용 결과 기록 완료", cls: "bg-success-bg text-success-fg" }
        : booked >= capacity
          ? { label: `마감 · 대기 ${waitlisted.length}명`, cls: "bg-neutral-bg text-neutral-fg" }
          : { label: `예정 · 잔여 ${capacity - booked}석`, cls: "bg-info-bg text-info-fg" };

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <Link href="/admin/schedule" className="inline-flex items-center gap-1 self-start text-label-sm text-link">
        <ArrowLeft size={16} aria-hidden />
        주간 일정으로
      </Link>

      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-h1 text-fg">{title}</h1>
          <p className="text-body-md text-fg-secondary">
            강남점 · {confirmMode[s.kind]} · {labels.duration} · {s.id}
          </p>
        </div>
        {started && (
          <Link
            href={`/admin/schedule/${s.id}/attendance`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-label-md text-on-primary hover:bg-primary-hover"
          >
            <ClipboardCheck size={16} aria-hidden />
            {unknown > 0 ? "출석부 열기" : "출석부 보기"}
          </Link>
        )}
        {phase === "upcoming" && (
          <div className="flex flex-col items-end gap-1">
            <Button disabled title="휴강 처리 화면은 준비 중이에요">
              휴강 처리
            </Button>
            <span className="text-caption text-fg-muted">휴강 처리 화면은 준비 중이에요</span>
          </div>
        )}
      </header>

      {toast && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          {toast}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="flex flex-col rounded-xl border border-line bg-surface p-5">
            <Field label="운영 상태">
              <span className={cn("w-fit rounded-md px-2 py-0.5 text-label-sm", state.cls)}>{state.label}</span>
              <span className="text-body-sm text-fg-secondary">
                {s.day.replaceAll("-", ".")} {time}–{endOf(time)}
                {time !== s.time && " · 바뀐 시간"}
              </span>
            </Field>
            <Field label="담당 강사">
              <span className="flex items-center gap-2 text-label-md text-fg">
                <span className="flex size-7 items-center justify-center rounded-full bg-subtle text-caption text-fg-secondary">{s.coach[0]}</span>
                {s.coach}
              </span>
            </Field>
            <Field label="정원 현황">
              <span className="text-h2 text-fg">
                {booked} / {capacity}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-subtle">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (booked / capacity) * 100)}%` }} />
              </span>
              <span className="text-body-sm text-fg-secondary">
                {phase === "cancelled"
                  ? `휴강으로 확정했던 ${roster.length}명 모두 취소`
                  : `확정 ${booked}명 · 대기 ${waitlisted.length}명${pending.length > 0 ? ` · 승인 대기 ${pending.length}명` : ""}`}
              </span>
            </Field>
            <Field label="장소">
              <span className="text-body-md text-fg">{s.room}</span>
            </Field>
            <Field label="확정 방식">
              <span className="text-body-md text-fg">{confirmMode[s.kind]}</span>
              <span className="text-body-sm text-fg-secondary">{waitlistRule[s.kind]}</span>
            </Field>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-h3 text-fg">빠른 변경</h2>
            {phase === "upcoming" ? (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-label-sm text-fg-secondary">시작 시간</span>
                  <select
                    value={draftTime}
                    onChange={(e) => setDraftTime(e.target.value)}
                    className="h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg"
                  >
                    {slots.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-label-sm text-fg-secondary">정원</span>
                  <select
                    value={draftCapacity}
                    disabled={capacityOptions.length < 2}
                    onChange={(e) => setDraftCapacity(Number(e.target.value))}
                    className="h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg disabled:bg-subtle disabled:text-fg-secondary"
                  >
                    {capacityOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}명
                      </option>
                    ))}
                  </select>
                  <span className="text-caption text-fg-muted">
                    {s.kind === "private" || s.kind === "duet"
                      ? `${kindLabel[s.kind]}은 정원이 ${programCapacity[s.kind]}명으로 정해져 있어요`
                      : `확정 ${booked}명 이상, 프로그램 정원 ${programCapacity[s.kind]}명 이하로 바꿀 수 있어요`}
                  </span>
                </label>
                <Button variant="primary" disabled={changes.length === 0} onClick={() => setConfirming(true)}>
                  변경 사항 저장
                </Button>
              </>
            ) : (
              <p className="text-body-sm text-fg-secondary">
                {phase === "cancelled" ? "휴강한 회차는 바꿀 수 없어요." : "끝난 회차는 바꿀 수 없어요. 이용 결과는 출석부에서 고쳐요."}
              </p>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-4">
              <h2 className="flex-1 text-h3 text-fg">신청자 목록</h2>
              <span className="text-body-sm text-fg-secondary">
                {phase === "cancelled"
                  ? `휴강 · ${roster.length}명 안내 완료`
                  : `${confirmed.length}명 확정 · ${waitlisted.length > 0 ? `대기 ${waitlisted.length}명` : "대기 없음"}${pending.length > 0 ? ` · 승인 대기 ${pending.length}명` : ""}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-body-sm">
                <thead className="border-b border-line bg-subtle text-label-sm text-fg-secondary">
                  <tr>
                    <th className="px-5 py-2 font-medium">회원</th>
                    <th className="px-4 py-2 font-medium">예약 상태</th>
                    <th className="px-4 py-2 font-medium">이용 결과</th>
                    <th className="px-4 py-2 font-medium">신청</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r) => (
                    <tr key={`${r.name}-${r.status}`} className="border-b border-line last:border-b-0">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-human-bg text-caption text-human-fg">{r.name[0]}</span>
                          <span className="flex flex-col">
                            <span className="text-label-md text-fg">{r.name}</span>
                            {r.note && <span className="text-caption text-fg-muted">{r.note}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-md px-2 py-0.5 text-label-sm", statusCls[r.status])}>{statusLabel[r.status]}</span>
                        {r.detail && <span className="block pt-0.5 text-caption text-fg-muted">{r.detail}</span>}
                      </td>
                      <td className={cn("px-4 py-3 text-label-sm", resultCls[r.result])}>{resultLabel[r.result]}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-fg-secondary">
                        {r.applied}
                        <span className="block text-caption text-fg-muted">{r.via}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-5 py-3">
              <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-label-sm text-link">
                예약 목록에서 보기
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </section>

          {suggestion && suggestionState !== "dismissed" && (
            <section className="flex flex-col gap-3 rounded-xl border border-ai-border bg-surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-h3 text-fg">AI 제안</h2>
                <AiLabel />
                <RiskBadge tier="medium" />
              </div>
              <p className="text-body-md text-fg">{suggestion.text}</p>
              <p className="text-caption text-fg-muted">{suggestion.evidence} · 위험 중간이라 승인 후 보내요</p>
              {suggestionState === "open" ? (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setSuggestionState("dismissed")}>
                    무시
                  </Button>
                  <Button onClick={() => setSuggestionState("sent")}>승인함에 올리기</Button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-label-sm text-success-fg">
                  <CheckCircle size={14} aria-hidden />
                  승인함에 올렸어요 · 승인하면 안내가 가요
                </p>
              )}
            </section>
          )}

          {related.length > 0 && (
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
              <h2 className="text-h3 text-fg">이 회차와 관련된 일</h2>
              <ul className="flex flex-col gap-3">
                {related.map((r) => (
                  <li key={r.text} className="flex flex-wrap items-center gap-2">
                    <ActorBadge actor={r.actor} label={r.actorLabel} />
                    <span className="min-w-0 flex-1 text-body-sm text-fg">{r.text}</span>
                    {r.href && (
                      <Link href={r.href} className="text-label-sm text-link">
                        {r.cta}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {confirming && (
        <ChangeDialog
          title={title}
          changes={changes}
          recipients={confirmed.length}
          noConsent={noConsent}
          onCancel={() => setConfirming(false)}
          onApply={(notified) => {
            setTime(draftTime);
            setCapacity(draftCapacity);
            setConfirming(false);
            setToast(notified ? `회차를 바꿨어요 · 확정 ${confirmed.length - noConsent.length}명에게 안내를 보냈어요` : "정원을 바꿨어요");
          }}
        />
      )}
    </main>
  );
}
