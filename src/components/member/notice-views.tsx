"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { InfoBox, NoticeHead } from "@/components/member/notice";
import { BottomSheet, SummaryRows } from "@/components/member/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ResultBlock } from "@/components/ui/rows";
import { cn } from "@/lib/cn";

const linkBtn = "flex w-full items-center justify-center rounded-md px-4 py-3 text-label-md";

/*
 * Figma: Member / 참석 확인 (127:607 · 128:721 · 127:743 · 127:871) · 기능 F-HCFDIB, F-DMWGKQ
 * 참석 확인에 '못 가요'로 답하면 변경·취소 마감(24시간 전)이 지났어도 회차 시작 전까지 바로 취소할 수 있다.
 * 취소 사유는 '참석 확인 응답'으로 기록하고 늦은 취소로 세지 않는다. 자리는 바로 대기자에게 안내된다.
 */
export function AttendanceView() {
  const [state, setState] = useState<"ask" | "coming" | "cancelled">("ask");
  const [sheet, setSheet] = useState(false);
  const rows: [string, string][] = [
    ["일시", "10/15(목) 10:00 · 50분"],
    ["프로그램", "그룹 필라테스 · 박준서 강사"],
    ["내 예약", "확정"],
  ];

  if (state === "coming")
    return (
      <main className="flex flex-col gap-5 p-4">
        <NoticeHead chip="확정" tone="success" title="확인했어요. 내일 만나요" desc="수업 10분 전까지 와 주세요." />
        <InfoBox rows={rows} />
        <Link href="/member/bookings" className={cn(linkBtn, "bg-secondary text-on-secondary")}>
          내 예약 보기
        </Link>
      </main>
    );

  if (state === "cancelled")
    return (
      <main className="flex flex-col gap-5 p-4">
        <NoticeHead chip="취소됨" tone="neutral" title="예약을 취소했어요" desc="알려 주셔서 고마워요." />
        <InfoBox
          rows={[
            ["취소한 예약", "10/15(목) 10:00 그룹 필라테스"],
            ["다음", "기다리는 분께 자리가 안내돼요"],
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <Link href="/member/schedule" className={cn(linkBtn, "bg-secondary text-on-secondary")}>
            다른 회차 보기
          </Link>
          <Link href="/member/bookings" className={cn(linkBtn, "text-fg hover:bg-subtle")}>
            내 예약 보기
          </Link>
        </div>
      </main>
    );

  return (
    <main className="flex flex-col gap-5 p-4">
      <NoticeHead sentAt="오늘 10:00에 보낸 안내" title="내일 10:00 그룹 필라테스 오시나요?" desc="못 오시면 미리 알려 주세요. 기다리는 분께 자리가 돌아가요." />
      <InfoBox rows={rows} />
      <div className="flex flex-col gap-2">
        <Button variant="primary" className="w-full py-3" onClick={() => setState("coming")}>
          참석할게요
        </Button>
        <Button className="w-full py-3" onClick={() => setSheet(true)}>
          못 가요
        </Button>
      </div>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="내일 10:00 예약을 취소할까요?">
        <SummaryRows
          rows={[
            ["회차", "10/15(목) 10:00 · 50분"],
            ["프로그램", "그룹 필라테스 · 박준서 강사"],
            ["변경·취소", "참석 확인 응답이라 마감(10/14 10:00)이 지났어도 바로 취소돼요"],
          ]}
        />
        <p className="flex items-center gap-2 text-body-sm text-fg-secondary">
          <CheckCircle size={16} className="text-success-fg" aria-hidden />
          취소하면 기다리는 분께 자리가 안내돼요
        </p>
        <Button
          variant="danger"
          className="w-full py-3"
          onClick={() => {
            setSheet(false);
            setState("cancelled");
          }}
        >
          예약 취소하기
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setSheet(false)}>
          돌아가기
        </Button>
      </BottomSheet>
    </main>
  );
}

/* Figma: Member / 빈자리 안내 (127:1005 · 128:999 · 127:1143 · 127:1274) — 먼저 예약하는 분께 자리가 간다. */
export function OpenSeatView({ initialFull = false }: { initialFull?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"open" | "booked" | "full">(initialFull ? "full" : "open");
  const [sheet, setSheet] = useState(false);
  const base: [string, string][] = [
    ["일시", "10/14(수) 19:00 · 50분"],
    ["프로그램", "그룹 필라테스 · 박준서 강사"],
  ];

  if (state === "booked")
    return (
      <main className="flex flex-col gap-5 p-4">
        <NoticeHead chip="확정" tone="success" title="예약됐어요" desc="오늘 19:00에 만나요. 이 회차 대기 신청은 자동으로 정리됐어요." />
        <InfoBox rows={[...base, ["자리", "8/8 · 마감"]]} />
        <Link href="/member/bookings" className={cn(linkBtn, "bg-secondary text-on-secondary")}>
          내 예약 보기
        </Link>
      </main>
    );

  if (state === "full")
    return (
      <main className="flex flex-col gap-5 p-4">
        <NoticeHead chip="마감" tone="neutral" title="아쉽게도 자리가 이미 찼어요" desc="다른 분이 먼저 예약했어요." />
        <ResultBlock
          title="예약되지 않았어요"
          done={["이 회차 대기 2번째 순번은 그대로예요"]}
          failed={["예약되지 않았어요 · 다른 분이 먼저 예약"]}
          actions={<span className="text-body-sm text-fg-secondary">다른 회차를 보거나 대기 상태를 확인하세요</span>}
        />
        <div className="grid grid-cols-2 gap-2">
          <Link href="/member/schedule" className={cn(linkBtn, "bg-secondary text-on-secondary")}>
            다른 회차 보기
          </Link>
          <Link href="/member/bookings" className={cn(linkBtn, "text-fg hover:bg-subtle")}>
            대기 상태 보기
          </Link>
        </div>
      </main>
    );

  return (
    <main className="flex flex-col gap-5 p-4">
      <NoticeHead chip="빈자리 1" tone="info" sentAt="17:05에 보낸 안내" title="오늘 19:00 그룹 필라테스 자리가 났어요" desc="먼저 예약하는 분께 자리가 가요." />
      <InfoBox rows={[...base, ["자리", "1자리 남음 (7/8) · 예약하면 바로 확정"]]} />
      <div className="flex flex-col gap-2">
        <Button variant="primary" className="w-full py-3" onClick={() => setSheet(true)}>
          자리 잡기
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => router.push("/member/notifications")}>
          괜찮아요
        </Button>
      </div>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="이 회차로 예약할까요?">
        <SummaryRows
          rows={[
            ["회차", "10/14(수) 19:00 · 50분"],
            ["프로그램", "그룹 필라테스 · 박준서 강사"],
            ["자리", "1자리 남음 · 예약하면 바로 확정돼요"],
            ["대기", "이 회차 대기(2번째)는 자동으로 정리돼요"],
          ]}
        />
        <p className="text-body-sm text-fg-secondary">동시에 신청이 몰려도 정원을 넘겨 예약되지 않아요.</p>
        <Button
          variant="primary"
          className="w-full py-3"
          onClick={() => {
            setSheet(false);
            setState("booked");
          }}
        >
          예약하기
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setSheet(false)}>
          닫기
        </Button>
      </BottomSheet>
      <button type="button" onClick={() => setState("full")} className="self-center text-caption text-fg-muted underline">
        (예시) 이미 마감된 경우 보기
      </button>
    </main>
  );
}

