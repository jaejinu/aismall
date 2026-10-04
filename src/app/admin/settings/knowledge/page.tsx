import type { Metadata } from "next";
import { KnowledgeSettings } from "@/components/settings/knowledge-settings";

export const metadata: Metadata = { title: "참고 자료 · 재진필라테스" };

export default function KnowledgePage() {
  return <KnowledgeSettings />;
}
