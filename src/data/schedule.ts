/* 강남점 이번 주(10/12~10/18) 회차 — 기준 데이터(wf-canonical)와 같다. */
export type Kind = "group" | "reformer" | "duet" | "private";

export type WeekSession = {
  id: string;
  day: string; // 2026-10-13
  time: string;
  kind: Kind;
  coach: string;
  room: string;
  booked: number;
  capacity: number;
  waitlist?: number;
  past?: boolean;
  cancelled?: string; // 휴강 안내 문구
};

export const kindShort: Record<Kind, string> = { group: "그룹", reformer: "기구", duet: "듀엣", private: "1:1 레슨" };

export const weekDays = [
  { date: "2026-10-12", label: "월 12" },
  { date: "2026-10-13", label: "화 13" },
  { date: "2026-10-14", label: "수 14", today: true },
  { date: "2026-10-15", label: "목 15" },
  { date: "2026-10-16", label: "금 16" },
  { date: "2026-10-17", label: "토 17" },
  { date: "2026-10-18", label: "일 18" },
];

export const slots = ["09:00", "10:00", "11:00", "14:00", "16:00", "19:00"];

export const weekSessions: WeekSession[] = [
  { id: "S-1013-10", day: "2026-10-13", time: "10:00", kind: "group", coach: "박준서", room: "A룸", booked: 8, capacity: 8, waitlist: 2, past: true },
  { id: "S-1014-10", day: "2026-10-14", time: "10:00", kind: "group", coach: "박준서", room: "A룸", booked: 5, capacity: 8 },
  { id: "S-1014-11", day: "2026-10-14", time: "11:00", kind: "private", coach: "오태양", room: "C룸", booked: 1, capacity: 1 },
  { id: "S-1014-14", day: "2026-10-14", time: "14:00", kind: "reformer", coach: "최서연", room: "B룸", booked: 4, capacity: 6 },
  { id: "S-1014-16", day: "2026-10-14", time: "16:00", kind: "reformer", coach: "최서연", room: "B룸", booked: 5, capacity: 6 },
  { id: "S-1014-19", day: "2026-10-14", time: "19:00", kind: "group", coach: "박준서", room: "A룸", booked: 8, capacity: 8, waitlist: 2 },
  { id: "S-1015-10", day: "2026-10-15", time: "10:00", kind: "group", coach: "박준서", room: "A룸", booked: 6, capacity: 8 },
  { id: "S-1016-10", day: "2026-10-16", time: "10:00", kind: "reformer", coach: "최서연", room: "B룸", booked: 6, capacity: 6, cancelled: "휴강 예정 · 6명 안내" },
  { id: "S-1016-19", day: "2026-10-16", time: "19:00", kind: "group", coach: "박준서", room: "A룸", booked: 6, capacity: 8 },
  { id: "S-1017-09", day: "2026-10-17", time: "09:00", kind: "reformer", coach: "최서연", room: "B룸", booked: 3, capacity: 6 },
];
