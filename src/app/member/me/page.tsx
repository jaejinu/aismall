import type { Metadata } from "next";
import { MemberHeader } from "@/components/member/member-shell";
import { MeView } from "@/components/member/me-view";

export const metadata: Metadata = { title: "내 정보 · 재진필라테스" };

export default function MemberMePage() {
  return (
    <>
      <MemberHeader title="내 정보" subtitle="재진필라테스 회원 · 강남점·홍대점·마포점 모두 이용" />
      <MeView />
    </>
  );
}
