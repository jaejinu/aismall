import type { Metadata } from "next";
import Link from "next/link";
import { AiLabel, StatusChip } from "@/components/ui/badges";
import { MobileHeader, MobileTabBar } from "@/components/mobile/mobile-chrome";
import { conversations, type Conversation } from "@/data/inbox";

export const metadata: Metadata = { title: "문의함 (모바일) · 재진필라테스" };

/* 관리자 모바일 문의함 — 데스크톱 문의함(23:3142)의 목록. 누르면 대화와 AI 초안이 열려요. */
function stateOf(c: Conversation) {
  if (c.status === "flagged") return <StatusChip status="flagged" />;
  if (c.proposal) return <span className="rounded-md bg-info-bg px-2 py-0.5 text-label-sm text-info-fg">승인 대기</span>;
  if (c.draft) return <AiLabel />;
  return <span className="rounded-md bg-neutral-bg px-2 py-0.5 text-label-sm text-neutral-fg">답장 전</span>;
}

export default function MobileInboxPage() {
  return (
    <>
      <MobileHeader title="문의함" sub={`강남점 · 답장 전 ${conversations.length}건`} />
      <main className="flex flex-1 flex-col pb-28">
        <ul>
          {conversations.map((c) => (
            <li key={c.id} className="border-b border-line">
              <Link href={`/mobile/inbox/${c.id}`} className="flex flex-col gap-1 bg-surface px-4 py-3 hover:bg-subtle">
                <span className="flex items-center gap-2">
                  <span className="text-label-md text-fg">{c.name}</span>
                  <span className="truncate text-caption text-fg-muted">{c.who.split(" · ")[0]}</span>
                  <span className="ml-auto shrink-0 text-caption text-fg-muted">{c.time}</span>
                </span>
                <span className="line-clamp-1 text-body-sm text-fg-secondary">{c.preview}</span>
                <span className="flex">{stateOf(c)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="px-4 py-3 text-caption text-fg-muted">AI 초안은 사람이 확인하고 보내요. 예약이 걸린 제안은 승인함으로 가요.</p>
      </main>
      <MobileTabBar />
    </>
  );
}
