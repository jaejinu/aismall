import type { Metadata } from "next";
import { AskForm } from "@/components/ask/ask-views";

export const metadata: Metadata = { title: "문의하기 · 재진필라테스 강남점" };

export default function AskPage() {
  return <AskForm />;
}
