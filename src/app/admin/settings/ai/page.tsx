import type { Metadata } from "next";
import { AiPermissionsView } from "@/components/ai-permissions-view";

export const metadata: Metadata = { title: "AI 권한 · 재진필라테스" };

/* ?as=admin 이면 최고관리자 화면, ?preview=reminder 면 그 업무 유형을 자동 실행으로 바꾼 미리보기로 열어요. */
export default async function AiPermissionsPage({ searchParams }: { searchParams: Promise<{ as?: string; preview?: string }> }) {
  const { as, preview } = await searchParams;
  return <AiPermissionsView key={`${as}-${preview}`} initialRole={as === "admin" ? "admin" : "owner"} preview={preview} />;
}
