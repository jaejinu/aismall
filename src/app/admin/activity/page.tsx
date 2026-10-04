import type { Metadata } from "next";
import { ActivityView } from "@/components/activity-view";

export const metadata: Metadata = { title: "활동 기록 · 재진필라테스" };

export default function ActivityPage() {
  return <ActivityView />;
}
