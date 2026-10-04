import type { Metadata } from "next";
import { ModuleSettings } from "@/components/settings/module-settings";

export const metadata: Metadata = { title: "모듈 관리 · 재진필라테스" };

export default function ModuleSettingsPage() {
  return <ModuleSettings />;
}
