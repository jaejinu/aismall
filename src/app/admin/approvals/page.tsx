import type { Metadata } from "next";
import { ApprovalsView } from "@/components/approvals-view";

export const metadata: Metadata = { title: "승인함 · 재진필라테스" };

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <ApprovalsView initialId={id} />;
}