/* Figma: Member / 휴강 안내 (127:434) — 휴강 대상 강도윤 회원 예시. 같은 프로그램의 다른 회차로 옮기거나 취소한다. */
const alternatives = [
  { id: "S-1017-09", label: "10/17(토) 09:00 기구 필라테스", meta: "3/6 · 3자리 남음 · 최서연 강사" },
  { id: "S-1019-10", label: "10/19(월) 10:00 기구 필라테스", meta: "2/6 · 4자리 남음 · 최서연 강사" },
];

export function CancelledClassView() {
  const [pick, setPick] = useState(alternatives[0].id);
  const [done, setDone] = useState<null | "moved" | "cancelled">(null);
  const chosen = alternatives.find((a) => a.id === pick)!;

  if (done)
    return (
      <main className="flex flex-col gap-5 p-4">
        <NoticeHead
          chip={done === "moved" ? "승인 대기" : "취소됨"}
          tone={done === "moved" ? "info" : "neutral"}
          title={done === "moved" ? "옮길 회차를 신청했어요" : "휴강된 예약을 취소했어요"}
          desc={done === "moved" ? "기구 필라테스는 관리자가 확인한 뒤 확정돼요. 확정되면 알림으로 알려 드려요." : "다른 회차가 필요하면 수업에서 언제든 신청할 수 있어요."}
        />
        {done === "moved" && <InfoBox rows={[["옮길 회차", chosen.label], ["상태", "관리자 확인 대기"]]} />}
        <Link href="/member/bookings" className={cn(linkBtn, "bg-secondary text-on-secondary")}>
          내 예약 보기
        </Link>
      </main>
    );

  return (
    <main className="flex flex-col gap-5 p-4">
      <NoticeHead chip="휴강" tone="warning" sentAt="오늘 09:00에 보낸 안내" title="10/16(금) 10:00 기구 필라테스 휴강" desc="불편을 드려 죄송해요. 같은 프로그램의 다른 회차로 옮기거나 취소할 수 있어요." />
      <InfoBox
        rows={[
          ["회차", "10/16(금) 10:00 · 기구 필라테스 · 50분"],
          ["휴강 사유", "강사 개인 사정 (최서연 강사)"],
          ["내 예약", "확정 → 휴강"],
        ]}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label-md text-fg">옮길 회차를 골라 주세요</legend>
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          {alternatives.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-start gap-3">
              <input type="radio" name="alt" checked={pick === a.id} onChange={() => setPick(a.id)} className="mt-1 size-4 accent-[var(--color-primary)]" />
              <span className="flex flex-col gap-0.5">
                <span className="text-label-md text-fg">{a.label}</span>
                <span className="text-caption text-fg-secondary">{a.meta}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button variant="primary" className="w-full py-3" onClick={() => setDone("moved")}>
        {chosen.label.split(" 기구")[0]}으로 옮기기
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button className="w-full py-3" onClick={() => setDone("cancelled")}>
          취소하기
        </Button>
        <Link href="/member/assistant" className={cn(linkBtn, "text-fg hover:bg-subtle")}>
          문의하기
        </Link>
      </div>
    </main>
  );
}
