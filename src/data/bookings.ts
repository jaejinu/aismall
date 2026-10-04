/*
 * 관리자 예약 목록 샘플 — 강남점, 기준일 2026-10-14(수). 기준 데이터(wf-canonical)와 같다.
 * '승인 대기' = 관리자 확인 프로그램(기구·듀엣·1:1)의 회원 신청. 승인함(AI 제안 전용)과 다르다(D-01).
 */
export type BookingStatus = "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
export type Attendance = "unknown" | "attended" | "noshow" | "none";

export type BookingRow = {
  id: string;
  when: string; // 2026.10.15 (목) 10:00
  member: string;
  program: string;
  sessionId: string;
  note?: string;
  coach: string;
  seats: string;
  status: BookingStatus;
  statusDetail?: string;
  attendance: Attendance;
  pending?: {
    requestedAt: string;
    expiresAt: string;
    memberNote?: string;
    context: string[];
  };
};

export const bookingRows: BookingRow[] = [
  {
    id: "B-2001",
    when: "2026.10.15 (목) 11:00",
    member: "윤서아",
    program: "1:1 레슨",
    sessionId: "S-1015-11",
    note: "관리자 확인",
    coach: "오태양",
    seats: "0 / 1 · 신청 1",
    status: "pending",
    statusDetail: "만료 10/15(목) 09:00",
    attendance: "none",
    pending: {
      requestedAt: "10/14(수) 09:12 · 회원 앱",
      expiresAt: "10/15(목) 09:00 (신청 마감과 48시간 중 이른 시점)",
      memberNote: "처음 1:1 레슨이에요. 허리가 조금 안 좋아요.",
      context: ["오태양 강사 10/15(목) 11:00 비어 있음", "C룸 비어 있음", "윤서아 · 최근 30일 출석 5회 · 노쇼 없음"],
    },
  },
  {
    id: "B-2002",
    when: "2026.10.17 (토) 09:00",
    member: "강도윤",
    program: "기구 필라테스",
    sessionId: "S-1017-09",
    note: "휴강 대체 이동",
    coach: "최서연",
    seats: "3 / 6 · 신청 1",
    status: "pending",
    statusDetail: "만료 10/16(금) 09:00",
    attendance: "none",
    pending: {
      requestedAt: "10/14(수) 11:30 · 휴강 안내에서 이동 신청",
      expiresAt: "10/16(금) 09:00",
      context: ["기존 예약 10/16(금) 10:00 기구 필라테스 · 휴강", "승인되면 휴강 예약은 자동 정리돼요 · 거절되면 휴강 예약은 취소로 남아요", "10/17(토) 09:00 · 3자리 남음"],
    },
  },
  { id: "B-1501", when: "2026.10.15 (목) 10:00", member: "김하늘", program: "그룹 필라테스", sessionId: "S-1015-10", coach: "박준서", seats: "6 / 8", status: "confirmed", attendance: "unknown" },
  { id: "B-1401", when: "2026.10.14 (수) 10:00", member: "정다은", program: "그룹 필라테스", sessionId: "S-1014-10", coach: "박준서", seats: "5 / 8", status: "confirmed", attendance: "unknown" },
  { id: "B-1402", when: "2026.10.14 (수) 10:00", member: "김하늘", program: "그룹 필라테스", sessionId: "S-1014-10", coach: "박준서", seats: "5 / 8", status: "confirmed", attendance: "unknown" },
  { id: "B-1403", when: "2026.10.14 (수) 11:00", member: "이수연", program: "1:1 레슨", sessionId: "S-1014-11", coach: "오태양", seats: "1 / 1", status: "confirmed", attendance: "attended" },
  { id: "B-1404", when: "2026.10.14 (수) 14:00", member: "홍서준", program: "기구 필라테스", sessionId: "S-1014-14", note: "노쇼 위험", coach: "최서연", seats: "4 / 6", status: "confirmed", attendance: "unknown" },
  { id: "B-1405", when: "2026.10.14 (수) 19:00", member: "윤서아", program: "그룹 필라테스", sessionId: "S-1014-19", coach: "박준서", seats: "8 / 8", status: "waitlisted", statusDetail: "대기 1번", attendance: "none" },
  { id: "B-1406", when: "2026.10.14 (수) 19:00", member: "김하늘", program: "그룹 필라테스", sessionId: "S-1014-19", coach: "박준서", seats: "8 / 8", status: "waitlisted", statusDetail: "대기 2번 · 자동 확정 동의", attendance: "none" },
  { id: "B-1601", when: "2026.10.16 (금) 10:00", member: "강도윤", program: "기구 필라테스", sessionId: "S-1016-10", note: "휴강", coach: "최서연", seats: "6 / 6", status: "cancelled", statusDetail: "휴강 · 회원 안내 완료", attendance: "none" },
  { id: "B-1301", when: "2026.10.13 (화) 10:00", member: "정다은", program: "그룹 필라테스", sessionId: "S-1013-10", coach: "박준서", seats: "8 / 8", status: "confirmed", attendance: "attended" },
  { id: "B-1001", when: "2026.10.10 (토) 09:00", member: "홍서준", program: "기구 필라테스", sessionId: "S-1010-09", coach: "최서연", seats: "5 / 6", status: "confirmed", attendance: "noshow" },
];
