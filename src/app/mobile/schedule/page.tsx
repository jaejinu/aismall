import type { Metadata } from "next";
import Link from "next/link";
import { MobileHeader, MobileTabBar } from "@/components/mobile/mobile-chrome";
import { MobileSessionList } from "@/components/mobile/mobile-session-list";
import { weekDays, weekSessions } from "@/data/schedule";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "일정 (모바일) · 재진필라테스" };

type Props = { searchParams: Promise<{ day?: string }> };

/*
 * 관리자 모바일 일정 — 이번 주(10/12~18) 요일 칩 + 그날 회차 목록. 데스크톱 주간 일정(23:2310)의 표 대신 하루씩 봐요.
 * 요일은 ?day=2026-10-16 처럼 주소로 바꿔요. 회차 편성·AI 편성 제안은 PC 화면에서 해요.
 */
export default async function MobileSchedulePage({ searchParams }: Props) {
  const { day } = await searchParams;
  const selected = weekDays.find((d) => d.date === day)?.date ?? "2026-10-14";
  const sessions = weekSessions.filter((s) => s.day === selected);
  const label = weekDays.find((d) => d.date === selected)!.label;
  return (
    <>
      <MobileHeader title="일정" sub="강남점 · 이번 주 10/12–10/18" />
      <main className="flex flex-1 flex-col gap-4 p-4 pb-28">
        <nav aria-label="요일" className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {weekDays.map((d) => {
            const count = weekSessions.filter((s) => s.day === d.date).length;
            const on = d.date === selected;
            return (
              <Link
                key={d.date}
                href={`/mobile/schedule?day=${d.date}`}
                aria-current={on ? "date" : undefined}
                className={cn(
                  "flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-lg border py-2",
                  on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-fg hover:bg-subtle",
                )}
              >
                <span className="text-caption">{d.label.split(" ")[0]}</span>
                <span className="text-label-md">{d.label.split(" ")[1]}</span>
                <span className={cn("text-caption", on ? "text-on-primary" : "text-fg-muted")}>{count > 0 ? `${count}개` : "–"}</span>
              </Link>
            );
          })}
        </nav>
        <section aria-labelledby="day" className="flex flex-col gap-2">
          <h2 id="day" className="text-h3 text-fg">
            {label.split(" ")[1]}일 ({label.split(" ")[0]}) {d0(selected)}
          </h2>
          <MobileSessionList sessions={sessions} empty="이날은 강남점 회차가 없어요." />
        </section>
        <Link href="/admin/schedule" className="rounded-xl border border-dashed border-line-strong p-4 text-body-sm text-fg-secondary hover:bg-subtle">
          회차 추가·AI 편성 제안은 PC 화면의 주간 일정에서 해요 →
        </Link>
      </main>
      <MobileTabBar />
    </>
  );
}

function d0(date: string) {
  return date === "2026-10-14" ? "· 오늘" : "";
}
