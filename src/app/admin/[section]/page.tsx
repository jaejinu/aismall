import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";

const titles: Record<string, string> = {
  inbox: "문의함",
  approvals: "승인함",
  schedule: "일정",
  programs: "프로그램·회차",
  members: "회원·고객",
  ai: "AI 관리",
  activity: "활동 기록",
  settings: "설정",
};

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = titles[section];
  if (!title) notFound();
  return <ComingSoon title={title} backHref="/admin/today" />;
}
