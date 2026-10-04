/*
 * 회원 알림 샘플 — 회원 김하늘, 10/14(수) 저녁 시점의 알림함.
 * (오늘 19:00 그룹 필라테스는 대기 2번 · '자리 나면 자동 확정' 동의함. 자리가 16:00 이후에 나서 자동 확정 대신 빈자리 안내를 받음)
 */
export type NoticeKind = "waitlist" | "open-seat" | "attendance" | "confirmed";

export type MemberNotice = {
  id: string;
  kind: NoticeKind;
  title: string;
  meta: string;
  href?: string;
  unread: boolean;
};

export const memberNotices: MemberNotice[] = [
  { id: "n1", kind: "waitlist", title: "오늘 19:00 그룹 필라테스 · 자동 확정 안 됨", meta: "17:05 · 대기 결과", href: "/member/notices/waitlist", unread: true },
  { id: "n2", kind: "open-seat", title: "오늘 19:00 그룹 필라테스 자리가 났어요", meta: "17:05 · 빈자리 안내", href: "/member/notices/open-seat", unread: true },
  { id: "n3", kind: "attendance", title: "내일 10:00 그룹 필라테스 오시나요?", meta: "10:00 · 참석 확인 · 아직 응답 전", href: "/member/notices/attendance", unread: true },
  { id: "n4", kind: "confirmed", title: "10/15(목) 10:00 그룹 필라테스 예약이 확정됐어요", meta: "10/12(월) · 예약 확정", href: "/member/bookings", unread: false },
];
