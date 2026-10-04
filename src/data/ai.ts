/*
 * AI 관리·AI 권한 샘플 — 강남점, 기준일 2026-10-14(수).
 * 규칙: 자동 실행은 위험 낮음만. 위험 중간은 항상 승인(묶음 승인 가능). AI의 예약 생성·변경·취소는 항상 승인 후 실행.
 * 권한은 브랜드 기본값(최고관리자) + 지점별로 좁히기만(사업장 오너). 권한은 자동으로 올라가지 않는다.
 */
import type { Actor, RiskTier } from "@/components/ui/badges";

export type Level = "suggest" | "approve" | "auto";
export const levelLabel: Record<Level, string> = { suggest: "제안만", approve: "승인 후 실행", auto: "자동 실행" };
export const levelRank: Record<Level, number> = { suggest: 0, approve: 1, auto: 2 };

export const aiStats = [
  { label: "AI 제안", value: "146건", tone: "fg" as const },
  { label: "수정 없이 승인", value: "74%", tone: "success" as const },
  { label: "수정 후 승인", value: "17%", tone: "fg" as const },
  { label: "거절", value: "9%", tone: "fg" as const },
  { label: "정책으로 차단", value: "3건", tone: "danger" as const },
];

export type Shadow = { match: number; edit: number; diff: number; unsafe: number };

export type AiTask = {
  id: string;
  name: string;
  risk: RiskTier;
  riskNote?: string;
  /** 자동 실행을 고를 수 없는 이유. 없으면 고를 수 있음(위험 낮음만). */
  noAuto?: string;
  brand: Level;
  branch: Level;
  week: { count: number; result: string; shadow?: Shadow; recommendation: string; recommendTone?: "ai" | "muted" };
  month: number; // 최근 30일 건수 (변경 미리보기용)
};

export const aiTasks: AiTask[] = [
  {
    id: "booking",
    name: "예약 생성 (문의 기반)",
    risk: "medium",
    noAuto: "자동 실행은 고를 수 없어요 · 예약은 항상 승인 후 실행",
    brand: "approve",
    branch: "approve",
    week: { count: 18, result: "수정 없이 승인 78%", shadow: { match: 16, edit: 2, diff: 0, unsafe: 0 }, recommendation: "유지 · 자동 실행 불가" },
    month: 71,
  },
  {
    id: "reminder",
    name: "리마인드 메시지",
    risk: "low",
    brand: "approve",
    branch: "approve",
    week: { count: 52, result: "수정 없이 승인 92%", shadow: { match: 46, edit: 4, diff: 2, unsafe: 0 }, recommendation: "자동 실행 확대 추천", recommendTone: "ai" },
    month: 118,
  },
  {
    id: "draft",
    name: "답변 초안",
    risk: "low",
    riskNote: "사람이 발송",
    noAuto: "초안만 만들어요 · 보내는 건 항상 사람이에요",
    brand: "suggest",
    branch: "suggest",
    week: { count: 64, result: "수정 없이 발송 61%", recommendation: "응대 지침 개선 제안 2건" },
    month: 241,
  },
  {
    id: "task",
    name: "할 일 생성",
    risk: "low",
    brand: "auto",
    branch: "auto",
    week: { count: 11, result: "완료 9 · 진행 중 2", recommendation: "유지" },
    month: 41,
  },
  {
    id: "schedule",
    name: "회차 편성 추천",
    risk: "high",
    noAuto: "자동 실행은 고를 수 없어요 · 위험 높음",
    brand: "approve",
    branch: "approve",
    week: { count: 3, result: "승인 2 · 거절 1", recommendation: "유지" },
    month: 9,
  },
  {
    id: "noshow",
    name: "노쇼 참석 확인",
    risk: "medium",
    noAuto: "자동 실행은 고를 수 없어요 · 위험 중간은 묶음 승인",
    brand: "approve",
    branch: "approve",
    week: { count: 9, result: "수정 없이 승인 89%", shadow: { match: 8, edit: 1, diff: 0, unsafe: 0 }, recommendation: "유지 · 묶음 승인으로 처리 중" },
    month: 34,
  },
];

export const guardrails = [
  "수신 동의 없는 회원에게 메시지 발송",
  "회원 정보 삭제 자동 실행",
  "위험 중간 이상 작업을 승인 없이 실행",
  "노쇼 위험을 이유로 예약 취소·신청 제한",
  "회원 확인 없이 회원 예약 생성·변경·취소",
];

export const shadowRows = [
  { key: "match" as const, label: "같음", note: "그대로 보냈을 메시지와 같아요", bar: "bg-success-fg", text: "text-success-fg" },
  { key: "edit" as const, label: "수정 필요", note: "예: '오후 7시' → '19:00' 표기 수정", bar: "bg-warning-fg", text: "text-warning-fg" },
  { key: "diff" as const, label: "다른 행동", note: "예: 사업자가 리마인드 대신 전화함", bar: "bg-neutral-fg", text: "text-neutral-fg" },
  { key: "unsafe" as const, label: "위험 판정", note: "없음", bar: "bg-danger-fg", text: "text-danger-fg" },
];

export type HistoryEvent = { actor: Actor; text: string; meta: string };

export const permissionHistory: HistoryEvent[] = [
  { actor: "human", text: "이미래 · 할 일 생성 승인 후 실행 → 자동 실행 (브랜드 기본값)", meta: "10/11 10:12 · 직접 설정" },
  { actor: "human", text: "이미래 · 예약 생성(문의 기반) 제안만 → 승인 후 실행 (브랜드 기본값)", meta: "10/9 21:04 · 프리셋 Level 2" },
  { actor: "system", text: "온보딩 · Level 1 적용", meta: "10/1 15:40" },
];

/* 변경 미리보기 — 최근 30일 기록에 새 설정을 적용했을 때. 실제로 실행되지 않는다. */
export function impactOf(task: AiTask, from: Level, to: Level): { title: string; lines: string[] } {
  const n = task.month;
  if (to === "auto") {
    return {
      title: `${task.name} ${n}건이 승인 없이 실행됐을 거예요`,
      lines: [
        task.week.shadow
          ? `지켜보기 모드 일치 ${Math.round((task.week.shadow.match / task.week.count) * 100)}% · 위험 ${task.week.shadow.unsafe}건 · 수정 필요 ${task.week.shadow.edit}건은 시간 표기 차이`
          : "지켜보기 모드 기록이 없어요",
        "같은 회원에게 6시간에 1건 · 수신 동의 검사는 그대로 적용돼요",
        "마음에 들지 않으면 언제든 '승인 후 실행'으로 되돌릴 수 있어요",
      ],
    };
  }
  if (to === "approve") {
    return {
      title: from === "auto" ? `${task.name} ${n}건이 승인함에 들어왔을 거예요` : `${task.name} ${n}건을 승인하면 AI가 실행했을 거예요`,
      lines: [from === "auto" ? `하루 평균 ${Math.max(1, Math.round(n / 30))}건을 직접 확인해야 해요` : "승인 전까지는 아무것도 실행되지 않아요", "같은 회차·같은 유형은 묶음으로 승인할 수 있어요"],
    };
  }
  return {
    title: `${task.name} ${n}건을 사람이 직접 처리해야 했을 거예요`,
    lines: ["AI는 제안만 보여 주고 실행 버튼은 사라져요", "승인함에 이 유형의 카드가 더는 쌓이지 않아요"],
  };
}
