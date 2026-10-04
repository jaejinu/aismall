"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, Clock, Database, Info, Loader2, XCircle } from "lucide-react";
import { BottomSheet } from "@/components/member/bottom-sheet";
import { ActorBadge, AiLabel, RiskBadge, StatusChip } from "@/components/ui/badges";
import { approvals, type ApprovalRequest } from "@/data/sample";
import { conflictAlternative, partialResult, policyExample, recheck, stateMeta, type CardState } from "@/data/mobile-approvals";
import { cn } from "@/lib/cn";

/*
 * Figma: Mobile / Approvals — 1 Card(120:35) · 2 Executing(120:155) · 3 Result(120:242·120:302)
 *        · Card State(124:449~124:930) · 거절 사유 선택(138:1884)
 * 승인 카드는 C안(근거 펼치기형). 결정 버튼은 두 단: Primary 한 줄 + 보조 한 줄.
 */
type Phase = "view" | "edit" | "executing" | "partial" | "success" | "rejected";

const rejectReasons = ["정원·일정 사정", "고객 요청 변경", "정보 부족", "기타(직접 입력)"];
const toneCls = {
  warning: "bg-warning-bg text-warning-fg",
  neutral: "bg-subtle text-neutral-fg",
  info: "bg-info-bg text-info-fg",
  success: "bg-success-bg text-success-fg",
  danger: "bg-danger-bg text-danger-fg",
};

function TopBar({ title, href }: { title: string; href: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
      <Link href={href} aria-label="뒤로" className="flex size-8 items-center justify-center rounded-md hover:bg-subtle">
        <ArrowLeft size={20} className="text-fg" aria-hidden />
      </Link>
      <h1 className="text-h3 text-fg">{title}</h1>
    </header>
  );
}

