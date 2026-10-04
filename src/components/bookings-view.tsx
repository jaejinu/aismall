"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, Info, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { bookingRows, type Attendance, type BookingRow, type BookingStatus } from "@/data/bookings";
import { cn } from "@/lib/cn";

const statusLabel: Record<BookingStatus, string> = { pending: "승인 대기", confirmed: "확정", waitlisted: "대기", rejected: "거절", cancelled: "취소" };
const statusCls: Record<BookingStatus, string> = {
  pending: "bg-info-bg text-info-fg",
  confirmed: "bg-success-bg text-success-fg",
  waitlisted: "bg-neutral-bg text-neutral-fg",
  rejected: "bg-danger-bg text-danger-fg",
  cancelled: "bg-neutral-bg text-fg-muted",
};
const attendanceLabel: Record<Attendance, string> = { unknown: "미확인", attended: "출석", noshow: "노쇼", none: "—" };
const attendanceCls: Record<Attendance, string> = { unknown: "text-fg-secondary", attended: "text-success-fg", noshow: "text-danger-fg", none: "text-fg-muted" };
const rejectReasons = ["강사 일정이 안 맞음", "정원·공간 문제", "회원과 다시 상의 필요"];

export type Tab = "all" | BookingStatus;

function Select({ label, options, disabled }: { label: string; options: string[]; disabled?: boolean }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        disabled={disabled}
        className="h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg disabled:bg-subtle disabled:text-fg-secondary"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function DetailPanel({
  row,
  onClose,
  onConfirm,
  onReject,
}: {
  row: BookingRow;
  onClose: () => void;
  onConfirm: () => void;
  onReject: (reason: string | null) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const rows: [string, string][] = [
    ["회원", row.member],
    ["회차", `${row.when} · ${row.program} · ${row.sessionId}`],
    ["강사", row.coach],
    ["자리", row.seats],
    ["상태", `${statusLabel[row.status]}${row.statusDetail ? ` · ${row.statusDetail}` : ""}`],
  ];

  return (
    <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[400px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-h2 text-fg">{row.status === "pending" ? "회원 신청 확인" : "예약 상세"}</h2>
        <button type="button" onClick={onClose} aria-label="닫기" className="flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-subtle">
          <X size={16} className="text-fg" />
        </button>
      </div>
      <dl className="flex flex-col gap-2 rounded-lg bg-subtle p-4 text-body-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-14 shrink-0 text-fg-secondary">{k}</dt>
            <dd className="flex-1 text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      {row.pending && row.status === "pending" && (
        <>
          <div className="flex flex-col gap-1 text-body-sm">
            <p className="text-label-sm text-fg-muted">신청</p>
            <p className="text-fg">{row.pending.requestedAt}</p>
            <p className="text-fg-secondary">만료 {row.pending.expiresAt}</p>
            {row.pending.memberNote && <p className="rounded-md border border-line p-3 text-fg">&quot;{row.pending.memberNote}&quot;</p>}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-label-sm text-fg-muted">확인할 것</p>
            <ul className="flex flex-col gap-1 text-body-sm text-fg">
              {row.pending.context.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </div>
          {rejecting ? (
            <div className="flex flex-col gap-2">
              <p className="text-label-sm text-fg-muted">거절 사유 (회원에게 함께 안내돼요 · 고르지 않아도 돼요)</p>
              <div className="flex flex-wrap gap-2">
                {rejectReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(reason === r ? null : r)}
                    aria-pressed={reason === r}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1 text-label-sm",
                      reason === r ? "border-fg bg-fg text-fg-inverse" : "border-line text-fg hover:bg-subtle",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRejecting(false)}>
                  취소
                </Button>
                <Button variant="danger" onClick={() => onReject(reason)}>
                  거절하기
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejecting(true)}>
                거절
              </Button>
              <Button variant="primary" onClick={onConfirm}>
                확정하고 회원에게 알리기
              </Button>
            </div>
          )}
          <p className="flex items-start gap-2 text-caption text-fg-secondary">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            확정 직전에 정원을 다시 확인해요. 그사이 자리가 차면 확정되지 않고 알려 드려요.
          </p>
        </>
      )}

      {row.status !== "pending" && (
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/members" className="rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
            회원 상세
          </Link>
          {row.status === "confirmed" && row.attendance === "unknown" && (
            <Link href="/admin/today#attendance" className="rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
              출석부 열기
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}

/* manyfast 와이어프레임 n47 '예약 목록 화면' + n49 '예약 상세' — Figma에는 아직 없음 */
export function BookingsView({ initialTab = "all" }: { initialTab?: Tab }) {
  const [rows, setRows] = useState<BookingRow[]>(bookingRows);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const count = (s: BookingStatus) => rows.filter((r) => r.status === s).length;
  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          (tab === "all" || r.status === tab) &&
          (!query || r.member.includes(query) || r.program.includes(query) || r.sessionId.includes(query)),
      ),
    [rows, tab, query],
  );
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const update = (id: string, patch: Partial<BookingRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-6 lg:p-8">
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-h1 text-fg">예약</h1>
            <p className="text-caption text-fg-secondary">지점: 강남점 · 오너·매니저·직원은 배정 지점만 보여요</p>
          </div>
          <Link href="/admin/schedule" className="rounded-md bg-primary px-4 py-2 text-label-md text-on-primary hover:bg-primary-hover">
            회차 선택해 예약 추가
          </Link>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-3">
            <Search size={16} className="text-fg-secondary" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 프로그램, 회차 검색"
              className="min-w-0 flex-1 bg-transparent text-body-sm text-fg placeholder:text-fg-muted focus:outline-none"
            />
          </label>
          <Select label="지점" options={["강남점"]} disabled />
          <Select label="프로그램" options={["전체 프로그램", "그룹 필라테스", "기구 필라테스", "듀엣 필라테스", "1:1 레슨"]} />
          <Select label="이용 결과" options={["이용 결과 전체", "미확인", "출석", "노쇼"]} />
          <Select label="날짜" options={["이번 주", "오늘", "이번 달", "직접 입력"]} />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip label="전체" count={rows.length} selected={tab === "all"} onClick={() => setTab("all")} />
          <FilterChip label="승인 대기" count={count("pending")} selected={tab === "pending"} onClick={() => setTab("pending")} />
          <FilterChip label="확정" count={count("confirmed")} selected={tab === "confirmed"} onClick={() => setTab("confirmed")} />
          <FilterChip label="대기" count={count("waitlisted")} selected={tab === "waitlisted"} onClick={() => setTab("waitlisted")} />
          <FilterChip label="거절" count={count("rejected")} selected={tab === "rejected"} onClick={() => setTab("rejected")} />
          <FilterChip label="취소" count={count("cancelled")} selected={tab === "cancelled"} onClick={() => setTab("cancelled")} />
        </div>

        {(tab === "pending" || tab === "all") && count("pending") > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-info-bg px-4 py-3 text-body-sm text-info-fg">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
            승인 대기는 관리자 확인 프로그램(기구·듀엣·1:1)의 회원 신청이에요. 만료(신청 48시간 후와 신청 마감 중 이른 시점) 전에 확정하거나 거절해요. AI 제안은 승인함에 따로 모여요.
          </p>
        )}

        {toast && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            <CheckCircle size={16} aria-hidden />
            {toast}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[920px] text-left text-body-sm">
            <thead className="border-b border-line bg-subtle text-label-sm text-fg-secondary">
              <tr>
                <th className="px-4 py-2 font-medium">회차 일시</th>
                <th className="px-4 py-2 font-medium">회원</th>
                <th className="px-4 py-2 font-medium">프로그램 / 회차</th>
                <th className="px-4 py-2 font-medium">강사</th>
                <th className="px-4 py-2 font-medium">예약/정원</th>
                <th className="px-4 py-2 font-medium">예약 상태</th>
                <th className="px-4 py-2 font-medium">이용 결과</th>
                <th className="px-4 py-2 font-medium">
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-fg-secondary">
                    조건에 맞는 예약이 없어요.
                  </td>
                </tr>
              )}
              {list.map((r) => (
                <tr key={r.id} className={cn("border-b border-line last:border-b-0", selectedId === r.id ? "bg-subtle" : "hover:bg-subtle/60")}>
                  <td className="whitespace-nowrap px-4 py-3 text-fg">{r.when}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-fg">
                      <span className="flex size-6 items-center justify-center rounded-full bg-human-bg text-caption text-human-fg">{r.member[0]}</span>
                      {r.member}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg">
                    {r.program}
                    <span className="block text-caption text-fg-muted">
                      {r.sessionId}
                      {r.note && ` · ${r.note}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg">{r.coach}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg">{r.seats}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-label-sm", statusCls[r.status])}>{statusLabel[r.status]}</span>
                    {r.statusDetail && <span className="block pt-0.5 text-caption text-fg-muted">{r.statusDetail}</span>}
                  </td>
                  <td className={cn("px-4 py-3 text-label-sm", attendanceCls[r.attendance])}>{attendanceLabel[r.attendance]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button size="sm" variant={r.status === "pending" ? "primary" : "ghost"} onClick={() => setSelectedId(r.id)}>
                      {r.status === "pending" ? "확인하기" : "상세 보기"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <DetailPanel
          key={selected.id}
          row={selected}
          onClose={() => setSelectedId(null)}
          onConfirm={() => {
            update(selected.id, { status: "confirmed", statusDetail: "방금 확정 · 회원에게 알림 보냄", attendance: "unknown", seats: selected.seats.split(" · ")[0] });
            setToast(`${selected.member}님 ${selected.program} 예약을 확정했어요 · 회원에게 알림을 보냈어요`);
          }}
          onReject={(reason) => {
            update(selected.id, { status: "rejected", statusDetail: reason ?? "사유 없이 거절", attendance: "none" });
            setToast(`${selected.member}님 신청을 거절했어요 · 회원에게 알렸어요`);
          }}
        />
      )}
    </div>
  );
}
