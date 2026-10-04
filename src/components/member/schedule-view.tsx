"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { AiLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { BottomSheet, SummaryRows } from "@/components/member/bottom-sheet";
import { SessionCard } from "@/components/member/session-card";
import {
  autoConfirm,
  deadlinePassed,
  memberSessions,
  programLabel,
  todayDate,
  week,
  type MemberSession,
  type ProgramKind,
} from "@/data/member";
import { cn } from "@/lib/cn";

const weekdayFull: Record<string, string> = { 월: "월요일", 화: "화요일", 수: "수요일", 목: "목요일", 금: "금요일", 토: "토요일", 일: "일요일" };
const filters: { key: ProgramKind | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "group", label: "그룹" },
  { key: "reformer", label: "기구" },
  { key: "duet", label: "듀엣" },
  { key: "private", label: "1:1" },
];

function Chip({ selected, children, onClick }: { selected: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "shrink-0 cursor-pointer rounded-full border px-3 py-1 text-label-sm",
        selected ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-fg-secondary hover:bg-subtle",
      )}
    >
      {children}
    </button>
  );
}

/* Figma: Member / Schedule (21:3) + Booking Sheet (22:234) */
export function ScheduleView() {
  const [day, setDay] = useState(todayDate);
  const [filter, setFilter] = useState<ProgramKind | "all">("all");
  const [sessions, setSessions] = useState<MemberSession[]>(memberSessions);
  const [target, setTarget] = useState<MemberSession | null>(null);
  const [autoConsent, setAutoConsent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const dayInfo = week.find((w) => w.date === day)!;
  const list = useMemo(
    () => sessions.filter((s) => s.day === day && (filter === "all" || s.kind === filter)),
    [sessions, day, filter],
  );

  const update = (id: string, patch: Partial<MemberSession>) =>
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const confirm = () => {
    if (!target) return;
    if (target.state === "full") {
      update(target.id, { state: "waitlisted", myWaitNo: (target.waitlist ?? 0) + 1 });
      setToast(autoConsent ? "대기 신청했어요 · 자리가 나면 자동으로 확정돼요" : "대기 신청했어요 · 자리가 나면 알림을 보내 드려요");
    } else if (autoConfirm[target.kind]) {
      update(target.id, { state: "booked", booked: target.booked + 1 });
      setToast("예약이 확정됐어요");
    } else {
      update(target.id, { state: "requested" });
      setToast("신청했어요 · 관리자가 확인하면 알려 드려요");
    }
    setTarget(null);
    setAutoConsent(false);
  };

  const isWait = target?.state === "full";
  const targetDay = target ? week.find((w) => w.date === target.day)! : null;

  return (
    <>
      <section className="flex flex-col gap-2 border-b border-line bg-surface px-4 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-label-md text-fg">10월 셋째 주</p>
          <Chip selected onClick={() => {}}>
            주
          </Chip>
          <Chip selected={false} onClick={() => {}}>
            월
          </Chip>
        </div>
        <div className="flex justify-between" role="tablist" aria-label="날짜">
          {week.map((w) => {
            const selected = w.date === day;
            const past = w.date < todayDate;
            return (
              <button
                key={w.date}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setDay(w.date)}
                className={cn(
                  "flex h-14 w-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg",
                  selected ? "bg-primary text-on-primary" : "hover:bg-subtle",
                  past && !selected && "opacity-40",
                )}
              >
                <span className={cn("text-caption", !selected && "text-fg-muted")}>{w.day}</span>
                <span className={cn("text-label-md", !selected && "text-fg")}>{w.num}</span>
              </button>
            );
          })}
        </div>
      </section>

      <main className="flex flex-col gap-4 p-4">
        <div className="flex gap-2 overflow-x-auto" aria-label="프로그램 필터">
          {filters.map((f) => (
            <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </Chip>
          ))}
        </div>
        <p className="text-label-sm text-fg-muted">
          {weekdayFull[dayInfo.day]} 10/{dayInfo.num} · 회차 {list.length}개
        </p>
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-body-sm text-fg-secondary">
            {day < todayDate ? "지난 날이에요." : "이 날은 열린 회차가 없어요."}
          </p>
        ) : (
          list.map((s) => <SessionCard key={s.id} s={s} onAction={setTarget} />)
        )}
        <Link
          href="/member/assistant"
          className="flex items-center gap-2 rounded-xl border border-ai-border bg-ai-bg px-4 py-3 hover:opacity-90"
        >
          <AiLabel />
          <span className="flex-1 text-body-sm text-ai-fg">원하는 시간을 말로 물어보세요 · &quot;다음 주 화요일 저녁 자리 있어요?&quot;</span>
        </Link>
      </main>

      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-24 z-30 mx-auto flex w-fit max-w-[400px] items-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md text-on-primary shadow-lg">
          <CheckCircle size={16} aria-hidden />
          {toast}
          <button type="button" onClick={() => setToast(null)} className="ml-2 cursor-pointer text-label-sm underline">
            닫기
          </button>
        </div>
      )}

      <BottomSheet
        open={!!target}
        onClose={() => setTarget(null)}
        title={isWait ? "대기 신청할까요?" : "이 회차로 신청할까요?"}
      >
        {target && targetDay && (
          <>
            <SummaryRows
              rows={[
                ["회차", `10/${targetDay.num}(${targetDay.day}) ${target.time} · 50분`],
                ["프로그램", `${programLabel[target.kind]} · ${target.coach} · ${target.room}`],
                isWait
                  ? ["자리", `마감 · 대기 ${target.waitlist ?? 0}명`]
                  : [
                      "자리",
                      `${target.capacity - target.booked}자리 남음 · ${autoConfirm[target.kind] ? "신청하면 바로 확정돼요" : "관리자 확인 후 확정돼요"}`,
                    ],
                [
                  "변경·취소",
                  deadlinePassed(target) ? "마감이 지났어요 · 신청 후엔 스튜디오에 연락해 주세요" : `${target.deadline}까지 앱에서 직접`,
                ],
              ]}
            />
            {isWait ? (
              <div className="flex flex-col gap-2">
                <p className="text-body-sm text-fg-secondary">대기 신청은 예약이 아니에요. 자리가 나면 먼저 알려 드려요.</p>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line p-3">
                  <input
                    type="checkbox"
                    checked={autoConsent}
                    onChange={(e) => setAutoConsent(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--color-primary)]"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-label-md text-fg">자리 나면 자동 확정</span>
                    <span className="text-caption text-fg-secondary">수업 3시간 전까지 자리가 나면 순번대로 바로 확정돼요. 확정 후 1시간 안에는 취소할 수 있어요.</span>
                  </span>
                </label>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-body-sm text-fg-secondary">
                <CheckCircle size={16} className="text-success-fg" aria-hidden />
                동시에 신청이 몰려도 정원을 넘겨 예약되지 않아요
              </p>
            )}
            <Button variant="primary" className="w-full py-3" onClick={confirm}>
              {isWait
                ? "대기 신청하기"
                : `${weekdayFull[targetDay.day]} ${target.time}${autoConfirm[target.kind] ? "로 예약하기" : "로 신청하기"}`}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setTarget(null)}>
              닫기
            </Button>
          </>
        )}
      </BottomSheet>
    </>
  );
}
