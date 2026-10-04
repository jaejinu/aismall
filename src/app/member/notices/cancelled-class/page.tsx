import type { Metadata } from "next";
import { MemberHeader } from "@/components/member/member-shell";
import { CancelledClassView } from "@/components/member/notice-views";

export const metadata: Metadata = { title: "휴강 안내 · 재진필라테스" };

/* 휴강 대상은 기준 데이터상 강도윤 회원이라, 이 화면만 강도윤 회원 예시로 보여 준다. */
export default function CancelledClassPage() {
  return (
    <>
      <MemberHeader title="휴강 안내" subtitle="재진필라테스 강남점 · 강도윤님 (예시)" />
      <CancelledClassView />
    </>
  );
}
