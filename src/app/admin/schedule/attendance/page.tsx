import type { Metadata } from "next";
import { AttendanceView } from "@/components/attendance-view";

export const metadata: Metadata = { title: "출석부 · 재진필라테스" };

export default function AttendancePage() {
  return <AttendanceView />;
}
