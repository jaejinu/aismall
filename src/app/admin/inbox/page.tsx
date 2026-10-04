import type { Metadata } from "next";
import { InboxView } from "@/components/inbox-view";

export const metadata: Metadata = { title: "문의함 · 재진필라테스" };

export default function InboxPage() {
  return <InboxView />;
}
