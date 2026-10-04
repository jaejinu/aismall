import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AttendanceView } from "@/components/attendance-view";
import { weekSessions } from "@/data/schedule";
import { getSession, phaseOf } from "@/data/sessions";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "출석부 · 재진필라테스" };

/* 이용 결과는 끝난 회차에만 기록해요. 시작 전·휴강 회차는 회차 상세로 돌려보내요. */
export function generateStaticParams() {
  return weekSessions.filter((s) => phaseOf(s) === "ended").map((s) => ({ id: s.id }));
}

export default async function AttendancePage({ params }: Props) {
  const { id } = await params;
  const data = getSession(id);
  if (!data) notFound();
  if (data.phase !== "ended") redirect(`/admin/schedule/${id}`);
  return <AttendanceView data={data} />;
}
