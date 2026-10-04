import type { Metadata } from "next";
import { BusinessSettings } from "@/components/settings/business-settings";

export const metadata: Metadata = { title: "사업장 운영정보 · 재진필라테스" };

export default function BusinessSettingsPage() {
  return <BusinessSettings />;
}
