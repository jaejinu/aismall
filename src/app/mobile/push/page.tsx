import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "승인 알림 (모바일) · 재진필라테스" };

/*
 * Figma: Mobile / Approvals / 0 Push (120:3) · 잠금화면 숨김 (120:19)
 * 잠금 화면에서는 '내용 숨김'을 켜면 회원 이름·시간을 보여 주지 않아요.
 */
export default async function PushPage({ searchParams }: { searchParams: Promise<{ hidden?: string }> }) {
  const hidden = (await searchParams).hidden === "1";
  return (
    <main data-theme="dark" className="flex min-h-screen flex-1 flex-col items-center gap-2 bg-[#09090b] px-4 pt-20 text-white">
      <p className="text-[56px] font-bold leading-none tracking-tight">13:06</p>
      <p className="text-body-md text-white/80">10월 14일 수요일</p>
      <Link href="/mobile/approvals/apr-1" className="mt-32 flex w-full flex-col gap-1 rounded-2xl bg-white/12 p-4 text-left backdrop-blur hover:bg-white/16">
        <span className="flex items-center gap-2 text-caption text-white/70">
          <span className="flex size-5 items-center justify-center rounded-sm bg-white text-[11px] font-bold text-black">바</span>
          재진필라테스
          <span className="ml-auto">지금</span>
        </span>
        {hidden ? (
          <span className="text-label-md">승인 요청 1건이 있어요 · 잠금을 풀면 볼 수 있어요</span>
        ) : (
          <>
            <span className="text-label-md">김하늘님 10/16(금) 19:00 그룹 필라테스 2자리 · 승인 필요</span>
            <span className="text-body-sm text-white/80">예약 2건 + 확정 메시지 1건 · 2시간 후 만료</span>
          </>
        )}
      </Link>
      <p className="mt-6 text-caption text-white/50">알림을 누르면 승인 카드가 열려요</p>
      <Link href={hidden ? "/mobile/push" : "/mobile/push?hidden=1"} className="mt-auto mb-10 text-caption text-white/60 underline">
        {hidden ? "내용 보이기 예시" : "잠금 화면에서 내용 숨김 예시"}
      </Link>
    </main>
  );
}
