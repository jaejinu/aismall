"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Lock, ShieldAlert } from "lucide-react";
import { ActorBadge, RiskBadge, StatusChip, type RiskTier } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { activityRows, type ActivityRow } from "@/data/activity";
import { cn } from "@/lib/cn";

/*
 * 원본 기록 조회 — Figma 화면 없음 · manyfast 와이어프레임 n105 기준.
 * 최고관리자만 볼 수 있어요. 사업장 오너는 활동 기록에서 강남점 기록을 봐요.
 * 개인정보가 들어간 내보내기는 위험 매우 높음이라 최고관리자 재인증 후에만 돼요.
 * 데이터는 활동 기록과 같은 사건이에요(전 지점 원본).
 */
type Viewer = "owner" | "admin";
type Event = ActivityRow & { id: string; at: string; branch: string; target: string; decision: "허용" | "승인 필요" | "차단" | "확인 필요"; risk: RiskTier };

const decisionOf = (r: ActivityRow): Event["decision"] =>
  r.status === "blocked" ? "차단" : r.status === "flagged" ? "확인 필요" : r.actor === "ai" && r.status === "pending" ? "승인 필요" : "허용";
const riskOf = (r: ActivityRow): RiskTier => (r.title.includes("회차 추가") ? "high" : r.actor === "ai" && r.status === "pending" ? "medium" : "low");

const unsorted: Event[] = [
  ...activityRows.map((r, i) => ({
    ...r,
    id: `evt_${(0x9f3a2c - i * 37).toString(16)}`,
    at: r.time.startsWith("어제") ? `2026-10-13 ${r.time.slice(3)}` : `2026-10-14 ${r.time}`,
    branch: "강남점",
    target: r.detail.split(" · ")[0],
    decision: decisionOf(r),
    risk: riskOf(r),
  })),
  {
    time: "11:40",
    actor: "human",
    actorLabel: "이유나",
    filter: "staff",
    title: "예약 변경",
    detail: "홍대점 그룹 필라테스 · 회원 요청",
    status: "confirmed",
    corr: "c-h301",
    id: "evt_9f39a1",
    at: "2026-10-14 11:40",
    branch: "홍대점",
    target: "예약 B-H118",
    decision: "허용",
    risk: "low",
  },
];
const events = [...unsorted].sort((a, b) => b.at.localeCompare(a.at));

const decisionCls: Record<Event["decision"], string> = {
  허용: "bg-success-bg text-success-fg",
  "승인 필요": "bg-info-bg text-info-fg",
  차단: "bg-danger-bg text-danger-fg",
  "확인 필요": "bg-warning-bg text-warning-fg",
};

