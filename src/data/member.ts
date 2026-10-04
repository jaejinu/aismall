/*
 * 회원 앱 샘플 데이터 — 회원 김하늘 기준. 기준일 2026-10-14(수), 기준 데이터(wf-canonical)와 같다.
 * 그룹 필라테스(정원 8)는 자동 확정, 기구(6)·듀엣(2)·1:1(1)은 관리자 확인 후 확정.
 */
export type ProgramKind = "group" | "reformer" | "duet" | "private";

export const programLabel: Record<ProgramKind, string> = {
  group: "그룹 필라테스",
  reformer: "기구 필라테스",
  duet: "듀엣 필라테스",
  private: "1:1 레슨",
};

export const autoConfirm: Record<ProgramKind, boolean> = {
  group: true,
  reformer: false,
  duet: false,
  private: false,
};

export type SessionState = "open" | "full" | "booked" | "requested" | "waitlisted" | "cancelled";

export type MemberSession = {
  id: string;
  day: string; // YYYY-MM-DD
  time: string;
  kind: ProgramKind;
  coach: string;
  room: string;
  booked: number;
  capacity: number;
  waitlist?: number;
  state: SessionState;
  myWaitNo?: number;
  deadline: string; // 변경·취소 마감
};

export const week = [
  { date: "2026-10-12", day: "월", num: 12 },
  { date: "2026-10-13", day: "화", num: 13 },
  { date: "2026-10-14", day: "수", num: 14 },
  { date: "2026-10-15", day: "목", num: 15 },
  { date: "2026-10-16", day: "금", num: 16 },
  { date: "2026-10-17", day: "토", num: 17 },
  { date: "2026-10-18", day: "일", num: 18 },
];

export const todayDate = "2026-10-14";
/* 샘플의 '지금' 시각. 변경·취소 마감(수업 24시간 전)이 지났는지 이 시각으로 판단한다. */
export const NOW = new Date("2026-10-14T13:00:00+09:00");

export function deadlinePassed(s: { day: string; time: string }) {
  const start = new Date(`${s.day}T${s.time}:00+09:00`);
  return start.getTime() - 24 * 60 * 60 * 1000 <= NOW.getTime();
}

export const memberSessions: MemberSession[] = [
  { id: "S-1014-14", day: "2026-10-14", time: "14:00", kind: "reformer", coach: "최서연 강사", room: "B룸", booked: 4, capacity: 6, state: "open", deadline: "10/13(화) 14:00" },
  { id: "S-1014-16", day: "2026-10-14", time: "16:00", kind: "reformer", coach: "최서연 강사", room: "B룸", booked: 5, capacity: 6, state: "open", deadline: "10/13(화) 16:00" },
  { id: "S-1014-19", day: "2026-10-14", time: "19:00", kind: "group", coach: "박준서 강사", room: "A룸", booked: 8, capacity: 8, waitlist: 2, state: "waitlisted", myWaitNo: 2, deadline: "10/13(화) 19:00" },
  { id: "S-1015-10", day: "2026-10-15", time: "10:00", kind: "group", coach: "박준서 강사", room: "A룸", booked: 6, capacity: 8, state: "booked", deadline: "10/14(수) 10:00" },
  { id: "S-1016-10", day: "2026-10-16", time: "10:00", kind: "reformer", coach: "최서연 강사", room: "B룸", booked: 6, capacity: 6, state: "cancelled", deadline: "10/15(목) 10:00" },
  { id: "S-1016-19", day: "2026-10-16", time: "19:00", kind: "group", coach: "박준서 강사", room: "A룸", booked: 6, capacity: 8, state: "open", deadline: "10/15(목) 19:00" },
  { id: "S-1017-09", day: "2026-10-17", time: "09:00", kind: "reformer", coach: "최서연 강사", room: "B룸", booked: 3, capacity: 6, state: "open", deadline: "10/16(금) 09:00" },
];

export type PastVisit = { title: string; date: string; result: "출석" | "노쇼" | "기록 전" };

export const pastVisits: PastVisit[] = [
  { title: "그룹 필라테스", date: "10/14(수) 10:00", result: "기록 전" },
  { title: "기구 필라테스", date: "10/10(토) 09:00", result: "출석" },
  { title: "그룹 필라테스", date: "10/7(수) 19:00", result: "출석" },
];
