"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle } from "lucide-react";
import { ActorBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { kindLabel, type LogEvent, type Result, type SessionData } from "@/data/sessions";
import { cn } from "@/lib/cn";

/*
 * Figma: Desktop / Attendance (23:2726) · Attendance Row (23:120)
 * 이용 결과(미확인·출석·노쇼)는 예약 상태와 따로 기록한다. 회차가 끝났다고 출석이 되지 않는다.
 * 확정된 회원만 기록한다. 데이터는 src/data/sessions.ts(기준 데이터).
 */
type Attendee = { id: string; name: string; meta: string; result: Result };

const options: { value: Result; label: string; on: string }[] = [
  { value: "unknown", label: "미확인", on: "bg-surface text-fg shadow-sm" },
  { value: "attended", label: "출석", on: "bg-success-bg text-success-fg" },
  { value: "noshow", label: "노쇼", on: "bg-danger-bg text-danger-fg" },
];

export function AttendanceView({ data }: { data: SessionData }) {
  const { session: s, labels } = data;
  const initial: Attendee[] = data.roster
    .filter((r) => r.status === "confirmed")
    .map((r, i) => ({ id: `a${i}`, name: r.name, meta: [r.via, r.note].filter(Boolean).join(" · "), result: r.result }));
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [events, setEvents] = useState<LogEvent[]>(data.log);
  const [toast, setToast] = useState<string | null>(null);

  const count = (r: Result) => rows.filter((x) => x.result === r).length;
  const dirty = rows.some((r, i) => r.result !== saved[i].result);
  const set = (id: string, result: Result) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, result } : r)));
  const label = (r: Result) => options.find((o) => o.value === r)!.label;

  const save = () => {
    const changed = rows.filter((r, i) => r.result !== saved[i].result);
    setEvents((ev) => [...changed.map((c) => ({ actor: "human" as const, text: `홍지수 오너가 ${c.name} ${label(c.result)}${c.result === "noshow" ? "로" : "으로"} 표시`, time: "방금" })), ...ev]);
    setSaved(rows);
    setToast(`이용 결과를 저장했어요 · ${changed.length}명 바뀜`);
  };

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <Link href={`/admin/schedule/${s.id}`} className="inline-flex items-center gap-1 self-start text-label-sm text-link">
          <ArrowLeft size={16} aria-hidden />
          회차 상세로
        </Link>
        <header className="flex flex-col gap-0.5">
          <h1 className="text-h1 text-fg">
            출석부 · {labels.date} {s.time} {kindLabel[s.kind]}
          </h1>
          <p className="text-body-md text-fg-secondary">
            {s.coach} 강사 · {s.room} · 정원 {s.capacity} · 확정 {initial.length} · 회차 종료 {labels.end}
          </p>
        </header>

        {count("unknown") > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-warning-bg px-4 py-3">
            <AlertTriangle size={16} className="shrink-0 text-warning-fg" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-label-md text-warning-fg">아직 {count("unknown")}명의 이용 결과가 미확인이에요</p>
              <p className="text-body-sm text-fg">회차가 끝났다고 자동으로 출석 처리되지 않아요. 모두 출석으로 표시한 뒤 예외만 바꾸면 빨라요.</p>
            </div>
            <Button size="sm" onClick={() => setRows((rs) => rs.map((r) => (r.result === "unknown" ? { ...r, result: "attended" } : r)))}>
              미확인 모두 출석
            </Button>
          </div>
        )}

        {toast && !dirty && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            <CheckCircle size={16} aria-hidden />
            {toast}
          </p>
        )}

        <ul className="overflow-hidden rounded-xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-label-sm text-fg-secondary">{r.name[0]}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-label-md text-fg">{r.name}</span>
                <span className="text-caption text-fg-secondary">{r.meta}</span>
              </span>
              <div role="radiogroup" aria-label={`${r.name} 이용 결과`} className="flex gap-0.5 rounded-md bg-subtle p-0.5">
                {options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={r.result === o.value}
                    onClick={() => set(r.id, o.value)}
                    className={cn("cursor-pointer rounded-sm px-3 py-1 text-label-sm", r.result === o.value ? o.on : "text-fg-muted hover:text-fg")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <footer className="flex items-center gap-3">
          <p className="flex-1 text-label-md text-fg-secondary">
            출석 {count("attended")} · 노쇼 {count("noshow")} · 미확인 {count("unknown")}
          </p>
          <Button variant="ghost" disabled={!dirty} onClick={() => setRows(saved)}>
            취소
          </Button>
          <Button variant="primary" disabled={!dirty} onClick={save}>
            기록 저장
          </Button>
        </footer>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[440px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <h2 className="text-h3 text-fg">기록하면 반영되는 곳</h2>
        <ul className="flex flex-col gap-2">
          {[
            ["회원 내 예약", "지난 이용에 출석·노쇼로 표시돼요"],
            ["Analytics", "모듈을 켜면 노쇼 지표와 인사이트 계산에 쓰여요"],
            ["AI 노쇼 위험 감지", "다음 예약의 근거로 쓰여요 · 회원에게는 보이지 않아요"],
          ].map(([t, d]) => (
            <li key={t} className="flex flex-col gap-0.5 rounded-lg bg-subtle px-4 py-3">
              <span className="text-label-md text-fg">{t}</span>
              <span className="text-body-sm text-fg-secondary">{d}</span>
            </li>
          ))}
        </ul>
        <p className="text-caption text-fg-muted">잘못 기록해도 수정할 수 있고 수정 이력이 남아요.</p>
        <p className="text-label-sm text-fg-muted">최근 기록</p>
        <ul className="flex flex-col gap-2">
          {events.map((e, i) => (
            <li key={`${e.text}-${i}`} className="flex items-center gap-2">
              <ActorBadge actor={e.actor} />
              <span className="flex-1 text-body-sm text-fg">{e.text}</span>
              <span className="text-caption text-fg-muted">{e.time}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
