"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, FlaskConical, Shield } from "lucide-react";
import { ActorBadge, RiskBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { aiTasks, guardrails, impactOf, levelLabel, levelRank, permissionHistory, type AiTask, type HistoryEvent, type Level } from "@/data/ai";
import { cn } from "@/lib/cn";

/*
 * Figma: Desktop / AI Permissions (27:3305) · Level Select (29:36) · Simulation Banner (8:169)
 * 브랜드 기본값은 최고관리자만 바꾸고, 사업장 오너는 자기 지점에서 좁히기만 해요(D-10).
 * 자동 실행은 위험 낮음만. 바꾸기 전에 최근 30일 기록으로 영향을 미리 보여 주고, 저장은 본인 확인 후.
 */
export type Role = "owner" | "admin";
type Levels = Record<string, Level>;

const levels: Level[] = ["suggest", "approve", "auto"];
const onCls: Record<Level, string> = {
  suggest: "border-line bg-surface text-fg",
  approve: "border-line bg-surface text-fg",
  auto: "border-line bg-automation-bg text-automation-fg",
};
const toMap = (pick: (t: AiTask) => Level): Levels => Object.fromEntries(aiTasks.map((t) => [t.id, pick(t)]));

/* 업무 유형마다 고를 수 있는 수준 — 답변 초안은 초안만, 자동 실행은 위험 낮음이고 막히지 않은 유형만. */
function allowedLevels(t: AiTask): Level[] {
  if (t.id === "draft") return ["suggest"];
  return t.noAuto ? ["suggest", "approve"] : levels;
}

const presets: { level: 1 | 2 | 3; title: string; desc: string; apply: (t: AiTask) => Level }[] = [
  { level: 1, title: "제안만", desc: "AI는 제안만 하고 실행은 사람이 해요", apply: () => "suggest" },
  { level: 2, title: "승인 후 실행", desc: "AI가 제안하고 승인하면 서버가 실행해요", apply: (t) => (t.id === "draft" ? "suggest" : "approve") },
  { level: 3, title: "제한적 자동 실행", desc: "위험 낮음 유형 중 허용한 것만 승인 없이 실행해요", apply: (t) => (allowedLevels(t).includes("auto") ? "auto" : t.id === "draft" ? "suggest" : "approve") },
];

function LevelSelect({
  label,
  value,
  allowed,
  ceiling,
  onChange,
}: {
  label: string;
  value: Level;
  allowed: Level[];
  ceiling?: Level;
  onChange: (l: Level) => void;
}) {
  return (
    <div role="radiogroup" aria-label={`${label} 권한 수준`} className="flex shrink-0 gap-0.5 rounded-md bg-subtle p-0.5">
      {levels.map((l) => {
        const blocked = !allowed.includes(l) || (ceiling !== undefined && levelRank[l] > levelRank[ceiling]);
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={value === l}
            disabled={blocked}
            title={blocked ? (ceiling && allowed.includes(l) ? "브랜드 기본값보다 넓힐 수 없어요" : "이 업무 유형은 고를 수 없어요") : undefined}
            onClick={() => onChange(l)}
            className={cn(
              "rounded-sm border px-3 py-1 text-label-sm",
              value === l ? onCls[l] : "border-transparent text-fg-muted",
              blocked ? "cursor-not-allowed opacity-40" : value !== l && "cursor-pointer hover:text-fg",
            )}
          >
            {levelLabel[l]}
          </button>
        );
      })}
    </div>
  );
}

