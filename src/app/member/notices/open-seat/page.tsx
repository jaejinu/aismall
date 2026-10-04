import type { Metadata } from "next";
import { MemberHeader } from "@/components/member/member-shell";
import { OpenSeatView } from "@/components/member/notice-views";

export const metadata: Metadata = { title: "빈자리 안내 · 재진필라테스" };

export default function OpenSeatPage() {
  return (
    <>
      <MemberHeader title="빈자리 안내" subtitle="재진필라테스 강남점 · 김하늘님" />
      <OpenSeatView />
    </>
  );
}
