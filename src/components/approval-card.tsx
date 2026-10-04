"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Database } from "lucide-react";
import { ActorBadge, AiLabel, RiskBadge, StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { ResultBlock } from "@/components/ui/rows";
import type { ApprovalRequest } from "@/data/sample";
import { cn } from "@/lib/cn";

/*
 * Figma: Approval Card (9:384) — 프로토타입 기본값인 C안(근거 펼치기형).
 * A·B·C 중 최종안은 Test A 결과로 정한다(F-CUANUP).
 */
const rejectReasons = ["시간이 틀림", "문구 수정 필요", "대상이 틀림", "지금은 필요 없음"];

type Mode = "view" | "edit" | "reject" | "done" | "rejected";

export function ApprovalCard({ request }: { request: ApprovalRequest }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [message, setMessage] = useState(request.message?.body ?? "");
  const [reason, setReason] = useState<string | null>(null);

  if (mode === "done") {
    return (
      <ResultBlock
        tone="success"
        title="처리했어요"
        done={request.doneItems}
        actions={<span className="text-body-sm text-fg-secondary">활동 기록에 남았어요</span>}
      />
    );
  }

  if (mode === "rejected") {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
        <StatusChip status="expired" label="거절함" />
        <p className="text-label-md text-fg">{request.title}</p>
        <p className="text-body-sm text-fg-secondary">
          {reason ? `사유: ${reason} · ` : ""}문의는 문의함에서 &apos;미처리&apos;로 돌아갔어요.
        </p>
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <ActorBadge actor={request.actor} />
          <RiskBadge tier={request.risk} />
          <StatusChip status="pending" />
        </div>
        <h3 className="text-h2 text-fg">{request.title}</h3>
        <p className="text-body-sm text-fg-secondary">{request.subtitle}</p>
      </header>

      <section className="flex flex-col gap-1">
        <h4 className="text-label-sm text-fg-muted">실행할 행동</h4>
        <ol className="flex flex-col gap-1">
          {request.actions.map((a, i) => (
            <li key={a} className="flex gap-2 text-body-sm">
              <span className="w-[88px] shrink-0 text-fg-secondary">{i + 1}</span>
              <span className="flex-1 text-fg">{a}</span>
            </li>
          ))}
        </ol>
      </section>

      {request.message && (
        <section className="flex flex-col gap-1 rounded-lg border border-line bg-subtle p-3">
          <div className="flex items-center gap-1">
            <span className="text-caption text-fg-muted">{request.message.channel}</span>
            <AiLabel />
          </div>
          {mode === "edit" ? (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              aria-label="회원에게 보낼 메시지 수정"
              className="w-full resize-y rounded-md border border-line-strong bg-surface p-2 text-body-sm text-fg"
            />
          ) : (
            <p className="text-body-sm text-fg">{message}</p>
          )}
          {mode === "edit" && message !== request.message.body && (
            <p className="text-caption text-ai-fg">원래 제안에서 바뀐 내용이 있어요. 보내기 전에 정책을 다시 확인해요.</p>
          )}
        </section>
      )}

      <section className="rounded-md bg-ai-bg">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left"
        >
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

      {mode === "reject" ? (
        <section className="flex flex-col gap-2">
          <p className="text-label-sm text-fg-muted">거절 사유 (고르지 않아도 돼요)</p>
          <div className="flex flex-wrap gap-2">
            {rejectReasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(reason === r ? null : r)}
                aria-pressed={reason === r}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-label-sm",
                  reason === r ? "border-fg bg-fg text-fg-inverse" : "border-line text-fg hover:bg-subtle",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-caption text-fg-secondary">문의는 미처리로 돌아가요.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMode("view")}>
              취소
            </Button>
            <Button variant="danger" onClick={() => setMode("rejected")}>
              거절하기
            </Button>
          </div>
        </section>
      ) : (
        <footer className="flex flex-wrap justify-end gap-2">
          {mode === "edit" ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setMessage(request.message?.body ?? "");
                  setMode("view");
                }}
              >
                수정 취소
              </Button>
              <Button variant="primary" onClick={() => setMode("done")}>
                수정한 내용으로 {request.primaryLabel}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="px-3" onClick={() => setMode("reject")}>
                거절
              </Button>
              {request.message && <Button onClick={() => setMode("edit")}>수정 후 승인</Button>}
              <Button variant="primary" onClick={() => setMode("done")}>
                {request.primaryLabel}
              </Button>
            </>
          )}
        </footer>
      )}
    </article>
  );
}
