import type { Metadata } from "next";
import { AiControlView } from "@/components/ai-control-view";

export const metadata: Metadata = { title: "AI 관리 · 재진필라테스" };

export default function AiControlPage() {
  return <AiControlView />;
}
