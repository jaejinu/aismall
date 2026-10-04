import type { Metadata } from "next";
import { AssistantView } from "@/components/member/assistant-view";
import { MemberHeader } from "@/components/member/member-shell";

export const metadata: Metadata = { title: "AI 도우미 · 재진필라테스" };

export default function MemberAssistantPage() {
  return (
    <>
      <MemberHeader title="AI 예약 도우미" subtitle="AI가 응대해요 · 예약·변경·취소는 회원님이 확인해야 진행돼요" />
      <AssistantView />
    </>
  );
}
