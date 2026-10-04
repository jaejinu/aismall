import type { Metadata } from "next";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";

export const metadata: Metadata = { title: "연결된 앱 · 재진필라테스" };

export default function IntegrationsPage() {
  return <IntegrationsSettings />;
}
