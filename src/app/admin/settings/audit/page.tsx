import type { Metadata } from "next";
import { AuditLog } from "@/components/settings/audit-log";

export const metadata: Metadata = { title: "원본 기록 조회 · 재진필라테스" };

/* ?as=admin 이면 최고관리자 화면으로 열어요. 사업장 오너는 잠긴 화면이에요. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  return <AuditLog key={as} initialViewer={as === "admin" ? "admin" : "owner"} />;
}
