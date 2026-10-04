import type { Metadata } from "next";
import { Info } from "lucide-react";
import { MemberHeader } from "@/components/member/member-shell";
import { WaitingCard } from "@/components/member/waiting-card";
import { StatusChip } from "@/components/ui/badges";
import { deadlinePassed as isDeadlinePassed, memberSessions, pastVisits, programLabel, week } from "@/data/member";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "내 예약 · 재진필라테스" };

function dayLabel(date: string) {
  const w = week.find((x) => x.date === date)!;
  return `10/${w.num}(${w.day})`;
}

/* Figma: Member / My Bookings (21:220) + 내 예약 · 대기 중 (129:811) */
export default function MemberBookingsPage() {
  const upcoming = memberSessions.filter((s) => s.state === "booked" || s.state === "requested");
  const waiting = memberSessions.filter((s) => s.state === "waitlisted");

  return (
    <>
      <MemberHeader title="내 예약" subtitle="변경·취소는 마감 전까지 앱에서 직접 할 수 있어요" />
      <main className="flex flex-col gap-4 p-4">
        <section className="flex flex-col gap-2" aria-labelledby="upcoming">
          <h2 id="upcoming" className="text-label-sm text-fg-muted">
            다가오는 예약 {upcoming.length}
          </h2>
          {upcoming.map((s) => {
            const deadlinePassed = isDeadlinePassed(s);
            return (
              <article key={s.id} className="flex items-center gap-3 rounded-lg border border-success-fg/30 bg-success-bg px-4 py-3">
                <div className="flex w-12 shrink-0 flex-col gap-0.5">
                  <span className="text-label-md text-fg">{s.time}</span>
                  <span className="text-caption text-fg-muted">50분</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-label-md text-fg">
                    {dayLabel(s.day)} {programLabel[s.kind]}
                  </span>
                  <span className="text-caption text-fg-secondary">
                    {s.coach} · {s.room} · {deadlinePassed ? "변경·취소 마감이 지났어요" : `변경·취소 ${s.deadline}까지`}
                  </span>
                  <span className="self-start"><StatusChip status="confirmed" /></span>
                </div>
                <button
                  type="button"
                  disabled={deadlinePassed}
                  className="shrink-0 cursor-pointer rounded-md px-3 py-1 text-label-sm text-fg hover:bg-surface disabled:cursor-not-allowed disabled:text-fg-muted"
                >
                  {deadlinePassed ? "스튜디오에 연락" : "변경·취소"}
                </button>
              </article>
            );
          })}
        </section>

        {waiting.length > 0 && (
          <section className="flex flex-col gap-2" aria-labelledby="waiting">
            <h2 id="waiting" className="text-label-sm text-fg-muted">
              대기 중 {waiting.length}
            </h2>
            {waiting.map((s) => (
              <WaitingCard
                key={s.id}
                title={`${dayLabel(s.day)} ${s.time} ${programLabel[s.kind]}`}
                sub={`오늘 · 50분 · ${s.coach} · 정원 ${s.capacity} 마감`}
                waitNo={s.myWaitNo ?? 0}
              />
            ))}
          </section>
        )}

        <p className="flex items-start gap-2 rounded-lg bg-subtle p-3 text-body-sm text-fg-secondary">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
          다른 회차로 바꿀 때는 새 자리를 먼저 잡고, 실패하면 지금 예약이 그대로 유지돼요.
        </p>

        <section className="flex flex-col gap-2" aria-labelledby="past">
          <h2 id="past" className="text-label-sm text-fg-muted">
            지난 이용
          </h2>
          {pastVisits.map((v) => (
            <div key={v.date} className="flex items-center rounded-lg border border-line bg-surface px-4 py-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-label-md text-fg">{v.title}</span>
                <span className="text-caption text-fg-secondary">{v.date}</span>
              </div>
              <span
                className={cn(
                  "text-label-sm",
                  v.result === "출석" && "text-success-fg",
                  v.result === "노쇼" && "text-danger-fg",
                  v.result === "기록 전" && "text-fg-muted",
                )}
              >
                {v.result}
              </span>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
