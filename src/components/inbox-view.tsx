"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { ActorBadge, AiLabel, RiskBadge, StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { conversations, type Conversation } from "@/data/inbox";
import { cn } from "@/lib/cn";

/* Figma: Conversation Row (23:161) — AI 태그는 AI 제안이 있을 때, 상태는 승인 대기·확인 필요 등. */
function ConversationRow({ c, selected, onSelect }: { c: Conversation; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-0.5 border-b border-line px-4 py-3 text-left",
        selected ? "border-l-[3px] border-l-ring bg-subtle" : "bg-surface hover:bg-subtle",
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span className="flex-1 text-label-md text-fg">{c.name}</span>
        <span className="text-caption text-fg-muted">{c.time}</span>
      </span>
      <span className="line-clamp-2 text-body-sm text-fg-secondary">{c.preview}</span>
      {(c.ai || c.status !== "open") && (
        <span className="flex gap-1 pt-0.5">
          {c.ai && <ActorBadge actor="ai" />}
          {c.status === "pending" && <StatusChip status="pending" />}
          {c.status === "flagged" && <StatusChip status="flagged" />}
        </span>
      )}
    </button>
  );
}

function Thread({ c }: { c: Conversation }) {
  const [draft, setDraft] = useState(c.draft?.text ?? "");
  const [sent, setSent] = useState<string[]>([]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-h3 text-fg">{c.name}</span>
          <span className="text-caption text-fg-muted">{c.who}</span>
        </div>
        {c.status === "pending" && <StatusChip status="pending" />}
        {c.status === "flagged" && <StatusChip status="flagged" />}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {c.messages.map((m) => (
          <div key={m.time} className="flex max-w-[300px] flex-col gap-0.5 rounded-xl bg-subtle px-4 py-3">
            <p className="text-body-md text-fg">{m.text}</p>
            <p className="text-caption text-fg-muted">{m.time}</p>
          </div>
        ))}
        {c.flaggedReason && (
          <div className="flex items-start gap-2 rounded-lg bg-danger-bg p-3 text-body-sm text-danger-fg">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {c.flaggedReason}
          </div>
        )}
        {c.proposal && (
          <div className="flex flex-col gap-3 rounded-lg border border-ai-border bg-ai-bg px-4 py-3">
            <AiLabel />
            <div className="flex flex-col gap-0.5">
              <p className="text-label-md text-fg">{c.proposal.title}</p>
              <p className="flex flex-wrap items-center gap-1 text-caption text-fg-secondary">
                <RiskBadge tier="medium" />
                {c.proposal.meta}
              </p>
            </div>
            <Link
              href={`/admin/approvals?id=${c.proposal.approvalId}`}
              className="self-start rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover"
            >
              승인 카드 열기
            </Link>
          </div>
        )}
        {sent.map((t) => (
          <div key={t} className="flex max-w-[360px] flex-col gap-0.5 self-end rounded-xl bg-primary px-4 py-3 text-on-primary">
            <p className="text-body-md">{t}</p>
            <p className="inline-flex items-center gap-1 text-caption opacity-80">
              <CheckCircle size={12} aria-hidden />
              홍지수 · 방금 보냄
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-5 py-4">
        <div className="flex flex-col gap-2 rounded-lg border border-ring bg-surface px-4 py-3">
          {c.draft && draft === c.draft.text && (
            <div className="flex items-center gap-2">
              <AiLabel />
              <span className="text-label-sm text-fg-secondary">AI 초안 · 근거 {c.draft.sources.length}개 · 고쳐서 보내도 돼요</span>
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={c.status === "flagged" ? "직접 답장을 써 주세요" : "답장을 써 주세요"}
            aria-label="답장"
            className="w-full resize-none bg-transparent text-body-md text-fg placeholder:text-fg-muted focus:outline-none"
          />
          {c.draft && draft === c.draft.text && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-caption text-fg-secondary">근거</span>
              {c.draft.sources.map((s) => (
                <span key={s} className="rounded-sm bg-subtle px-2 py-0.5 text-caption text-fg-secondary">
                  {s}
                </span>
              ))}
            </div>
          )}
          <p className="text-caption text-fg-muted">보내기 전에는 상대에게 보이지 않아요 · 보내는 사람: 홍지수</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDraft("")} disabled={!draft}>
            초안 지우기
          </Button>
          <div className="flex-1" />
          {c.draft && (
            <Button size="sm" onClick={() => setDraft(c.draft!.text)}>
              다시 만들기
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            disabled={!draft.trim()}
            onClick={() => {
              setSent((s) => [...s, draft.trim()]);
              setDraft("");
            }}
          >
            보내기
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Figma: Desktop / Inbox (23:3142) */
export function InboxView() {
  const [filter, setFilter] = useState<"open" | "pending" | "done" | "archived">("open");
  const [selectedId, setSelectedId] = useState(conversations[0].id);
  const list = filter === "pending" ? conversations.filter((c) => c.status === "pending") : filter === "open" ? conversations : [];
  const selected = conversations.find((c) => c.id === selectedId)!;

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="flex-1 text-h1 text-fg">문의함</h1>
          <FilterChip label="미처리" count={conversations.length} selected={filter === "open"} onClick={() => setFilter("open")} />
          <FilterChip label="승인 대기" count={1} selected={filter === "pending"} onClick={() => setFilter("pending")} />
          <FilterChip label="완료" selected={filter === "done"} onClick={() => setFilter("done")} />
          <FilterChip label="보관" selected={filter === "archived"} onClick={() => setFilter("archived")} />
        </header>
        <div className="flex min-h-[620px] flex-1 overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-line">
            {list.length === 0 ? (
              <p className="p-6 text-center text-body-sm text-fg-secondary">이 목록은 비어 있어요.</p>
            ) : (
              list.map((c) => <ConversationRow key={c.id} c={c} selected={c.id === selectedId} onSelect={() => setSelectedId(c.id)} />)
            )}
          </div>
          <Thread key={selected.id} c={selected} />
        </div>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[440px] xl:shrink-0 xl:border-l">
        <div className="flex items-center gap-2">
          <AiLabel />
          <h2 className="text-h3 text-fg">{selected.status === "flagged" ? "회원 정보" : "고객 요약"}</h2>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-ai-bg px-4 py-3">
          {selected.summary.map((s) => (
            <p key={s} className="text-body-sm text-fg">
              · {s}
            </p>
          ))}
          <p className="text-caption text-fg-muted">근거: {selected.summaryBasis}</p>
        </div>
        <p className="text-label-sm text-fg-muted">고객 정보</p>
        <dl className="flex flex-col gap-2 text-body-sm">
          {selected.info.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-[88px] shrink-0 text-fg-secondary">{k}</dt>
              <dd className="flex-1 text-fg">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2">
          <Button size="sm">할 일 추가</Button>
          <Button size="sm">{selected.who.startsWith("비회원") ? "회원 초대 링크" : "회원 상세"}</Button>
        </div>
      </aside>
    </div>
  );
}
