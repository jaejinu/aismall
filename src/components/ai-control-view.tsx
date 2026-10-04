"use client";

import { useState } from "react";
import Link from "next/link";
import { AiLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { aiStats, aiTasks, levelLabel, shadowRows, type Level } from "@/data/ai";
import { cn } from "@/lib/cn";

/*
 * Figma: Desktop / AI 관리 (27:2887) · AI Task Row (27:174)
 * 지켜보기 모드 결과는 같음·수정 필요·다른 행동·위험 4분류 건수로만 보여 주고 단순 성공률은 쓰지 않는다.
 * 권한은 자동으로 올라가지 않는다 — 추천은 미리보기(시뮬레이션)로만 이어진다.
 */
const levelCls: Record<Level, string> = {
  suggest: "bg-neutral-bg text-neutral-fg",
  approve: "bg-info-bg text-info-fg",
  auto: "bg-automation-bg text-automation-fg",
};
const riskText = { low: "위험 낮음", medium: "위험 중간", high: "위험 높음", critical: "위험 매우 높음" };
const statTone = { fg: "text-fg", success: "text-success-fg", danger: "text-danger-fg" };

export function AiControlView() {
  const [recommendation, setRecommendation] = useState<"open" | "later">("open");
  const reminder = aiTasks.find((t) => t.id === "reminder")!;
  const shadow = reminder.week.shadow!;
  const total = shadow.match + shadow.edit + shadow.diff + shadow.unsafe;
  const matchRate = Math.round((shadow.match / total) * 100);

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-h1 text-fg">AI 관리</h1>
          <p className="text-body-md text-fg-secondary">AI가 맡은 일과 결과를 보고, 업무 유형별 자동 실행 수준을 판단해요 · 강남점 · 최근 7일</p>
        </div>
        <Link href="/admin/activity" className="rounded-md px-4 py-2 text-label-md text-fg hover:bg-subtle">
          AI 활동 보기
        </Link>
        <Link href="/admin/settings/ai" className="rounded-md bg-secondary px-4 py-2 text-label-md text-on-secondary hover:bg-secondary-hover">
          권한 설정 열기
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {aiStats.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface p-4">
            <span className="text-caption text-fg-secondary">{s.label}</span>
            <span className={cn("text-h2", statTone[s.tone])}>{s.value}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 text-fg">업무 유형별 AI</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[960px] text-left">
            <thead className="bg-subtle text-label-sm text-fg-muted">
              <tr>
                <th className="px-4 py-2 font-medium">업무 유형</th>
                <th className="w-[130px] px-4 py-2 font-medium">현재 수준</th>
                <th className="w-[80px] px-4 py-2 font-medium">건수</th>
                <th className="w-[160px] px-4 py-2 font-medium">처리 결과</th>
                <th className="w-[230px] px-4 py-2 font-medium">지켜보기 모드</th>
                <th className="w-[200px] px-4 py-2 font-medium">추천</th>
              </tr>
            </thead>
            <tbody>
              {aiTasks.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="block text-label-md text-fg">{t.name}</span>
                    <span className="block text-caption text-fg-muted">
                      {riskText[t.risk]}
                      {t.riskNote && ` · ${t.riskNote}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-label-sm", levelCls[t.branch])}>{levelLabel[t.branch]}</span>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-fg">{t.week.count}건</td>
                  <td className="px-4 py-3 text-body-sm text-fg">{t.week.result}</td>
                  <td className="px-4 py-3 text-caption text-fg-secondary">
                    {t.week.shadow ? `일치 ${t.week.shadow.match} · 수정 ${t.week.shadow.edit} · 다름 ${t.week.shadow.diff} · 위험 ${t.week.shadow.unsafe}` : "해당 없음"}
                  </td>
                  <td className={cn("px-4 py-3 text-label-sm", t.week.recommendTone === "ai" ? "text-ai-fg" : "text-fg-secondary")}>{t.week.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-ai-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <AiLabel />
          <h2 className="flex-1 text-h3 text-fg">
            지켜보기 모드 · {reminder.name} · 최근 {total}건
          </h2>
          <span className="text-caption text-fg-muted">AI가 실제로 실행했다면 사업자의 처리와 얼마나 같았을까요?</span>
        </div>
        <ul className="flex flex-col gap-2">
          {shadowRows.map((r) => {
            const n = shadow[r.key];
            return (
              <li key={r.key} className="grid grid-cols-[80px_minmax(0,1fr)_48px] items-center gap-3 md:grid-cols-[120px_minmax(0,360px)_48px_minmax(0,1fr)]">
                <span className="text-label-sm text-fg">{r.label}</span>
                <span className="h-2 overflow-hidden rounded-sm bg-subtle">
                  <span className={cn("block h-full rounded-sm", r.bar)} style={{ width: `${(n / total) * 100}%` }} />
                </span>
                <span className={cn("text-label-sm", r.text)}>{n}건</span>
                <span className="col-span-3 text-caption text-fg-secondary md:col-span-1">{n === 0 ? "없음" : r.note}</span>
              </li>
            );
          })}
        </ul>
        {recommendation === "open" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-ai-bg px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-label-md text-fg">리마인드 메시지를 &lsquo;자동 실행&rsquo;으로 올려볼 수 있어요</p>
              <p className="text-body-sm text-fg-secondary">
                50건 이상 · 위험 0건 · 일치율 {matchRate}%. 권한은 자동으로 올라가지 않아요. 브랜드 기본값은 최고관리자가 바꾸고, 먼저 미리보기로 영향을 확인해요.
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setRecommendation("later")}>
              나중에
            </Button>
            <Link
              href="/admin/settings/ai?as=admin&preview=reminder"
              className="rounded-md bg-primary px-3 py-1 text-label-sm text-on-primary hover:bg-primary-hover"
            >
              미리보기로 확인하기
            </Link>
          </div>
        ) : (
          <p className="text-caption text-fg-muted">추천을 접었어요. 다음 주 결과가 쌓이면 다시 보여 드려요.</p>
        )}
      </section>
    </main>
  );
}
