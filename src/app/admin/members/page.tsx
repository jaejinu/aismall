import type { Metadata } from "next";
import { MembersView } from "@/components/members-view";

export const metadata: Metadata = { title: "회원·고객 · 재진필라테스" };

export default function MembersPage() {
  return <MembersView />;
}
