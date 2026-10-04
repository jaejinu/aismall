import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";

const titles: Record<string, string> = {
  notifications: "알림",
};

export default async function MemberSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = titles[section];
  if (!title) notFound();
  return <ComingSoon title={title} backHref="/member/schedule" />;
}
