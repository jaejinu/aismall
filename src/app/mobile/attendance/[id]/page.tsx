import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MobileHeader, MobileTabBar } from "@/components/mobile/mobile-chrome";
import { MobileAttendance } from "@/components/mobile/mobile-attendance";
import { weekSessions } from "@/data/schedule";
import { getSession, kindLabel, phaseOf } from "@/data/sessions";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "출석부 (모바일) · 재진필라테스" };

/* 끝난 회차만 기록해요. 시작 전·휴강 회차는 일정 탭으로 돌려보내요. */
export function generateStaticParams() {
  return weekSessions.filter((s) => phaseOf(s) === "ended").map((s) => ({ id: s.id }));
}

export default async function MobileAttendancePage({ params }: Props) {
  const { id } = await params;
  const data = getSession(id);
  if (!data) notFound();
  if (data.phase !== "ended") redirect(`/mobile/schedule?day=${data.session.day}`);
  const { session: s, labels } = data;
  const confirmed = data.roster.filter((r) => r.status === "confirmed").length;
  return (
    <>
      <MobileHeader title={`${s.time} ${kindLabel[s.kind]} 출석부`} sub={`${labels.date} ${s.time}–${labels.end} · ${s.room} · 확정 ${confirmed}명`} back="/mobile/today" />
      <MobileAttendance key={id} data={data} />
      <MobileTabBar active="/mobile/today" />
    </>
  );
}
