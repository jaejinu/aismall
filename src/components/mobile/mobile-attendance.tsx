"use client";

import { useState } from "react";
import { CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Result, SessionData } from "@/data/sessions";
import { cn } from "@/lib/cn";

/*
 * 관리자 모바일 출석부 — Figma Staff 출석부 159:2041(처음) · 159:2303(모두 출석 뒤 예외만).
 * 이용 결과는 예약 상태와 따로 기록하고, 회차가 끝났다고 자동으로 출석되지 않아요.
 * '모두 출석으로 표시'는 미확인만 바꾸고, 되돌릴 수 있어요. 저장해야 기록돼요.
 */
type Row = { name: string; meta: string; result: Result };

export function MobileAttendance({ data }: { data: SessionData }) {
  const initial: Row[] = data.roster
    .filter((r) => r.status === "confirmed")
    .map((r) => ({ name: r.name, meta: [r.via, r.note].filter(Boolean).join(" · "), result: r.result }));
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [bulk, setBulk] = useState<Row[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const unknown = rows.filter((r) => r.result === "unknown").length;
  const attended = rows.filter((r) => r.result === "attended").length;
  const noshow = rows.filter((r) => r.result === "noshow");
  const changed = rows.filter((r, i) => r.result !== saved[i].result).length;

  const set = (name: string, result: Result) => {
    setToast(null);
    setRows((rs) => rs.map((r) => (r.name === name ? { ...r, result: r.result === result ? "unknown" : result } : r)));
  };
  const markAll = () => {
    setBulk(rows);
    setToast(null);
    setRows((rs) => rs.map((r) => (r.result === "unknown" ? { ...r, result: "attended" } : r)));
  };
  const save = () => {
    setSaved(rows);
    setBulk(null);
    setToast(`이용 결과를 저장했어요 · ${changed}명 바뀜 · 활동 기록에 남아요`);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pb-28">
      {unknown > 0 && !bulk && (
        <>
          <p className="flex items-start gap-2 rounded-lg bg-info-bg p-3 text-body-sm text-info-fg">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
            미확인 {unknown}명 · 대부분 왔다면 &lsquo;모두 출석&rsquo;을 누르고 안 온 사람만 바꿔요.
          </p>
          <Button variant="primary" onClick={markAll} className="w-full py-2.5">
            미확인 {unknown}명 모두 출석으로 표시
          </Button>
        </>
      )}
      {bulk && (
        <div className="flex items-center gap-2 rounded-lg bg-success-bg p-3">
          <CheckCircle size={16} className="shrink-0 text-success-fg" aria-hidden />
          <p className="flex-1 text-body-sm text-success-fg">출석으로 표시했어요. 안 온 사람만 바꿔 주세요.</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRows(bulk);
              setBulk(null);
            }}
          >
            되돌리기
          </Button>
        </div>
      )}
      {toast && changed === 0 && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg p-3 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          {toast}
        </p>
      )}

      <ul className="overflow-hidden rounded-xl border border-line bg-surface">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-label-sm text-fg-secondary">{r.name[0]}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label-md text-fg">{r.name}</span>
              <span className="truncate text-caption text-fg-secondary">{r.meta}</span>
            </span>
            <span role="group" aria-label={`${r.name} 이용 결과`} className="flex shrink-0 rounded-md bg-subtle p-0.5">
              {(
                [
                  ["attended", "출석", "bg-success-bg text-success-fg"],
                  ["noshow", "노쇼", "bg-danger-bg text-danger-fg"],
                ] as const
              ).map(([value, label, on]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={r.result === value}
                  onClick={() => set(r.name, value)}
                  className={cn("cursor-pointer rounded px-3 py-1 text-label-sm", r.result === value ? on : "text-fg-secondary")}
                >
                  {label}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-md bg-success-bg px-2 py-0.5 text-label-sm text-success-fg">출석 {attended}</span>
        <span className="rounded-md bg-danger-bg px-2 py-0.5 text-label-sm text-danger-fg">
          노쇼 {noshow.length}
          {noshow.length > 0 && ` · ${noshow.map((n) => n.name).join("·")}`}
        </span>
        {unknown > 0 && <span className="rounded-md bg-warning-bg px-2 py-0.5 text-label-sm text-warning-fg">미확인 {unknown}</span>}
      </div>

      <Button variant={unknown > 0 && !bulk ? "secondary" : "primary"} disabled={changed === 0} onClick={save} className="w-full py-2.5">
        {changed > 0 ? `출석 저장 · ${changed}명 바뀜` : "출석 저장"}
      </Button>
      <p className="text-caption text-fg-secondary">저장하면 활동 기록에 남아요. 노쇼는 참석 확인에만 쓰고, 노쇼 기록만으로 예약을 막지 않아요.</p>
    </main>
  );
}
