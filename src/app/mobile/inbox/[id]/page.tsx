import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MobileHeader } from "@/components/mobile/mobile-chrome";
import { MobileConversation } from "@/components/mobile/mobile-conversation";
import { conversations } from "@/data/inbox";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return conversations.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = conversations.find((x) => x.id === id);
  return { title: `${c?.name ?? "문의"} (모바일 문의함) · 재진필라테스` };
}

export default async function MobileConversationPage({ params }: Props) {
  const { id } = await params;
  const c = conversations.find((x) => x.id === id);
  if (!c) notFound();
  return (
    <>
      <MobileHeader title={c.name} sub={c.who} back="/mobile/inbox" />
      <MobileConversation key={c.id} c={c} />
    </>
  );
}
