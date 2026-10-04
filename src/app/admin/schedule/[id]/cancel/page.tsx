import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CancelClassView } from "@/components/cancel-class-view";
import { alternativesFor, doneResult } from "@/data/cancel";
import { weekSessions } from "@/data/schedule";
import { getSession, phaseOf } from "@/data/sessions";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "휴강 처리 · 재진필라테스" };

/* 시작 전 회차는 휴강 처리, 이미 휴강한 회차는 처리 결과. 끝난 회차는 회차 상세로 돌려보내요. */
export function generateStaticParams() {
  return weekSessions.filter((s) => phaseOf(s) !== "ended").map((s) => ({ id: s.id }));
}

export default async function CancelClassPage({ params }: Props) {
  const { id } = await params;
  const data = getSession(id);
  if (!data) notFound();
  if (data.phase === "ended") redirect(`/admin/schedule/${id}`);
  return <CancelClassView data={data} alternatives={alternativesFor(data.session)} done={doneResult[id]} />;
}
