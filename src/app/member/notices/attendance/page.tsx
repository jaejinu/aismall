import type { Metadata } from "next";
import { MemberHeader } from "@/components/member/member-shell";
import { AttendanceView } from "@/components/member/notice-views";

export const metadata: Metadata = { title: "참석 확인 · 재진필라테스" };

export default function AttendancePage() {
  return (
    <>
      <MemberHeader title="참석 확인" subtitle="재진필라테스 강남점 · 김하늘님" />
      <AttendanceView />
    </>
  );
}
