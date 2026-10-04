import type { Metadata } from "next";
import { PlaybookSettings } from "@/components/settings/playbook-settings";

export const metadata: Metadata = { title: "응대 지침 · 재진필라테스" };

export default function PlaybookPage() {
  return <PlaybookSettings />;
}