export function AuditLog({ initialViewer }: { initialViewer: Viewer }) {
  const [viewer, setViewer] = useState<Viewer>(initialViewer);
  const [branch, setBranch] = useState("전체 지점");
  const [actor, setActor] = useState("전체");
  const [selected, setSelected] = useState(events[0].id);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const list = events.filter(
    (e) => (branch === "전체 지점" || e.branch === branch) && (actor === "전체" || (actor === "사람" ? e.actor === "human" : actor === "AI" ? e.actor === "ai" : e.actor === "system")),
  );
  const ev = events.find((e) => e.id === selected) ?? events[0];

  const header = (
    <>
      <p className="text-caption text-fg-muted">
        <Link href="/admin/settings" className="hover:text-fg">
          설정
        </Link>{" "}
        › 원본 기록 조회
      </p>
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-h1 text-fg">원본 기록 조회</h1>
          <p className="text-body-md text-fg-secondary">모든 지점의 활동 원본을 기간·주체·대상으로 찾아요. 기록은 고치거나 지울 수 없어요.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-caption text-fg-muted">보는 사람 · 프로토타입 전환</span>
          <div role="radiogroup" aria-label="보는 사람" className="flex gap-0.5 rounded-md bg-subtle p-0.5">
            {(["owner", "admin"] as Viewer[]).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={viewer === v}
                onClick={() => setViewer(v)}
                className={cn("cursor-pointer rounded-sm px-3 py-1 text-label-sm", viewer === v ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}
              >
                {v === "owner" ? "사업장 오너 · 홍지수" : "최고관리자 · 이미래"}
              </button>
            ))}
          </div>
        </div>
      </header>
    </>
  );

  if (viewer === "owner") {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        {header}
        <section className="flex max-w-[640px] flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
          <span className="flex size-10 items-center justify-center rounded-full bg-subtle text-fg-secondary">
            <Lock size={18} aria-hidden />
          </span>
          <h2 className="text-h3 text-fg">최고관리자만 볼 수 있어요</h2>
          <p className="text-body-md text-fg-secondary">원본 기록에는 모든 지점의 접속 정보와 개인정보가 들어 있어요. 강남점에서 일어난 일은 활동 기록에서 볼 수 있어요.</p>
          <Link href="/admin/activity" className="rounded-md bg-secondary px-4 py-2 text-label-md text-on-secondary hover:bg-secondary-hover">
            활동 기록 보기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        {header}
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="기간" defaultValue="최근 7일" className="h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg">
            {["오늘", "최근 7일", "최근 30일"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select aria-label="지점" value={branch} onChange={(e) => setBranch(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg">
            {["전체 지점", "강남점", "홍대점", "마포점"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select aria-label="주체" value={actor} onChange={(e) => setActor(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-fg">
            {["전체", "사람", "AI", "시스템"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <span className="flex-1" />
          <Button variant="danger" onClick={() => setExporting(true)}>
            <Download size={16} aria-hidden />
            내보내기
          </Button>
        </div>
        {exported && (
          <p role="status" className="rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            재인증을 마쳤어요 · 내보내기 파일 링크를 이미래님 메일로 보냈어요(프로토타입) · 이 내보내기도 기록에 남았어요
          </p>
        )}
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-body-sm">
            <thead className="border-b border-line bg-subtle text-label-sm text-fg-secondary">
              <tr>
                <th className="px-4 py-2 font-medium">시각</th>
                <th className="px-4 py-2 font-medium">지점</th>
                <th className="px-4 py-2 font-medium">주체</th>
                <th className="px-4 py-2 font-medium">대상</th>
                <th className="px-4 py-2 font-medium">일</th>
                <th className="px-4 py-2 font-medium">정책 판단</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && setSelected(e.id)}
                  tabIndex={0}
                  aria-selected={selected === e.id}
                  className={cn("cursor-pointer border-b border-line last:border-b-0", selected === e.id ? "bg-subtle" : "hover:bg-subtle/60")}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-fg-secondary">{e.at.slice(5)}</td>
                  <td className="px-4 py-2.5 text-fg">{e.branch}</td>
                  <td className="px-4 py-2.5">
                    <ActorBadge actor={e.actor} label={e.actorLabel} />
                  </td>
                  <td className="px-4 py-2.5 text-fg">{e.target}</td>
                  <td className="px-4 py-2.5 text-fg">{e.title}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("whitespace-nowrap rounded-md px-2 py-0.5 text-label-sm", decisionCls[e.decision])}>{e.decision}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[400px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <h2 className="text-h3 text-fg">기록 상세</h2>
        <dl className="flex flex-col gap-2 text-body-sm">
          {[
            ["기록 번호", ev.id],
            ["시각", `${ev.at}:14`],
            ["지점", ev.branch],
            ["대상", ev.target],
            ["한 일", `${ev.title} · ${ev.detail}`],
            ["접속", ev.actor === "human" ? "121.165.xx.xx · Chrome / macOS" : "서버 작업"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="shrink-0 text-fg-secondary">{k}</dt>
              <dd className="text-right text-fg">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3">
            <dt className="text-fg-secondary">주체</dt>
            <dd>
              <ActorBadge actor={ev.actor} label={ev.actorLabel} />
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-secondary">결과</dt>
            <dd>
              <StatusChip status={ev.status} label={ev.statusLabel} />
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2 rounded-lg bg-subtle px-4 py-3">
          <span className="text-label-md text-fg">정책 판단</span>
          <span className="flex items-center gap-2">
            <span className={cn("rounded-md px-2 py-0.5 text-label-sm", decisionCls[ev.decision])}>{ev.decision}</span>
            <RiskBadge tier={ev.risk} />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-label-sm text-fg-secondary">원본</span>
          <pre className="overflow-x-auto rounded-md border border-line bg-canvas p-3 text-caption text-fg">
            {JSON.stringify({ event_id: ev.id, branch: ev.branch, actor: ev.actorLabel ?? ev.actor, action: ev.title, correlation_id: ev.corr, decision: ev.decision }, null, 2)}
          </pre>
        </div>
        {ev.branch === "강남점" && (
          <Link href="/admin/activity" className="text-label-sm text-link">
            활동 기록에서 사건 #{ev.corr} 다시 보기
          </Link>
        )}
      </aside>

      {exporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4" role="dialog" aria-modal="true" aria-labelledby="export-title">
          <div className="flex w-full max-w-[460px] flex-col gap-4 rounded-xl bg-surface p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-danger-fg" aria-hidden />
              <h2 id="export-title" className="flex-1 text-h3 text-fg">
                원본 기록을 내보낼까요?
              </h2>
              <RiskBadge tier="critical" />
            </div>
            <p className="text-body-md text-fg-secondary">
              {list.length}건 · {branch} · 회원 이름과 접속 정보가 들어 있어요. 내보내려면 최고관리자 재인증이 필요하고, 파일 링크는 24시간 뒤에 만료돼요.
            </p>
            <p className="rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">실제 서비스에서는 여기서 이미래님 휴대폰 인증을 해요. 프로토타입이라 건너뛰어요.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setExporting(false)}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setExporting(false);
                  setExported(true);
                }}
              >
                재인증하고 내보내기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
