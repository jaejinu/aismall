import type { Metadata } from "next";
import { MemberHeader } from "@/components/member/member-shell";
import { ScheduleView } from "@/components/member/schedule-view";

export const metadata: Metadata = { title: "수업 · 재진필라테스" };

export default function MemberSchedulePage() {
  return (
    <>
      <MemberHeader title="재진필라테스 강남점" subtitle="회원 · 김하늘" />
      <ScheduleView />
    </>
  );
}