function ActionBar({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 mt-auto flex flex-col gap-2 border-t border-line bg-surface px-4 pb-6 pt-3">{children}</div>;
}

const primaryCls = "flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-primary text-label-md text-on-primary hover:bg-primary-hover disabled:cursor-default disabled:bg-muted disabled:text-fg-muted";
const secondaryCls = "flex h-11 flex-1 cursor-pointer items-center justify-center rounded-md bg-secondary text-label-md text-on-secondary hover:bg-secondary-hover";
const ghostCls = "flex h-11 flex-1 cursor-pointer items-center justify-center rounded-md text-label-md text-fg hover:bg-subtle";

function CardHeader({ request, status }: { request: ApprovalRequest; status?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <ActorBadge actor={request.actor} />
        <RiskBadge tier={request.risk} />
        {status ?? <StatusChip status="pending" />}
      </div>
      <h2 className="text-h2 text-fg">{request.title}</h2>
      <p className="text-body-sm text-fg-secondary">{request.subtitle}</p>
    </header>
  );
}

function Actions({ request }: { request: ApprovalRequest }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-label-sm text-fg-muted">실행할 행동</h3>
      <ol className="flex flex-col gap-1">
        {request.actions.map((a, i) => (
          <li key={a} className="flex gap-3 text-body-sm">
            <span className="w-4 shrink-0 text-fg-secondary">{i + 1}</span>
            <span className="flex-1 text-fg">{a}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StateScreen({ request, state, index, total }: { request: ApprovalRequest; state: CardState; index: number; total: number }) {
  const m = stateMeta[state];
  const [choice, setChoice] = useState<"alt" | "ask">("alt");
  const [done, setDone] = useState<string | null>(null);
  const card = state === "policy" ? policyExample : request;

  const primary: Record<CardState, { label: string; result: string }> = {
    conflict: {
      label: choice === "alt" ? "10/15(목) 10:00으로 바꿔 승인" : "고객에게 다른 시간 묻기",
      result: choice === "alt" ? "10/15(목) 10:00 그룹 필라테스로 바꿔 승인했어요" : "문의에 '가능한 시간' 질문을 보냈어요",
    },
    expired: { label: "문의함에서 다시 제안받기", result: "" },
    superseded: { label: "새 제안 보기", result: "" },
    handled: { label: "승인함으로 돌아가기", result: "" },
    policy: { label: "직접 연락함으로 기록", result: "직접 연락함으로 기록했어요 · 활동 기록에 남았어요" },
  };

  return (
    <>
      <TopBar title={`승인 요청 ${index}/${total}`} href="/mobile/approvals" />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <section className={cn("flex flex-col gap-3 rounded-xl p-4", toneCls[m.tone])}>
          <p className="flex items-center gap-2">
            <span className="rounded-sm bg-surface/60 px-1.5 text-caption">{m.chip}</span>
            <span className="text-h3">{m.title}</span>
          </p>
          <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-body-sm text-fg">
            <dt className="text-fg-secondary">된 것</dt>
            <dd>{m.done}</dd>
            <dt className="text-fg-secondary">안 된 것</dt>
            <dd>{m.notDone}</dd>
            <dt className="text-fg-secondary">다음 행동</dt>
            <dd>{m.next}</dd>
          </dl>
        </section>

        <article className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
          <CardHeader
            request={card}
            status={
              state === "policy" ? (
                <StatusChip status="blocked" />
              ) : state === "handled" ? (
                <StatusChip status="confirmed" label="처리됨" />
              ) : state === "expired" ? (
                <StatusChip status="expired" />
              ) : state === "superseded" ? (
                <StatusChip status="superseded" />
              ) : undefined
            }
          />
          {state === "policy" && <Actions request={card} />}
        </article>

        {state === "conflict" && (
          <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <legend className="sr-only">대체 회차</legend>
            <p className="text-label-md text-fg">대체 회차 · 2자리 이상 남은 회차</p>
            {(
              [
                ["alt", conflictAlternative.label, conflictAlternative.meta],
                ["ask", "다른 시간은 고객에게 물어볼게요", "문의에 '가능한 시간' 질문을 보내요"],
              ] as const
            ).map(([v, l, d]) => (
              <label key={v} className="flex cursor-pointer items-start gap-3">
                <input type="radio" name="alt" checked={choice === v} onChange={() => setChoice(v)} className="mt-1 size-4 accent-[var(--color-primary)]" />
                <span className="flex flex-col">
                  <span className="text-label-md text-fg">{l}</span>
                  <span className="text-caption text-fg-muted">{d}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {done && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            <CheckCircle size={16} aria-hidden />
            {done}
          </p>
        )}
      </main>
      <ActionBar>
        {state === "expired" ? (
          <Link href="/admin/inbox" className={primaryCls}>
            {primary.expired.label}
          </Link>
        ) : state === "superseded" ? (
          <Link href="/mobile/approvals/apr-1" className={primaryCls}>
            {primary.superseded.label}
          </Link>
        ) : state === "handled" ? (
          <Link href="/mobile/approvals" className={primaryCls}>
            {primary.handled.label}
          </Link>
        ) : (
          <button type="button" disabled={!!done} onClick={() => setDone(primary[state].result)} className={primaryCls}>
            {done ? "처리했어요" : primary[state].label}
          </button>
        )}
        <div className="flex gap-2">
          {state === "policy" ? (
            <Link href="/admin/members/jung-daeun" className={secondaryCls}>
              회원 정보 보기
            </Link>
          ) : (
            <Link href="/admin/activity" className={secondaryCls}>
              활동 기록 보기
            </Link>
          )}
          <Link href="/mobile/approvals" className={ghostCls}>
            승인함으로
          </Link>
        </div>
      </ActionBar>
    </>
  );
}

export function MobileApprovalFlow({ id, state }: { id: string; state?: CardState }) {
  const index = approvals.findIndex((a) => a.id === id);
  const request = approvals[index];
  const total = approvals.length;
  const [phase, setPhase] = useState<Phase>("view");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(request.message?.body ?? "");
  const [sheet, setSheet] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [checked, setChecked] = useState(0);
  const [resolved, setResolved] = useState<string | null>(null);
  const steps = recheck[request.id] ?? [];
  const next = approvals.filter((a) => a.id !== request.id);

  // 실행 직전 다시 확인 — 한 줄씩 확인되고 끝나면 결과로 넘어가요.
  useEffect(() => {
    if (phase !== "executing") return;
    if (checked < steps.length) {
      const t = setTimeout(() => setChecked((c) => c + 1), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase(partialResult[request.id] ? "partial" : "success"), 400);
    return () => clearTimeout(t);
  }, [phase, checked, steps.length, request.id]);

  if (state) return <StateScreen request={request} state={state} index={index + 1} total={total} />;

  const approve = () => {
    setChecked(0);
    setPhase("executing");
  };

  if (phase === "partial" || phase === "success" || phase === "rejected") {
    const partial = partialResult[request.id];
    return (
      <>
        <TopBar title={phase === "rejected" ? "거절함" : "실행 결과"} href="/mobile/approvals" />
        <main className="flex flex-1 flex-col gap-4 p-4">
          {phase === "rejected" ? (
            <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
              <StatusChip status="expired" label="거절함" />
              <p className="text-label-md text-fg">{request.title}</p>
              <p className="text-body-sm text-fg-secondary">
                아무것도 실행하지 않았어요.{reason && ` 사유: ${reason === "기타(직접 입력)" ? other || "기타" : reason}.`}
                {request.id === "apr-1" && " 문의는 문의함에서 '미처리'로 돌아갔어요."}
              </p>
            </section>
          ) : phase === "partial" && partial && !resolved ? (
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
              <p className="flex items-center gap-2 rounded-lg bg-warning-bg px-3 py-2 text-label-md text-warning-fg">
                <AlertTriangle size={16} aria-hidden />
                예약은 완료, 메시지는 보내지 못했어요
              </p>
              {partial.done.map((d) => (
                <p key={d} className="flex items-start gap-2 text-body-sm text-fg">
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-success-fg" aria-hidden />
                  {d}
                </p>
              ))}
              {partial.failed.map((f) => (
                <p key={f} className="flex items-start gap-2 text-body-sm text-fg">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-danger-fg" aria-hidden />
                  {f}
                </p>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResolved("메시지를 다시 보냈어요 · 김하늘님 카카오 알림톡")}
                  className="cursor-pointer rounded-md bg-secondary px-3 py-1.5 text-label-sm text-on-secondary hover:bg-secondary-hover"
                >
                  메시지 다시 보내기
                </button>
                <button
                  type="button"
                  onClick={() => setResolved("직접 연락함으로 기록했어요")}
                  className="cursor-pointer rounded-md px-3 py-1.5 text-label-sm text-fg hover:bg-subtle"
                >
                  직접 연락함으로 확인 처리
                </button>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
              <p className="flex items-center gap-2 rounded-lg bg-success-bg px-3 py-2 text-label-md text-success-fg">
                <CheckCircle size={16} aria-hidden />
                모두 처리했어요
              </p>
              {(partial ? partial.done : request.doneItems).map((d) => (
                <p key={d} className="flex items-start gap-2 text-body-sm text-fg">
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-success-fg" aria-hidden />
                  {d}
                </p>
              ))}
              {resolved && (
                <p className="flex items-start gap-2 text-body-sm text-fg">
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-success-fg" aria-hidden />
                  {resolved}
                </p>
              )}
            </section>
          )}
          {phase !== "rejected" && partial && <p className="text-body-sm text-fg-secondary">{partial.note}</p>}
          <p className="text-caption text-fg-muted">처리 내용은 활동 기록에 남아요.</p>
        </main>
        <ActionBar>
          {next.length > 0 ? (
            <Link href={`/mobile/approvals/${next[0].id}`} className={primaryCls}>
              다음 승인 {next.length}건 보기
            </Link>
          ) : null}
          <Link href="/mobile/approvals" className={cn(ghostCls, "flex-none")}>
            승인함으로 돌아가기
          </Link>
        </ActionBar>
      </>
    );
  }

  const executing = phase === "executing";

  return (
    <>
      <TopBar title={`승인 요청 ${index + 1}/${total}`} href="/mobile/approvals" />
      <main className="flex flex-1 flex-col gap-4 p-4">
        {executing && (
          <section className="flex flex-col gap-2 rounded-xl bg-info-bg p-4" aria-live="polite">
            <p className="text-label-md text-info-fg">실행 직전에 다시 확인하고 있어요</p>
            {steps.map((s, i) => (
              <p key={s} className="flex items-center gap-2 text-body-sm text-fg">
                {i < checked ? (
                  <CheckCircle size={16} className="shrink-0 text-success-fg" aria-hidden />
                ) : i === checked ? (
                  <Loader2 size={16} className="shrink-0 animate-spin text-info-fg" aria-hidden />
                ) : (
                  <Clock size={16} className="shrink-0 text-fg-muted" aria-hidden />
                )}
                {s}
                {i === checked && "…"}
              </p>
            ))}
          </section>
        )}

        <article className={cn("flex flex-col gap-4 rounded-xl border border-line bg-surface p-4", executing && "opacity-60")}>
          <CardHeader request={request} />
          <Actions request={request} />

          {request.message && (
            <section className="flex flex-col gap-1 rounded-lg border border-line bg-subtle p-3">
              <div className="flex items-center gap-1">
                <span className="text-caption text-fg-muted">{request.message.channel}</span>
                <AiLabel />
              </div>
              {phase === "edit" ? (
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  aria-label="회원에게 보낼 메시지 수정"
                  className="w-full rounded-md border border-line-strong bg-surface p-2 text-body-sm text-fg"
                />
              ) : (
                <p className="text-body-sm text-fg">{message}</p>
              )}
              {phase === "edit" && message !== request.message.body && (
                <p className="text-caption text-ai-fg">원래 제안에서 바뀐 내용이 있어요. 보내기 전에 정책을 다시 확인해요.</p>
              )}
            </section>
          )}

          <section className="rounded-md bg-ai-bg">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left">
              <AiLabel />
              <span className="flex-1 text-label-md text-ai-fg">왜 이렇게 제안했나요?</span>
              {open ? <ChevronUp size={16} className="text-ai-fg" /> : <ChevronDown size={16} className="text-ai-fg" />}
            </button>
            {open && (
              <ul className="flex flex-col gap-2 px-3 pb-3">
                {request.evidence.map((e) => (
                  <li key={e.source} className="flex flex-col gap-0.5 rounded-md bg-surface p-2">
                    <span className="inline-flex items-center gap-1 text-label-sm text-fg-muted">
                      <Database size={12} aria-hidden />
                      {e.source}
                    </span>
                    <span className="text-body-sm text-fg">{e.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>
      </main>

      <ActionBar>
        {executing ? (
          <button type="button" disabled className={primaryCls}>
            다시 확인하는 중…
          </button>
        ) : phase === "edit" ? (
          <>
            <button type="button" onClick={approve} className={primaryCls}>
              수정한 내용으로 {request.primaryLabel}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMessage(request.message?.body ?? "");
                  setPhase("view");
                }}
                className={ghostCls}
              >
                수정 취소
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" onClick={approve} className={primaryCls}>
              {request.primaryLabel}
            </button>
            <div className="flex gap-2">
              {request.message && (
                <button type="button" onClick={() => setPhase("edit")} className={secondaryCls}>
                  수정
                </button>
              )}
              <button type="button" onClick={() => setSheet(true)} className={ghostCls}>
                거절
              </button>
            </div>
          </>
        )}
      </ActionBar>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="거절할까요?">
        <p className="text-body-sm text-fg-secondary">{request.title}</p>
        <div className="flex flex-col gap-2">
          <span className="text-label-md text-fg">거절 사유</span>
          <div className="flex flex-wrap gap-2">
            {rejectReasons.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(reason === r ? null : r)}
                className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-label-sm", reason === r ? "border-fg bg-fg text-fg-inverse" : "border-line text-fg")}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-label-sm text-fg-secondary">직접 입력</span>
            <input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              disabled={reason !== "기타(직접 입력)"}
              placeholder="'기타'를 고르면 적을 수 있어요"
              className="h-10 rounded-md border border-line bg-surface px-3 text-body-sm text-fg disabled:bg-subtle"
            />
          </label>
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-info-bg px-3 py-2 text-body-sm text-fg">
          <Info size={14} className="mt-0.5 shrink-0 text-info-fg" aria-hidden />
          <span>
            <span className="text-info-fg">거절하면 아무것도 실행하지 않아요.</span>
            {request.id === "apr-1" && " 문의는 '미처리'로 돌아가요. 문의함에서 직접 답하거나 AI에게 다시 제안받을 수 있어요."}
          </span>
        </p>
        <p className="text-caption text-fg-muted">고른 사유는 활동 기록에 남고, 다음 제안을 고칠 때 참고해요.</p>
        <button
          type="button"
          onClick={() => {
            setSheet(false);
            setPhase("rejected");
          }}
          className="flex h-12 cursor-pointer items-center justify-center rounded-md bg-danger text-label-md text-on-danger hover:opacity-90"
        >
          거절하기
        </button>
        <button type="button" onClick={() => setSheet(false)} className="flex h-11 cursor-pointer items-center justify-center rounded-md bg-secondary text-label-md text-on-secondary">
          취소
        </button>
      </BottomSheet>
    </>
  );
}
