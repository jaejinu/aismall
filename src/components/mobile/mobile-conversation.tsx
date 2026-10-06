"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle, ChevronDown } from "lucide-react";
import { AiLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/data/inbox";
import { cn } from "@/lib/cn";

/*
 * 관리자 모바일 대화 — 고객 메시지, AI 요약(근거), 예약이 걸린 제안은 승인 카드로, 답장은 사람이 보내요.
 * AI 초안은 고쳐서 보낼 수 있고, 의심 요청(flagged)은 초안 없이 직접 써요.
 */
export function MobileConversation({ c }: { c: Conversation }) {
  const [text, setText] = useState(c.draft?.text ?? "");
  const [sent, setSent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const edited = !!c.draft && text !== c.draft.text;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 pb-56">
        <section className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex cursor-pointer items-center gap-2 text-left">
            <span className="flex-1 text-label-md text-fg">{c.status === "flagged" ? "회원 정보" : "고객 요약"}</span>
            <ChevronDown size={16} className={cn("text-fg-secondary transition-transform", open && "rotate-180")} aria-hidden />
          </button>
          <ul className="flex flex-col gap-1 pt-1 text-body-sm text-fg-secondary">
            {(open ? c.summary : c.summary.slice(0, 1)).map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
          {open && (
            <>
              <p className="pt-1 text-caption text-fg-muted">근거: {c.summaryBasis}</p>
              <dl className="mt-2 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 border-t border-line pt-2 text-body-sm">
                {c.info.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-fg-secondary">{k}</dt>
                    <dd className="text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>

        <ol className="flex flex-col gap-3">
          {c.messages.map((m) => (
            <li key={m.time + m.text} className="flex max-w-[85%] flex-col gap-1 self-start">
              <span className="rounded-2xl rounded-tl-sm bg-surface px-4 py-2.5 text-body-md text-fg ring-1 ring-line">{m.text}</span>
              <span className="text-caption text-fg-muted">{m.time}</span>
            </li>
          ))}
          {sent && (
            <li className="flex max-w-[85%] flex-col items-end gap-1 self-end">
              <span className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-body-md text-on-primary">{sent}</span>
              <span className="text-caption text-fg-muted">방금 · 홍지수</span>
            </li>
          )}
        </ol>

        {c.flaggedReason && (
          <p className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-body-sm text-warning-fg">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {c.flaggedReason}
          </p>
        )}

        {c.proposal && (
          <Link href={`/mobile/approvals/${c.proposal.approvalId}`} className="flex items-center gap-3 rounded-xl border border-ai-border bg-ai-bg/40 p-4 hover:bg-ai-bg">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <AiLabel />
              <span className="text-label-md text-fg">{c.proposal.title}</span>
              <span className="text-caption text-fg-secondary">{c.proposal.meta} · 승인함에서 확인해요</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-fg-secondary" aria-hidden />
          </Link>
        )}

        {sent && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg p-3 text-label-md text-success-fg">
            <CheckCircle size={16} aria-hidden />
            답장을 보냈어요 · 활동 기록에 남아요
          </p>
        )}
      </main>

      {!sent && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[430px] flex-col gap-2 border-t border-line bg-surface p-4 pb-6">
          {c.draft && (
            <div className="flex items-center gap-2">
              <AiLabel />
              <span className="flex-1 text-caption text-fg-secondary">{edited ? "고친 초안 · 보내기 전까지 고객에게 가지 않아요" : "답장 초안 · 보내기 전까지 고객에게 가지 않아요"}</span>
            </div>
          )}
          <label className="sr-only" htmlFor="reply">
            답장
          </label>
          <textarea
            id="reply"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={c.draft ? 4 : 3}
            placeholder={c.status === "flagged" ? "직접 답장을 써 주세요" : "답장을 써 주세요"}
            className="w-full rounded-md border border-line bg-surface p-3 text-body-sm text-fg focus:border-line-strong focus:outline-none"
          />
          {c.draft && <p className="text-caption text-fg-muted">근거: {c.draft.sources.join(" · ")}</p>}
          <Button variant="primary" disabled={!text.trim()} onClick={() => setSent(text.trim())} className="w-full py-2.5">
            {c.draft && !edited ? "초안 그대로 보내기" : "답장 보내기"}
          </Button>
        </div>
      )}
    </>
  );
}
