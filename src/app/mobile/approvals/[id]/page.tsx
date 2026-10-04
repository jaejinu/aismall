import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MobileApprovalFlow } from "@/components/mobile/mobile-approval-flow";
import { stateMeta, type CardState } from "@/data/mobile-approvals";
import { approvals } from "@/data/sample";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ state?: string }> };

export const metadata: Metadata = { title: "승인 요청 (모바일) · 재진필라테스" };

/* ?state=conflict|expired|superseded|handled|policy 로 카드 상태 화면을 열어요. */
export default async function MobileApprovalPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { state } = await searchParams;
  if (!approvals.some((a) => a.id === id)) notFound();
  const cardState = state && state in stateMeta ? (state as CardState) : undefined;
  return <MobileApprovalFlow key={`${id}-${cardState}`} id={id} state={cardState} />;
}
