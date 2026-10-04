import type { Metadata } from "next";
import { MobileApprovalsList } from "@/components/mobile/mobile-approvals-list";

export const metadata: Metadata = { title: "승인함 (모바일) · 재진필라테스" };

export default function MobileApprovalsPage() {
  return <MobileApprovalsList />;
}