export function AiPermissionsView({ initialRole, preview }: { initialRole: Role; preview?: string }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [brand, setBrand] = useState<Levels>(() => toMap((t) => t.brand));
  const [branch, setBranch] = useState<Levels>(() => toMap((t) => t.branch));
  const initialDraft = () => {
    const base = initialRole === "admin" ? toMap((t) => t.brand) : toMap((t) => t.branch);
    const task = aiTasks.find((t) => t.id === preview);
    if (initialRole === "admin" && task && allowedLevels(task).includes("auto")) base[task.id] = "auto";
    return base;
  };
  const [draft, setDraft] = useState<Levels>(initialDraft);
  const [history, setHistory] = useState<HistoryEvent[]>(permissionHistory);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const saved = role === "admin" ? brand : branch;
  const changed = aiTasks.filter((t) => draft[t.id] !== saved[t.id]);
  const who = role === "admin" ? "이미래" : "홍지수";
  const scope = role === "admin" ? "브랜드 기본값" : "강남점";

  const switchRole = (r: Role) => {
    setRole(r);
    setDraft(r === "admin" ? brand : branch);
    setToast(null);
  };

  // '현재' 표시는 저장된 값 기준이에요. 프리셋과 딱 맞지 않으면 가까운 단계에 '직접 설정'으로 표시해요.
  const currentPreset = presets.find((p) => aiTasks.every((t) => p.apply(t) === saved[t.id]));
  const nearestPreset = currentPreset ?? presets[aiTasks.every((t) => saved[t.id] === "suggest") ? 0 : 1];

  const save = () => {
    const events = changed.map(
      (t): HistoryEvent => ({ actor: "human", text: `${who} · ${t.name} ${levelLabel[saved[t.id]]} → ${levelLabel[draft[t.id]]} (${scope})`, meta: "방금 · 본인 확인 완료" }),
    );
    if (role === "admin") {
      setBrand(draft);
      // 브랜드 기본값을 좁히면 지점 설정도 그 이하로 내려가요.
      setBranch((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, levelRank[v] > levelRank[draft[k]] ? draft[k] : v])));
    } else setBranch(draft);
    setHistory((h) => [...events, ...h]);
    setConfirming(false);
    setToast(`${scope} 권한을 바꿨어요 · ${changed.length}개 업무 유형`);
  };

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <p className="text-caption text-fg-muted">
          <Link href="/admin/settings" className="hover:text-fg">
            설정
          </Link>{" "}
          › AI 권한
        </p>
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-h1 text-fg">AI 권한</h1>
            <p className="text-body-md text-fg-secondary">
              {role === "admin"
                ? "브랜드 기본값을 업무 유형별로 정해요. 각 지점은 이 값보다 좁히기만 할 수 있어요. 권한은 자동으로 올라가지 않고, 바꾸기 전에 영향을 미리 보여 드려요."
                : "강남점에서 AI가 할 수 있는 일을 정해요. 브랜드 기본값보다 좁히기만 할 수 있어요. 바꾸기 전에 영향을 미리 보여 드려요."}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-caption text-fg-muted">보는 사람 · 프로토타입 전환</span>
            <div role="radiogroup" aria-label="보는 사람" className="flex gap-0.5 rounded-md bg-subtle p-0.5">
              {(["owner", "admin"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={role === r}
                  onClick={() => switchRole(r)}
                  className={cn("cursor-pointer rounded-sm px-3 py-1 text-label-sm", role === r ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}
                >
                  {r === "owner" ? "사업장 오너 · 홍지수" : "최고관리자 · 이미래"}
                </button>
              ))}
            </div>
          </div>
        </header>

        {toast && changed.length === 0 && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            <CheckCircle size={16} aria-hidden />
            {toast}
          </p>
        )}

        {role === "admin" && (
          <section className="grid gap-3 md:grid-cols-3">
            {presets.map((p) => {
              const current = nearestPreset.level === p.level;
              return (
                <button
                  key={p.level}
                  type="button"
                  onClick={() => setDraft(toMap(p.apply))}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-lg p-4 text-left",
                    current ? "border-2 border-info-fg bg-subtle" : "border border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span className="flex gap-2 text-label-sm">
                    <span className="text-fg-muted">Level {p.level}</span>
                    {current && <span className="text-info-fg">{currentPreset ? "현재" : "현재 · 직접 설정"}</span>}
                  </span>
                  <span className="text-h3 text-fg">{p.title}</span>
                  <span className="text-body-sm text-fg-secondary">{p.desc}</span>
                </button>
              );
            })}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-h3 text-fg">업무 유형별 설정 · {scope}</h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {aiTasks.map((t) => {
              const isChanged = draft[t.id] !== saved[t.id];
              return (
                <li key={t.id} className={cn("flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0", isChanged && "bg-ai-bg")}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-label-md text-fg">
                      {t.name}
                      {t.riskNote && ` (${t.riskNote})`}
                    </span>
                    {isChanged ? (
                      <span className="text-caption text-ai-fg">
                        변경 중 · {levelLabel[saved[t.id]]} → {levelLabel[draft[t.id]]}
                      </span>
                    ) : (
                      (t.noAuto || role === "owner") && (
                        <span className="text-caption text-fg-muted">
                          {[role === "owner" && `브랜드 기본값 ${levelLabel[brand[t.id]]}`, t.noAuto].filter(Boolean).join(" · ")}
                        </span>
                      )
                    )}
                  </span>
                  <RiskBadge tier={t.risk} />
                  <LevelSelect
                    label={t.name}
                    value={draft[t.id]}
                    allowed={allowedLevels(t)}
                    ceiling={role === "owner" ? brand[t.id] : undefined}
                    onChange={(l) => setDraft((d) => ({ ...d, [t.id]: l }))}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-h3 text-fg">항상 지키는 규칙 · 끌 수 없어요</h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {guardrails.map((g) => (
              <li key={g} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <span className="flex-1 text-body-md text-fg">{g}</span>
                <span className="inline-flex items-center gap-1 rounded-sm bg-danger-bg px-3 py-1 text-label-sm text-danger-fg">
                  <Shield size={12} aria-hidden />
                  금지 · 변경 불가
                </span>
              </li>
            ))}
          </ul>
        </section>

        {changed.length > 0 && (
          <>
            <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-dashed border-line-strong bg-subtle px-4 py-3">
              <FlaskConical size={16} className="shrink-0 text-fg" aria-hidden />
              <span className="flex flex-col gap-0.5">
                <span className="text-label-md text-fg">변경 미리보기 · 시뮬레이션이에요</span>
                <span className="text-body-sm text-fg-secondary">아직 저장되지 않았어요. 최근 30일 기록에 새 설정을 적용했을 때의 결과예요.</span>
              </span>
            </div>
            {changed.map((t) => {
              const impact = impactOf(t, saved[t.id], draft[t.id]);
              return (
                <section key={t.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                  <h3 className="text-h3 text-fg">{impact.title}</h3>
                  <ul className="flex flex-col gap-1">
                    {impact.lines.map((l) => (
                      <li key={l} className="text-body-sm text-fg-secondary">
                        · {l}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(saved)}>
                취소
              </Button>
              <Button variant="primary" onClick={() => setConfirming(true)}>
                변경 저장 · 본인 확인
              </Button>
            </div>
          </>
        )}
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-surface px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[440px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <h2 className="text-h3 text-fg">변경 이력</h2>
        <ul className="flex flex-col gap-3">
          {history.map((e, i) => (
            <li key={`${e.text}-${i}`} className="flex flex-col gap-0.5">
              <ActorBadge actor={e.actor} />
              <span className="text-body-sm text-fg">{e.text}</span>
              <span className="text-caption text-fg-muted">{e.meta}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-0.5 rounded-lg bg-subtle px-4 py-3">
          <span className="text-label-md text-fg">누가 바꿀 수 있나요?</span>
          <span className="text-body-sm text-fg-secondary">
            브랜드 기본값은 최고관리자만 바꿀 수 있어요. 사업장 오너는 자기 지점에서 더 좁히기만 할 수 있고, 매니저는 조회만 해요.
          </span>
        </div>
      </aside>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4" role="dialog" aria-modal="true" aria-labelledby="verify-title">
          <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-xl bg-surface p-6 shadow-lg">
            <h2 id="verify-title" className="text-h3 text-fg">
              본인 확인 후 저장해요
            </h2>
            <p className="text-body-md text-fg-secondary">
              {scope} · {changed.map((t) => `${t.name} ${levelLabel[draft[t.id]]}`).join(", ")}
            </p>
            <p className="rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">
              실제 서비스에서는 여기서 {who}님 휴대폰 인증을 해요. 프로토타입이라 인증 단계는 건너뛰어요.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                취소
              </Button>
              <Button variant="primary" onClick={save}>
                확인하고 저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
