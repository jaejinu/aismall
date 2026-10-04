import type { Metadata } from "next";
import { BookingsView, type Tab } from "@/components/bookings-view";

export const metadata: Metadata = { title: "예약 · 재진필라테스" };

const tabs: Tab[] = ["all", "pending", "confirmed", "waitlisted", "rejected", "cancelled"];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <BookingsView initialTab={tabs.find((t) => t === tab) ?? "all"} />;
}
