"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Plus, Shield } from "lucide-react";
import { AiLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { guardrails } from "@/data/ai";
import { guideSuggestions, initialGuides, type Guide } from "@/data/ai-guides";
import { cn } from "@/lib/cn";

/*
 * 응대 지침 — Figma 화면 없음 · manyfast 와이어프레임 n99 기준.
 * AI가 문의에 답하고 제안을 만들 때 따르는 말투와 규칙이에요. 끌 수 없는 규칙은 여기서 바꿀 수 없어요.
 * 개선 제안은 관리자가 AI 제안을 여러 번 고치거나 거절한 패턴에서 나와요. 추가는 사람이 눌러야 돼요.
 */
export function PlaybookSettings() {
  const [guides, setGuides] = useState<Guide[]>(initialGuides);
  const [saved, setSaved] = useState<Guide[]>(initialGuides);
  const [pending, setPending] = useState(guideSuggestions);
  const [added, setAdded] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const dirty = JSON.stringify(guides) !== JSON.stringify(saved);
  const setText = (id: string, v: Partial<Guide>) => setGuides((g) => g.map((x) => (x.id === id ? { ...x, ...v } : x)));

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 pb-24 lg:p-8 lg:pb-24">
        <p className="text-caption text-fg-muted">
          <Link href="/admin/settings" className="hover:text-fg">
            설정
          </Link>{" "}
          › 응대 지침
        </p>
        <header className="flex flex-col gap-0.5">
          <h1 className="text-h1 text-fg">응대 지침</h1>
          <p className="text-body-md text-fg-secondary">AI가 강남점 문의에 답하고 제안을 만들 때 따르는 원칙이에요. 저장하면 다음 초안부터 반영돼요.</p>
          <p className="text-caption text-fg-muted">바꾸기는 최고관리자·사업장 오너만 · 매니저·직원은 보기만 해요</p>
        </header>

        {toast && !dirty && (
          <p role="status" className="flex max-w-[760px] items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            <CheckCircle size={16} aria-hidden />
            {toast}
          </p>
        )}

        <section className="flex max-w-[760px] flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-h3 text-fg">AI 응대 원칙</h2>
          {guides.map((g) => (
            <label key={g.id} className="flex flex-col gap-1">
              {g.id.startsWith("custom") ? (
                <input
                  value={g.title}
                  onChange={(e) => setText(g.id, { title: e.target.value })}
                  placeholder="항목 이름"
                  aria-label="지침 항목 이름"
                  className="h-8 w-60 rounded-md border border-line bg-surface px-2 text-label-sm text-fg"
                />
              ) : (
                <span className="text-label-sm text-fg">{g.title}</span>
              )}
              <textarea
                value={g.text}
                onChange={(e) => setText(g.id, { text: e.target.value })}
                rows={3}
                className={cn(
                  "rounded-md border bg-surface p-3 text-body-sm text-fg focus:border-line-strong focus:outline-none",
                  added.includes(g.id) ? "border-ai-border" : "border-line",
                )}
              />
              {added.includes(g.id) && <span className="text-caption text-ai-fg">AI 개선 제안을 더했어요 · 저장해야 반영돼요</span>}
            </label>
          ))}
          <Button
            size="sm"
            className="self-start"
            onClick={() => setGuides((g) => [...g, { id: `custom-${g.length}`, title: "", text: "" }])}
          >
            <Plus size={14} aria-hidden />
            지침 항목 추가
          </Button>
        </section>

        <section className="flex max-w-[760px] flex-col gap-3 rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-h3 text-fg">항상 지키는 규칙 · 끌 수 없어요</h2>
            <p className="text-body-sm text-fg-secondary">응대 지침보다 먼저 적용되고, 지침으로 바꿀 수 없어요.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {guardrails.map((g) => (
              <li key={g} className="flex items-center gap-2 rounded-md bg-subtle px-3 py-2 text-body-sm text-fg">
                <Shield size={14} className="shrink-0 text-danger-fg" aria-hidden />
                <span className="flex-1">{g}</span>
                <span className="rounded-sm bg-danger-bg px-2 py-0.5 text-label-sm text-danger-fg">금지</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/settings/ai" className="self-start text-label-sm text-link">
            AI 권한 보기
          </Link>
        </section>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[400px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-h3 text-fg">지침 개선 제안</h2>
          <AiLabel />
        </div>
        <p className="text-body-sm text-fg-secondary">관리자가 AI 제안을 여러 번 고치거나 거절한 패턴이에요. 지침에 더하면 같은 수정을 덜 하게 돼요.</p>
        {pending.length === 0 && <p className="rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">지금은 새 제안이 없어요.</p>}
        {pending.map((s) => (
          <article key={s.id} className="flex flex-col gap-2 rounded-lg border border-ai-border p-4">
            <p className="text-body-md text-fg">{s.text}</p>
            <p className="text-caption text-fg-muted">
              근거: {s.basis} · 넣을 곳: {initialGuides.find((g) => g.id === s.target)?.title}
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPending((p) => p.filter((x) => x.id !== s.id))}>
                무시
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setGuides((g) => g.map((x) => (x.id === s.target ? { ...x, text: `${x.text} ${s.text}` } : x)));
                  setAdded((a) => [...a, s.target]);
                  setPending((p) => p.filter((x) => x.id !== s.id));
                }}
              >
                지침에 더하기
              </Button>
            </div>
          </article>
        ))}
        <Link href="/admin/settings/knowledge" className="text-label-sm text-link">
          참고 자료 관리
        </Link>
      </aside>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-6 py-3 lg:left-60">
          <div className="flex items-center justify-end gap-2">
            <span className="mr-auto text-body-sm text-fg-secondary">저장하지 않은 변경이 있어요</span>
            <Button
              variant="ghost"
              onClick={() => {
                setGuides(saved);
                setAdded([]);
              }}
            >
              되돌리기
            </Button>
            <Button
              variant="primary"
              disabled={guides.some((g) => !g.title.trim() || !g.text.trim())}
              onClick={() => {
                setSaved(guides);
                setAdded([]);
                setToast("응대 지침을 저장했어요 · 다음 AI 초안부터 반영돼요");
              }}
            >
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
