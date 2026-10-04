import type { Metadata } from "next";
import { AskStatus, type StatusState } from "@/components/ask/ask-views";

export const metadata: Metadata = { title: "문의 확인 · 재진필라테스 강남점" };

const states: StatusState[] = ["pending", "answered", "requested", "expired"];

/* 문자로 받은 확인 링크로 여는 페이지. ?state=pending|answered|requested|expired (기본: 답변 도착) */
export default async function AskStatusPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const initial = states.find((s) => s === state) ?? "answered";
  return <AskStatus key={initial} initial={initial} />;
}
