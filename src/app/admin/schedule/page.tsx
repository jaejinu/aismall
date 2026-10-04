import type { Metadata } from "next";
import { WeekSchedule } from "@/components/week-schedule";

export const metadata: Metadata = { title: "일정 · 재진필라테스" };

export default function SchedulePage() {
  return <WeekSchedule />;
}
