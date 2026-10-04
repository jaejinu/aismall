"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { ActorBadge, StatusChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { activityRows, replays, type ActorFilter } from "@/data/activity";
import { cn } from "@/lib/cn";

/*
 * Figma: Desktop / Activity (27:3719) · Activity Row (27:175)
 * 같은 사건 ID 행은 하나의 사건이에요. 행을 누르면 오른쪽에서 순서대로 다시 봐요.
 * 내 권한 범위(강남점) 안의 기록만 보여요. Automation은 꺼져 있어서 필터에 없어요.
 */
const filters: { key: ActorFilter | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "staff", label: "직원" },
  { key: "member", label: "회원" },
  { key: "ai", label: "AI" },
  { key: "system", label: "시스템" },
];

export function ActivityView() {
  const [filter, setFilter] = useState<ActorFilter | "all">("all");
  const [selected, setSelected] = useState("c-6b30");
  const [retried, setRetried] = useState(false);

  const rows = activityRows.filter((r) => filter === "all" || r.filter === filter);
  const count = (k: ActorFilter | "all") => (k === "all" ? activityRows.length : activityRows.filter((r) => r.filter === k).length);
  const replay = replays[selected];

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <header className="flex flex-col gap-0.5">
          <h1 className="text-h1 text-fg">활동 기록</h1>
          <p className="text-body-md text-fg-secondary">누가 무엇을 언제 왜 바꿨는지 · 내 권한 범위(강남점) 안의 기록만 보여요 · 10/14(수)</p>
        </header>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <FilterChip key={f.key} label={f.label} count={count(f.key)} selected={filter === f.key} onClick={() => setFilter(f.key)} />
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <ul className="min-w-[640px]">
            {rows.map((r, i) => (
              <li key={`${r.corr}-${i}`} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => setSelected(r.corr)}
                  aria-pressed={selected === r.corr}
                  className={cn("flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left", selected === r.corr ? "bg-subtle" : "hover:bg-subtle/60")}
                >
                  <span className="w-[72px] shrink-0 text-label-sm text-fg-secondary">{r.time}</span>
                  <span className="w-[100px] shrink-0">
                    <ActorBadge actor={r.actor} label={r.actorLabel} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-label-md text-fg">{r.title}</span>
                    <span className="text-caption text-fg-secondary">{r.detail}</span>
                  </span>
                  <span className="w-[100px] shrink-0">
                    <StatusChip status={r.status} label={r.statusLabel} />
                  </span>
                  <span className="w-[64px] shrink-0 text-caption text-fg-muted">#{r.corr}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-caption text-fg-muted">같은 #ID 행은 하나의 사건이에요. 행을 누르면 오른쪽에서 순서대로 다시 볼 수 있어요.</p>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[440px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-h3 text-fg">사건 다시 보기</h2>
          <span className="text-caption text-fg-muted">#{selected}</span>
        </div>
        <p className="text-body-sm text-fg-secondary">{replay.summary}</p>

        <ol className="flex flex-col">
          {replay.steps.map((s, i) => {
            const last = i === replay.steps.length - 1;
            return (
              <li key={`${s.title}-${i}`} className="flex gap-3">
                <span className="flex w-3 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      "mt-1 size-2.5 shrink-0 rounded-full",
                      s.tone === "fail" ? "bg-danger-fg" : s.tone === "next" ? "border-2 border-info-fg bg-surface" : "bg-line-strong",
                    )}
                  />
                  {!last && <span className="w-0.5 flex-1 bg-line" />}
                </span>
                <span className={cn("flex min-w-0 flex-1 flex-col gap-0.5", !last && "pb-5")}>
                  <span className="flex items-center gap-2">
                    <ActorBadge actor={s.actor} label={s.actorLabel} />
                    <span className="text-caption text-fg-muted">{s.time}</span>
                  </span>
                  <span className="text-label-md text-fg">{s.title}</span>
                  <span className={cn("text-body-sm", s.tone === "fail" ? "text-danger-fg" : "text-fg-secondary")}>
                    {s.tone === "fail" && retried && selected === "c-6b30" ? "다시 보냈어요 · 09:41 실패 기록은 그대로 남아요" : s.detail}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-1 rounded-lg bg-subtle px-4 py-3">
          <span className="text-label-md text-fg">{replay.policy.title}</span>
          {replay.policy.lines.map((l) => (
            <span key={l} className="text-body-sm text-fg-secondary">
              · {l}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {replay.actions.map((a) =>
            a.retry ? (
              retried ? (
                <span key={a.label} className="flex items-center gap-1 text-label-sm text-success-fg">
                  <CheckCircle size={14} aria-hidden />
                  한서윤님께 메시지를 다시 보냈어요
                </span>
              ) : (
                <Button key={a.label} size="sm" variant="primary" onClick={() => setRetried(true)}>
                  {a.label}
                </Button>
              )
            ) : (
              <Link key={a.label} href={a.href!} className="rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
                {a.label}
              </Link>
            ),
          )}
        </div>
      </aside>
    </div>
  );
}
