/*
 * 프로그램 — 기준 데이터(wf-canonical)의 4개 프로그램. 브랜드 재진필라테스, 지금 보는 지점은 강남점.
 * 확정 방식은 프로그램마다: 그룹 자동 확정, 기구 관리자 확인(자동 확정으로 바꿀 수 있음), 듀엣·1:1 관리자 확인.
 * 대기자 자동 확정은 프로그램 설정의 규칙(AI 권한 아님), 기본 꺼짐 — 샘플에서는 그룹만 켜짐.
 * 마감: 변경·취소는 수업 24시간 전. 신청 마감은 예약 데이터와 맞춤(1:1 2시간 전, 기구 24시간 전).
 */
import { weekSessions, type Kind } from "./schedule";

export type ConfirmMode = "auto" | "manual";

export type Program = {
  id: Kind;
  name: string;
  typeLabel: string;
  duration: number;
  capacity: number;
  branches: string[];
  confirm: ConfirmMode;
  confirmNote?: string;
  waitlistAuto: boolean;
  applyDeadline: number;
  changeDeadline: number;
  cancelDeadline: number;
  description: string;
  status: "운영 중" | "일시 중단";
};

export const programs: Program[] = [
  {
    id: "group",
    name: "그룹 필라테스",
    typeLabel: "그룹",
    duration: 50,
    capacity: 8,
    branches: ["강남점", "홍대점", "마포점"],
    confirm: "auto",
    waitlistAuto: true,
    applyDeadline: 1,
    changeDeadline: 24,
    cancelDeadline: 24,
    description: "매트에서 하는 8인 그룹 수업이에요. 처음 오시는 분도 들을 수 있어요.",
    status: "운영 중",
  },
  {
    id: "reformer",
    name: "기구 필라테스",
    typeLabel: "기구",
    duration: 50,
    capacity: 6,
    branches: ["강남점", "마포점"],
    confirm: "manual",
    confirmNote: "자동 확정으로 바꿀 수 있어요",
    waitlistAuto: false,
    applyDeadline: 24,
    changeDeadline: 24,
    cancelDeadline: 24,
    description: "리포머 기구 6대로 하는 소그룹 수업이에요.",
    status: "운영 중",
  },
  {
    id: "duet",
    name: "듀엣 필라테스",
    typeLabel: "소그룹",
    duration: 50,
    capacity: 2,
    branches: ["강남점"],
    confirm: "manual",
    waitlistAuto: false,
    applyDeadline: 24,
    changeDeadline: 24,
    cancelDeadline: 24,
    description: "두 사람이 함께 신청하는 2인 수업이에요.",
    status: "운영 중",
  },
  {
    id: "private",
    name: "1:1 레슨",
    typeLabel: "1:1",
    duration: 50,
    capacity: 1,
    branches: ["강남점", "홍대점"],
    confirm: "manual",
    waitlistAuto: false,
    applyDeadline: 2,
    changeDeadline: 24,
    cancelDeadline: 24,
    description: "강사와 1:1로 하는 개인 레슨이에요.",
    status: "운영 중",
  },
];

export const confirmLabel: Record<ConfirmMode, string> = { auto: "자동 확정", manual: "관리자 확인" };

/* 강남점 이번 주(10/12~18) 운영 현황 — 주간 일정 데이터에서 계산 */
export function weekStats(kind: Kind) {
  const list = weekSessions.filter((s) => s.kind === kind);
  const active = list.filter((s) => !s.cancelled);
  const booked = active.reduce((a, s) => a + s.booked, 0);
  const seats = active.reduce((a, s) => a + s.capacity, 0);
  return { sessions: list, count: list.length, cancelled: list.length - active.length, booked, fill: seats ? Math.round((booked / seats) * 100) : null };
}
