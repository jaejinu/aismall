import Link from "next/link";
import { Hammer } from "lucide-react";

/* 아직 퍼블리싱하지 않은 메뉴 — 404 대신 안내한다. */
export function ComingSoon({ title, backHref }: { title: string; backHref: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-subtle">
        <Hammer size={20} className="text-fg-secondary" aria-hidden />
      </span>
      <h1 className="text-h2 text-fg">{title}</h1>
      <p className="text-body-md text-fg-secondary">이 화면은 Figma에 디자인이 있고, 아직 코드로 옮기는 중이에요.</p>
      <Link href={backHref} className="rounded-md bg-secondary px-4 py-2 text-label-md text-on-secondary hover:bg-secondary-hover">
        만든 화면으로 돌아가기
      </Link>
    </main>
  );
}
