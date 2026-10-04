import type { Metadata } from "next";
import { MemberAppSettings } from "@/components/member-app-settings";

export const metadata: Metadata = { title: "회원 앱·문의 페이지 · 재진필라테스" };

export default function MemberAppSettingsPage() {
  return <MemberAppSettings />;
}
