import type { Metadata } from "next";
import { AskResend } from "@/components/ask/ask-views";

export const metadata: Metadata = { title: "확인 링크 다시 받기 · 재진필라테스 강남점" };

export default function AskResendPage() {
  return <AskResend />;
}
