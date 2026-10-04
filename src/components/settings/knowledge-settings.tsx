"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Lightbulb, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { categories, initialDocs, missingDoc, modeLabel, type Category, type Doc, type Mode } from "@/data/ai-guides";
import { cn } from "@/lib/cn";
import { josa } from "@/lib/josa";

/*
 * 참고 자료 — Figma 화면 없음 · manyfast 와이어프레임 n100 기준.
 * AI 답변 초안의 근거가 되는 글이에요. 가격·정원·마감 같은 숫자는 프로그램·운영정보 데이터를 따로 써요.
 * 고칠 때마다 버전이 남고, 꺼 둔 자료는 AI가 참고하지 않아요.
 */
const inputCls = "w-full rounded-md border border-line bg-surface px-3 text-body-sm text-fg focus:border-line-strong focus:outline-none";
/* '제목'을/를 */
const quoted = (t: string) => `'${t}'${josa(t, "을를").slice(t.length)}`;

type Draft = { title: string; category: Category; text: string; mode: Mode; active: boolean };

function Editor({ draft, onChange, onCancel, onSave, saveLabel }: { draft: Draft; onChange: (d: Draft) => void; onCancel: () => void; onSave: () => void; saveLabel: string }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-fg-secondary">제목</span>
        <input value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} className={cn(inputCls, "h-9")} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-label-sm text-fg-secondary">분류</span>
          <select value={draft.category} onChange={(e) => onChange({ ...draft, category: e.target.value as Category })} className={cn(inputCls, "h-9")}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-sm text-fg-secondary">AI 참고 방식</span>
          <select value={draft.mode} onChange={(e) => onChange({ ...draft, mode: e.target.value as Mode })} className={cn(inputCls, "h-9")}>
            {(Object.keys(modeLabel) as Mode[]).map((m) => (
              <option key={m} value={m}>
                {modeLabel[m]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-label-sm text-fg-secondary">내용</span>
        <textarea value={draft.text} onChange={(e) => onChange({ ...draft, text: e.target.value })} rows={6} className={cn(inputCls, "py-2")} />
      </label>
      <label className="flex items-center gap-2 text-body-sm text-fg">
        <input type="checkbox" checked={draft.active} onChange={(e) => onChange({ ...draft, active: e.target.checked })} className="size-4 accent-[var(--color-primary)]" />
        켜 두기 · 끄면 AI가 참고하지 않아요
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button variant="primary" disabled={!draft.title.trim() || !draft.text.trim()} onClick={onSave}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

export function KnowledgeSettings() {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [selected, setSelected] = useState(initialDocs[0].id);
  const [mode, setMode] = useState<"view" | "edit" | "new" | "delete">("view");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [missingDone, setMissingDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const doc = docs.find((d) => d.id === selected) ?? docs[0];
  const list = docs.filter((d) => (cat === "all" || d.category === cat) && (!query.trim() || d.title.includes(query.trim()) || d.text.includes(query.trim())));
  const startNew = (preset?: Partial<Draft>) => {
    setDraft({ title: "", category: "자주 묻는 질문", text: "", mode: "quote", active: true, ...preset });
    setMode("new");
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <p className="text-caption text-fg-muted">
        <Link href="/admin/settings" className="hover:text-fg">
          설정
        </Link>{" "}
        › 참고 자료
      </p>
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-h1 text-fg">참고 자료</h1>
          <p className="text-body-md text-fg-secondary">AI 답변 초안의 근거가 되는 글이에요. 가격·정원·마감 같은 숫자는 프로그램과 운영정보에서 가져와요.</p>
        </div>
        <Button variant="primary" onClick={() => startNew()}>
          <Plus size={16} aria-hidden />
          자료 추가
        </Button>
      </header>

      {toast && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
          <CheckCircle size={16} aria-hidden />
          {toast}
        </p>
      )}

      {!missingDone && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ai-border bg-ai-bg px-4 py-3">
          <Lightbulb size={16} className="shrink-0 text-ai-fg" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-label-md text-fg">&lsquo;{missingDoc.title}&rsquo;가 없어요</span>
            <span className="text-body-sm text-fg-secondary">{missingDoc.basis}</span>
          </span>
          <Button size="sm" onClick={() => startNew({ title: missingDoc.title, category: missingDoc.category })}>
            주차 안내 추가
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-56 items-center gap-2 rounded-md border border-line bg-surface px-3">
          <Search size={16} className="text-fg-muted" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목·내용 검색" aria-label="참고 자료 검색" className="min-w-0 flex-1 bg-transparent text-body-sm text-fg outline-none" />
        </label>
        <FilterChip label="전체" count={docs.length} selected={cat === "all"} onClick={() => setCat("all")} />
        {categories.map((c) => (
          <FilterChip key={c} label={c} count={docs.filter((d) => d.category === c).length} selected={cat === c} onClick={() => setCat(c)} />
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ul className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
          {list.length === 0 && <li className="px-4 py-6 text-center text-body-sm text-fg-secondary">찾는 자료가 없어요.</li>}
          {list.map((d) => (
            <li key={d.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => {
                  setSelected(d.id);
                  setMode("view");
                }}
                aria-pressed={selected === d.id && mode !== "new"}
                className={cn("flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left", selected === d.id && mode !== "new" ? "bg-subtle" : "hover:bg-subtle/60")}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("flex-1 text-label-md", d.active ? "text-fg" : "text-fg-muted")}>{d.title}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-caption", d.active ? "bg-success-bg text-success-fg" : "bg-neutral-bg text-fg-muted")}>{d.active ? "켜짐" : "꺼짐"}</span>
                </span>
                <span className="text-caption text-fg-muted">
                  {d.category} · {d.updated}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          {mode === "new" && draft ? (
            <>
              <h2 className="text-h3 text-fg">새 자료</h2>
              <Editor
                draft={draft}
                onChange={setDraft}
                onCancel={() => setMode("view")}
                saveLabel="추가하기"
                onSave={() => {
                  const id = `doc-${docs.length + 1}`;
                  setDocs((ds) => [
                    { id, ...draft, updated: "방금 · 홍지수", created: "방금 · 홍지수", history: [{ version: "v1", who: "홍지수", when: "방금", what: "처음 만듦" }] },
                    ...ds,
                  ]);
                  if (draft.title === missingDoc.title) setMissingDone(true);
                  setSelected(id);
                  setMode("view");
                  setToast(`${quoted(draft.title)} 추가했어요 · ${draft.active ? "다음 AI 초안부터 참고해요" : "꺼 둔 상태예요"}`);
                }}
              />
            </>
          ) : mode === "edit" && draft ? (
            <>
              <h2 className="text-h3 text-fg">{doc.title} 고치기</h2>
              <Editor
                draft={draft}
                onChange={setDraft}
                onCancel={() => setMode("view")}
                saveLabel="저장"
                onSave={() => {
                  const next = `v${doc.history.length + 1}`;
                  setDocs((ds) => ds.map((d) => (d.id === doc.id ? { ...d, ...draft, updated: "방금 · 홍지수", history: [{ version: next, who: "홍지수", when: "방금", what: "내용 수정" }, ...d.history] } : d)));
                  setMode("view");
                  setToast(`${quoted(draft.title)} 저장했어요 · ${next}`);
                }}
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="text-h3 text-fg">{doc.title}</h2>
                  <span className="flex flex-wrap gap-1">
                    <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-caption text-neutral-fg">{doc.category}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-caption", doc.active ? "bg-success-bg text-success-fg" : "bg-neutral-bg text-fg-muted")}>{doc.active ? "켜짐" : "꺼짐"}</span>
                    {doc.active && doc.mode !== "off" && <span className="rounded-full bg-ai-bg px-2 py-0.5 text-caption text-ai-fg">AI가 참고 중</span>}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setDraft({ title: doc.title, category: doc.category, text: doc.text, mode: doc.mode, active: doc.active });
                    setMode("edit");
                  }}
                >
                  고치기
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode("delete")}>
                  삭제
                </Button>
              </div>
              {mode === "delete" && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-bg px-4 py-3">
                  <span className="flex-1 text-body-sm text-fg">삭제하면 AI가 더 이상 참고하지 않고, 이전 답변의 근거 표시에는 &lsquo;삭제된 자료&rsquo;로 남아요.</span>
                  <Button size="sm" variant="ghost" onClick={() => setMode("view")}>
                    취소
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      const rest = docs.filter((d) => d.id !== doc.id);
                      setDocs(rest);
                      setSelected(rest[0]?.id ?? "");
                      setMode("view");
                      setToast(`${quoted(doc.title)} 삭제했어요`);
                    }}
                  >
                    삭제하기
                  </Button>
                </div>
              )}
              <p className="whitespace-pre-line text-body-md text-fg">{doc.text}</p>
              <dl className="grid gap-3 border-t border-line pt-4 text-body-sm sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-fg-muted">AI 참고 방식</dt>
                  <dd className="text-fg">
                    {modeLabel[doc.mode]}
                    <span className="block text-caption text-fg-secondary">
                      {doc.mode === "quote" ? "답변에 이 문장을 그대로 써요" : doc.mode === "summary" ? "내용을 참고해 짧게 다시 써요" : "답변에 쓰지 않아요"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">만든 사람 · 마지막 수정</dt>
                  <dd className="text-fg">
                    {doc.created}
                    <span className="block text-caption text-fg-secondary">{doc.updated}</span>
                  </dd>
                </div>
              </dl>
              {doc.related && (
                <p className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
                  관련 데이터
                  {doc.related.map((r) => (
                    <Link key={r.href} href={r.href} className="rounded-full bg-subtle px-2 py-0.5 text-label-sm text-link">
                      {r.label}
                    </Link>
                  ))}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <span className="text-label-sm text-fg-secondary">수정 이력</span>
                <ul className="overflow-hidden rounded-lg border border-line text-body-sm">
                  {doc.history.map((h) => (
                    <li key={h.version} className="flex gap-3 border-b border-line px-3 py-2 last:border-b-0">
                      <span className="w-8 text-label-sm text-fg">{h.version}</span>
                      <span className="w-14 text-fg-secondary">{h.who}</span>
                      <span className="w-20 text-fg-muted">{h.when}</span>
                      <span className="flex-1 text-fg">{h.what}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      </div>
      <Link href="/admin/settings/playbook" className="self-start text-label-sm text-link">
        응대 지침 보기
      </Link>
    </main>
  );
}
