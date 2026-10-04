import type { Metadata } from "next";
import Link from "next/link";
import { MemberHeader } from "@/components/member/member-shell";
import { InfoBox, NoticeHead } from "@/components/member/notice";
import { ResultBlock } from "@/components/ui/rows";

export const metadata: Metadata = { title: "대기 결과 · 재진필라테스" };

const btn = "flex w-full items-center justify-center rounded-md px-4 py-3 text-label-md";

/*
 * Figma: Member / 대기 결과 · 건너뜀 (129:1117), 자동 확정됨 (129:971)
 * 자동 확정은 수업 3시간 전(16:00)까지만. 그 뒤에 자리가 나면 빈자리 안내로 바뀐다. `?state=auto`로 자동 확정된 경우를 볼 수 있다.
 */
export default async function WaitlistResultPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;

  if (state === "auto")
    return (
      <>
        <MemberHeader title="대기 결과" subtitle="재진필라테스 강남점 · 김하늘님" />
        <main className="flex flex-col gap-5 p-4">
          <NoticeHead chip="확정" tone="success" sentAt="15:12 · 자동 확정" title="대기하던 회차가 확정됐어요" desc="자리가 나서 동의하신 대로 자동으로 예약했어요." />
          <InfoBox
            rows={[
              ["회차", "10/14(수) 19:00 그룹 필라테스 · 50분"],
              ["강사", "박준서 강사"],
              ["취소", "16:12까지(확정 후 1시간) 취소할 수 있어요"],
            ]}
          />
          <Link href="/member/bookings" className={`${btn} bg-primary text-on-primary`}>
            확인했어요
          </Link>
          <Link href="/member/bookings" className={`${btn} bg-secondary text-on-secondary`}>
            예약 취소하기
          </Link>
        </main>
      </>
    );

  return (
    <>
      <MemberHeader title="대기 결과" subtitle="재진필라테스 강남점 · 김하늘님" />
      <main className="flex flex-col gap-5 p-4">
        <NoticeHead
          chip="자동 확정 안 됨"
          tone="warning"
          sentAt="17:05"
          title="자동 확정하지 않았어요"
          desc="자리가 수업 3시간 전(16:00) 이후에 나서 자동 확정 조건에 맞지 않았어요."
        />
        <ResultBlock
          title="빈자리 안내로 바뀌었어요"
          done={["빈자리 안내를 보냈어요 · 먼저 예약하는 분께 확정돼요"]}
          failed={["자동 확정 (16:00 이후라서)"]}
          actions={<span className="text-body-sm text-fg-secondary">지금 자리를 잡거나 대기를 유지하세요</span>}
        />
        <Link href="/member/notices/open-seat" className={`${btn} bg-primary text-on-primary`}>
          자리 잡으러 가기
        </Link>
        <Link href="/member/bookings" className={`${btn} text-fg hover:bg-subtle`}>
          대기 유지할게요
        </Link>
        <Link href="/member/notices/waitlist?state=auto" className="self-center text-caption text-fg-muted underline">
          (예시) 자동 확정된 경우 보기
        </Link>
      </main>
    </>
  );
}
