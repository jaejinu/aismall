"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle, Info } from "lucide-react";
import { AiLabel, RiskBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { assignAlternatives, cancelReasons, type Alternative } from "@/data/cancel";
import { kindLabel, type SessionData } from "@/data/sessions";
import { cn } from "@/lib/cn";

/*
 * 휴강 처리 — Figma 화면 없음 · manyfast 와이어프레임 n42 기준.
 * 휴강은 위험 높음이라 사업장 오너만 확정해요. AI는 회원별 안내문과 대체 회차를 제안만 하고,
 * 오너가 고친 뒤 '휴강 확정'을 눌러야 보내요. 수신 동의가 없는 회원에게는 보내지 않아요.
 */
type Done = { decidedAt: string; reason: string; members: { name: string; state: string; href?: string }[] };

const needsConfirm = (kind: SessionData["session"]["kind"]) => kind !== "group";

/* 받침이 있으면(ㄹ 제외) '으로', 없으면 '로' */
function ro(word: string) {
  const jong = (word.charCodeAt(word.length - 1) - 0xac00) % 28;
  return jong > 0 && jong !== 8 ? "으로" : "로";
}

/* 받침 유무로 을/를, 은/는 */
function josa(word: string, pair: "을를" | "은는") {
  const jong = (word.charCodeAt(word.length - 1) - 0xac00) % 28;
  return word + (jong > 0 ? pair[0] : pair[1]);
}

function draftFor(name: string, data: SessionData, reason: string, alt: Alternative | null) {
  const { session: s, labels } = data;
  const why = reason === "기타" ? "부득이한 사정으로" : `${reason}${ro(reason)}`;
  const move = alt
    ? `${alt.label}에 자리가 있어요. 회원 앱의 휴강 안내에서 바로 옮길 수 있어요${needsConfirm(s.kind) ? `(${josa(kindLabel[s.kind], "은는")} 관리자 확인 후 확정돼요)` : ""}.`
    : "회원 앱 수업 화면에서 다른 회차를 골라 주세요.";
  return `${name}님, 재진필라테스 강남점이에요. ${labels.date} ${s.time} ${kindLabel[s.kind]} 수업이 ${why} 휴강돼요. 예약은 취소로 정리했어요. ${move} 불편을 드려 죄송해요.`;
}

export function CancelClassView({ data, alternatives, done }: { data: SessionData; alternatives: Alternative[]; done?: Done }) {
  const { session: s, labels } = data;
  const members = data.roster.filter((r) => r.status === "confirmed");
  const noConsent = new Set(members.filter((r) => r.note?.startsWith("수신 동의")).map((r) => r.name));
  // 안내를 받을 수 있는 회원에게만 남은 자리를 순서대로 제안해요.
  const sendableNames = members.filter((m) => !noConsent.has(m.name)).map((m) => m.name);
  const initialAlt = Object.fromEntries([
    ...members.map((m) => [m.name, ""]),
    ...assignAlternatives(sendableNames, alternatives).map((a) => [a.name, a.alt?.id ?? ""]),
  ]);

  const [reason, setReason] = useState(cancelReasons[0]);
  const [alt, setAlt] = useState<Record<string, string>>(initialAlt);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<Done | null>(done ?? null);

  const altOf = (name: string) => alternatives.find((a) => a.id === alt[name]) ?? null;
  const draft = (name: string) => edited[name] ?? draftFor(name, data, reason, altOf(name));
  const sendable = members.filter((m) => !noConsent.has(m.name));
  const pending = data.roster.filter((r) => r.status === "pending").map((r) => r.name);
  const waitlisted = data.roster.filter((r) => r.status === "waitlisted").map((r) => r.name);
  const sideEffects = [
    pending.length > 0 && `승인 대기 신청 ${pending.length}건(${pending.join("·")})은 거절로 정리하고 회원에게 알려요`,
    waitlisted.length > 0 && `대기 신청 ${waitlisted.length}건(${waitlisted.join("·")})은 정리하고 회원에게 알려요`,
  ].filter(Boolean) as string[];

  const confirm = () => {
    setConfirming(false);
    setResult({
      decidedAt: "방금 · 홍지수 사업장 오너",
      reason,
      members: members.map((m) => ({
        name: m.name,
        state: noConsent.has(m.name)
          ? "수신 동의가 없어 보내지 않았어요 · 직접 연락해 주세요"
          : `안내 보냄 · ${altOf(m.name) ? `${altOf(m.name)!.label} 제안` : "다른 회차 직접 고르기"}`,
      })),
    });
  };

  const header = (
    <>
      <Link href={`/admin/schedule/${s.id}`} className="inline-flex items-center gap-1 self-start text-label-sm text-link">
        <ArrowLeft size={16} aria-hidden />
        회차 상세로
      </Link>
      <header className="flex flex-col gap-0.5">
        <h1 className="text-h1 text-fg">휴강 처리 · {labels.title}</h1>
        <p className="text-body-md text-fg-secondary">
          강남점 · {s.coach} 강사 · {s.room} · {labels.range}
        </p>
      </header>
    </>
  );

  if (result) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        {header}
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          {done ? "이미 휴강한 회차예요" : `휴강을 확정했어요 · ${sendable.length}명에게 안내를 보냈어요`}
        </p>
        <section className="flex max-w-[720px] flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-h3 text-fg">처리 결과</h2>
          <ul className="flex flex-col gap-1 text-body-md text-fg">
            <li>
              휴강 확정 · {kindLabel[s.kind]} {labels.date} {s.time} · 사유 {result.reason}
            </li>
            <li className="text-body-sm text-fg-secondary">{result.decidedAt}</li>
            <li className="text-body-sm text-fg-secondary">
              확정 예약 {result.members.length}건 → 취소(휴강) · 회원이 대체 회차를 고르면 새로 예약돼요
              {needsConfirm(s.kind) && ` · ${josa(kindLabel[s.kind], "은는")} 옮기기 신청이 예약 '승인 대기'로 들어와요`}
            </li>
          </ul>
          <ul className="overflow-hidden rounded-lg border border-line">
            {result.members.map((m) => (
              <li key={m.name} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <span className="flex size-7 items-center justify-center rounded-full bg-human-bg text-caption text-human-fg">{m.name[0]}</span>
                <span className="w-16 text-label-md text-fg">{m.name}</span>
                <span className={cn("min-w-0 flex-1 text-body-sm", m.state.startsWith("수신 동의") ? "text-warning-fg" : "text-fg-secondary")}>{m.state}</span>
                {m.href && (
                  <Link href={m.href} className="text-label-sm text-link">
                    예약에서 확인
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/schedule" className="rounded-md bg-primary px-4 py-2 text-label-md text-on-primary hover:bg-primary-hover">
              일정으로 돌아가기
            </Link>
            <Link href="/admin/activity" className="rounded-md px-4 py-2 text-label-md text-fg hover:bg-subtle">
              활동 기록 보기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      {header}
      <div className="flex items-start gap-3 rounded-lg bg-warning-bg px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden />
        <p className="text-body-sm text-fg">
          <span className="text-label-md text-warning-fg">휴강은 되돌릴 수 없어요. </span>
          확정하면 확정 예약 {members.length}건이 취소(휴강)로 바뀌고, 아래 안내문이 바로 가요.
          {sideEffects.map((e) => ` ${e}.`)} 휴강 확정은 사업장 오너만 할 수 있어요.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-h3 text-fg">휴강 대상 회차</h2>
            <dl className="grid grid-cols-3 gap-2">
              {[
                ["예약 현황", `${members.length} / ${s.capacity} 확정`],
                ["담당 강사", s.coach],
                ["장소", s.room],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="text-caption text-fg-muted">{k}</dt>
                  <dd className="text-label-md text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <label className="flex flex-col gap-1">
              <span className="text-label-sm text-fg-secondary">휴강 사유 · 회원 안내문에 들어가요</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg">
                {cancelReasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center border-b border-line px-5 py-4">
              <h2 className="flex-1 text-h3 text-fg">영향받는 회원</h2>
              <span className="text-body-sm text-fg-secondary">{members.length}명</span>
            </div>
            <ul>
              {members.map((m) => (
                <li key={m.name} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-label-md text-fg">{m.name}</span>
                    <span className="text-caption text-fg-muted">확정 · {m.via}</span>
                  </span>
                  <select
                    aria-label={`${m.name} 대체 회차`}
                    value={alt[m.name]}
                    onChange={(e) => setAlt((a) => ({ ...a, [m.name]: e.target.value }))}
                    className="h-8 max-w-[190px] rounded-md border border-line bg-surface px-2 text-caption text-fg"
                  >
                    {alternatives.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} · {a.left}자리
                      </option>
                    ))}
                    <option value="">직접 고르게 하기</option>
                  </select>
                </li>
              ))}
            </ul>
            {alternatives.length === 0 && <p className="px-5 pb-4 text-caption text-fg-muted">이번 주에 자리가 있는 같은 프로그램 회차가 없어요.</p>}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-ai-border bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex-1 text-h3 text-fg">회원별 안내문</h2>
              <AiLabel />
              <RiskBadge tier="high" />
            </div>
            <p className="text-body-sm text-fg-secondary">AI가 쓴 초안이에요. 고친 뒤 휴강을 확정하면 함께 보내요. 확정 전에는 아무것도 보내지 않아요.</p>
            <ul className="flex flex-col gap-3">
              {members.map((m) => (
                <li key={m.name} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-human-bg text-caption text-human-fg">{m.name[0]}</span>
                    <span className="flex-1 text-label-md text-fg">{m.name}</span>
                    <span className="text-caption text-fg-secondary">{altOf(m.name) ? `대체 회차 제안 · ${altOf(m.name)!.label}` : "다른 회차 직접 고르기"}</span>
                  </span>
                  {noConsent.has(m.name) ? (
                    <p className="flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-body-sm text-warning-fg">
                      <Info size={14} aria-hidden />
                      수신 동의가 없어 보내지 않아요 · 휴강 확정 뒤 직접 연락해 주세요
                    </p>
                  ) : (
                    <textarea
                      aria-label={`${m.name} 안내문`}
                      value={draft(m.name)}
                      onChange={(e) => setEdited((d) => ({ ...d, [m.name]: e.target.value }))}
                      rows={3}
                      className="rounded-md border border-line bg-surface p-3 text-body-sm text-fg focus:border-line-strong focus:outline-none"
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-caption text-fg-muted">휴강 확정은 사업장 오너만 할 수 있어요 · 매니저·직원은 보기만 해요</span>
            <Link href={`/admin/schedule/${s.id}`} className="rounded-md px-4 py-2 text-label-md text-fg hover:bg-subtle">
              휴강하지 않기
            </Link>
            <Button variant="primary" onClick={() => setConfirming(true)}>
              휴강 확정 및 안내문 발송
            </Button>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <div className="flex w-full max-w-[460px] flex-col gap-4 rounded-xl bg-surface p-6 shadow-lg">
            <h2 id="cancel-title" className="text-h3 text-fg">
              {labels.date} {s.time} {josa(kindLabel[s.kind], "을를")} 휴강할까요?
            </h2>
            <ul className="flex flex-col gap-1 text-body-sm text-fg-secondary">
              <li>· 확정 예약 {members.length}건이 취소(휴강)로 바뀌어요</li>
              <li>· {sendable.length}명에게 안내문을 보내요</li>
              {sideEffects.map((e) => (
                <li key={e}>· {e}</li>
              ))}
              {noConsent.size > 0 && <li className="text-warning-fg">· {[...noConsent].join("·")}님은 수신 동의가 없어 직접 연락해야 해요</li>}
              <li>· 되돌릴 수 없어요</li>
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                취소
              </Button>
              <Button variant="danger" onClick={confirm}>
                휴강 확정하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
