import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberDetail } from "@/components/member-detail";
import { people } from "@/data/members";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return people.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = people.find((x) => x.id === id);
  return { title: `${p ? p.name : "회원"} · 재진필라테스` };
}

export default async function MemberPage({ params }: Props) {
  const { id } = await params;
  const person = people.find((x) => x.id === id);
  if (!person) notFound();
  return <MemberDetail person={person} />;
}
