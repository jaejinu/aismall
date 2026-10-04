"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, Send, UserRound } from "lucide-react";
import { AiLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";

/*
 * Figma: Member / AI Assistant (21:365) · 기능 F-NRJXGH
 * 실제 AI 연결은 2차. 지금은 정해진 시나리오로 답하는 데모예요.
 * 규칙: 초안은 회원이 확인해야만 실행 · 답할 근거가 없거나 예외·환불 요청은 담당자에게 넘김 · AI 답변엔 항상 AI 라벨.
 */
type Draft = { title: string; lines: string[]; cta: string; done: string };

type Msg =
  | { id: number; from: "me"; text: string }
  | { id: number; from: "ai"; text: string; sources?: string[]; draft?: Draft; handoff?: boolean }
  | { id: number; from: "system"; text: string };

const suggestions = ["다음 주 화요일 저녁 자리 있어요?", "금요일 저녁 그룹 수업 있어요?", "내일 수업 취소하고 싶어요", "준비물이 뭐예요?"];

function reply(text: string): Omit<Extract<Msg, { from: "ai" }>, "id" | "from"> {
  if (/환불|결제|할인/.test(text)) {
    return { text: "이 요청은 제가 처리할 수 없어서 담당자가 확인 후 답변드릴게요.", handoff: true };
  }
  if (/취소|못 가|변경/.test(text)) {
    return {
      text: "내일 10/15(목) 10:00 그룹 필라테스는 변경·취소 마감(10/14 10:00)이 지나서 앱에서 취소할 수 없어요. 스튜디오에 바로 연결해 드릴까요?",
      sources: ["내 예약", "변경·취소 마감 정책"],
      handoff: true,
    };
  }
  if (/준비물|챙겨|매트|수건/.test(text)) {
    return { text: "매트와 수건은 스튜디오에 준비돼 있어요. 편한 운동복만 챙겨 오시면 돼요. 처음 오시면 수업 10분 전까지 와 주세요.", sources: ["참고 자료 · 첫 방문 안내"] };
  }
  if (/화요일|다음 주/.test(text)) {
    return {
      text: "10/20(화) 저녁에는 19:00 그룹 필라테스가 있어요. 6/8명이라 2자리 남았어요. 이 회차로 예약할까요?",
      sources: ["회차 잔여석 · 실시간", "변경·취소 마감 정책"],
      draft: {
        title: "10/20(화) 19:00 그룹 필라테스",
        lines: ["박준서 강사 · A룸 · 잔여 2석 · 바로 확정", "변경·취소 마감 10/19(월) 19:00"],
        cta: "화요일 19:00로 예약하기",
        done: "예약이 확정됐어요 · 10/20(화) 19:00 그룹 필라테스",
      },
    };
  }
  if (/금요일/.test(text)) {
    return {
      text: "10/16(금) 19:00 그룹 필라테스에 2자리가 남아 있어요. 이 회차로 예약할까요?",
      sources: ["회차 잔여석 · 실시간"],
      draft: {
        title: "10/16(금) 19:00 그룹 필라테스",
        lines: ["박준서 강사 · A룸 · 잔여 2석 · 바로 확정", "변경·취소 마감 10/15(목) 19:00"],
        cta: "금요일 19:00로 예약하기",
        done: "예약이 확정됐어요 · 10/16(금) 19:00 그룹 필라테스",
      },
    };
  }
  return { text: "제가 잘 이해하지 못했어요. 원하는 프로그램과 날짜·시간을 알려 주시거나, 담당자에게 문의를 보낼 수 있어요.", handoff: true };
}

function DraftCard({ draft, onConfirm, confirmed }: { draft: Draft; onConfirm: () => void; confirmed: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ai-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <AiLabel />
        <span className="text-label-sm text-fg-secondary">예약 초안 · 확인해야 예약돼요</span>
      </div>
      <p className="text-h3 text-fg">{draft.title}</p>
      <div className="text-body-sm text-fg-secondary">
        {draft.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      {confirmed ? (
        <p className="flex items-center gap-2 rounded-md bg-success-bg px-3 py-2 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          예약했어요
        </p>
      ) : (
        <Button variant="primary" className="w-full" onClick={onConfirm}>
          {draft.cta}
        </Button>
      )}
    </div>
  );
}

export function AssistantView() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, from: "ai", text: "무엇을 도와드릴까요? 원하는 프로그램과 날짜·시간을 편하게 말해 주세요. 예약·변경·취소는 회원님이 확인을 눌러야 진행돼요." },
  ]);
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState<number[]>([]);
  const [handedOff, setHandedOff] = useState<number[]>([]);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const me: Msg = { id: nextId.current++, from: "me", text: t };
    const ai: Msg = { id: nextId.current++, from: "ai", ...reply(t) };
    setMessages((m) => [...m, me, ai]);
    setInput("");
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-3 p-4 pb-24">
        {messages.map((m) => {
          if (m.from === "me")
            return (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[280px] rounded-xl bg-primary px-4 py-3 text-body-md text-on-primary">{m.text}</p>
              </div>
            );
          if (m.from === "system")
            return (
              <p key={m.id} className="flex items-center justify-center gap-1 text-caption text-fg-secondary">
                <CheckCircle size={12} className="text-success-fg" aria-hidden />
                {m.text}
              </p>
            );
          return (
            <div key={m.id} className="flex flex-col gap-2">
              <div className="flex max-w-[300px] flex-col gap-1 rounded-xl border border-ai-border bg-ai-bg px-4 py-3">
                <AiLabel />
                <p className="text-body-md text-fg">{m.text}</p>
              </div>
              {m.sources && (
                <div className="flex flex-wrap gap-1">
                  {m.sources.map((s) => (
                    <span key={s} className="rounded-sm bg-subtle px-2 py-0.5 text-caption text-fg-secondary">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {m.draft && (
                <DraftCard
                  draft={m.draft}
                  confirmed={confirmed.includes(m.id)}
                  onConfirm={() => {
                    setConfirmed((c) => [...c, m.id]);
                    setMessages((ms) => [...ms, { id: nextId.current++, from: "system", text: m.draft!.done }]);
                  }}
                />
              )}
              {m.handoff &&
                (handedOff.includes(m.id) ? (
                  <p className="text-caption text-fg-secondary">담당자에게 보냈어요 · 답변이 오면 알림으로 알려 드려요</p>
                ) : (
                  <Button size="sm" className="self-start" onClick={() => setHandedOff((h) => [...h, m.id])}>
                    <UserRound size={14} aria-hidden />
                    담당자에게 문의 보내기
                  </Button>
                ))}
            </div>
          );
        })}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1" aria-label="이런 걸 물어볼 수 있어요">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1.5 text-label-sm text-fg hover:bg-subtle">
                {s}
              </button>
            ))}
          </div>
        )}
        {confirmed.length > 0 && (
          <Link href="/member/bookings" className="self-center text-label-sm text-link">
            내 예약에서 보기
          </Link>
        )}
        <div ref={endRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-0 bottom-[68px] z-10 mx-auto flex w-full max-w-[430px] items-center gap-2 border-t border-line bg-surface px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력"
          aria-label="메시지 입력"
          className="min-w-0 flex-1 rounded-full bg-subtle px-3 py-2 text-body-sm text-fg placeholder:text-fg-muted focus:outline-none"
        />
        <button type="submit" disabled={!input.trim()} aria-label="보내기" className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40">
          <Send size={16} />
        </button>
      </form>
    </>
  );
}
