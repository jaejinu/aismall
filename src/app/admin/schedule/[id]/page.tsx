import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionDetail } from "@/components/session-detail";
import { weekSessions } from "@/data/schedule";
import { getSession } from "@/data/sessions";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return weekSessions.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = getSession((await params).id);
  return { title: data ? `${data.labels.title} · 재진필라테스` : "회차 상세 · 재진필라테스" };
}

export default async function SessionPage({ params }: Props) {
  const data = getSession((await params).id);
  if (!data) notFound();
  return <SessionDetail data={data} />;
}
