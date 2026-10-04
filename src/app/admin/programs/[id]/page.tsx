import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramDetail } from "@/components/program-detail";
import { programs } from "@/data/programs";

type Props = { params: Promise<{ id: string }> };

/* /admin/programs/new 은 새 프로그램 만들기 */
export function generateStaticParams() {
  return [...programs.map((p) => ({ id: p.id })), { id: "new" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = programs.find((x) => x.id === id);
  return { title: `${p ? p.name : "새 프로그램"} · 재진필라테스` };
}

export default async function ProgramPage({ params }: Props) {
  const { id } = await params;
  if (id === "new") return <ProgramDetail program={null} />;
  const program = programs.find((p) => p.id === id);
  if (!program) notFound();
  return <ProgramDetail program={program} />;
}
