import type { Metadata } from "next";
import { ProgramsView } from "@/components/programs-view";

export const metadata: Metadata = { title: "프로그램·회차 · 재진필라테스" };

export default function ProgramsPage() {
  return <ProgramsView />;
}
