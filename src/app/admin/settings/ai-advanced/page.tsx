import type { Metadata } from "next";
import { AiAdvancedSettings } from "@/components/settings/ai-advanced-settings";

export const metadata: Metadata = { title: "고급 AI 설정 · 재진필라테스" };

export default function AiAdvancedPage() {
  return <AiAdvancedSettings />;
}
