/*
 * 회원·고객 — 강남점. 기준 데이터(wf-canonical)와 다른 화면(예약·문의함·회차·활동 기록)에 나온 사람들.
 * 회원 = 가입하고 직접 예약하는 사람, 문의 고객 = 가입 없이 문의 페이지로 문의한 사람.
 * 노쇼 위험은 관리자에게만, 점수 없이 보여요. 노쇼 위험을 이유로 예약을 막거나 취소하지 않아요(끌 수 없는 규칙).
 */
export type BookingHistory = { when: string; program: string; status: string; tone: "confirmed" | "pending" | "waitlisted" | "cancelled"; result: string; href?: string };
export type InquiryHistory = { when: string; text: string; state: string; href?: string };

export type Person = {
  id: string;
  name: string;
  kind: "member" | "lead";
  phone: string;
  joined: string;
  consent: { booking: boolean; marketing: boolean };
  next?: string;
  stats: { attended: number; noshow: number; waiting: number };
  summary: string[];
  summaryBasis: string;
  risk?: string;
  bookings: BookingHistory[];
  inquiries: InquiryHistory[];
  memo?: string;
};

export const people: Person[] = [
  {
    id: "kim-haneul",
    name: "김하늘",
    kind: "member",
    phone: "010-2***-1234",
    joined: "2026.09.02",
    consent: { booking: true, marketing: false },
    next: "10/15(목) 10:00 그룹 필라테스",
    stats: { attended: 7, noshow: 0, waiting: 1 },
    summary: ["주로 수·목 오전 그룹 필라테스를 이용해요", "최근 30일 출석 7회 · 노쇼 없어요", "오늘 19:00 그룹 대기 2번이에요 · 자리 나면 자동 확정에 동의했어요"],
    summaryBasis: "최근 30일 예약·출석 기록 · 대기 신청",
    bookings: [
      { when: "10/16(금) 19:00", program: "그룹 필라테스 2자리(정다은 함께)", status: "AI 제안 · 승인 대기", tone: "pending", result: "—", href: "/admin/approvals?id=apr-1" },
      { when: "10/15(목) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "미확인", href: "/admin/schedule/S-1015-10" },
      { when: "10/14(수) 19:00", program: "그룹 필라테스", status: "대기 2번", tone: "waitlisted", result: "—", href: "/admin/schedule/S-1014-19" },
      { when: "10/14(수) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "미확인", href: "/admin/schedule/S-1014-10" },
      { when: "10/13(화) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "출석", href: "/admin/schedule/S-1013-10" },
    ],
    inquiries: [{ when: "10/14 13:05", text: "금요일 저녁 그룹 2자리(친구 정다은)", state: "AI 제안 · 승인 대기", href: "/admin/inbox" }],
  },
  {
    id: "jung-daeun",
    name: "정다은",
    kind: "member",
    phone: "010-3***-8842",
    joined: "2026.08.21",
    consent: { booking: false, marketing: false },
    next: "10/15(목) 10:00 그룹 필라테스",
    stats: { attended: 6, noshow: 0, waiting: 0 },
    summary: ["예약 안내 수신 동의가 없어 알림·참석 확인을 보낼 수 없어요", "주로 김하늘님과 같은 회차를 들어요", "오늘 문의에 지시를 바꾸려는 문장이 있어 AI가 처리하지 않았어요"],
    summaryBasis: "수신 동의 기록 · 최근 30일 예약 · 문의 1건",
    bookings: [
      { when: "10/15(목) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "미확인", href: "/admin/schedule/S-1015-10" },
      { when: "10/14(수) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "미확인", href: "/admin/schedule/S-1014-10" },
      { when: "10/13(화) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "출석", href: "/admin/schedule/S-1013-10" },
    ],
    inquiries: [{ when: "10/14 12:15", text: "이번 달 전액 환불 요청(지시 조작 의심)", state: "확인 필요 · 사람이 답해요", href: "/admin/inbox" }],
  },
  {
    id: "lee-suyeon",
    name: "이수연",
    kind: "member",
    phone: "010-6***-4410",
    joined: "2026.07.15",
    consent: { booking: true, marketing: true },
    stats: { attended: 9, noshow: 2, waiting: 0 },
    summary: ["10/1·10/8 노쇼 2회 이후 오늘은 두 수업 모두 출석했어요", "1:1 레슨과 그룹 필라테스를 같이 들어요", "1:1 레슨은 관리자가 전화로 받아 예약해요"],
    summaryBasis: "최근 30일 예약·출석 기록",
    bookings: [
      { when: "10/14(수) 11:00", program: "1:1 레슨", status: "확정", tone: "confirmed", result: "출석", href: "/admin/schedule/S-1014-11" },
      { when: "10/14(수) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "출석", href: "/admin/schedule/S-1014-10" },
      { when: "10/08(목) 11:00", program: "1:1 레슨", status: "확정", tone: "confirmed", result: "노쇼" },
      { when: "10/01(목) 11:00", program: "1:1 레슨", status: "확정", tone: "confirmed", result: "노쇼" },
    ],
    inquiries: [],
  },
  {
    id: "hong-seojun",
    name: "홍서준",
    kind: "member",
    phone: "010-7***-0391",
    joined: "2026.09.10",
    consent: { booking: true, marketing: false },
    next: "10/14(수) 14:00 기구 필라테스",
    stats: { attended: 4, noshow: 1, waiting: 0 },
    risk: "노쇼 위험 높음 · 근거: 10/10 노쇼, 어제 '10분 늦을 것 같다'는 문의 · 참석 확인에만 써요",
    summary: ["오늘 14:00 기구 수업을 토 09:00로 옮기고 싶어 해요(AI 도우미로 요청)", "10/10 기구 수업에 노쇼가 있었어요", "늦는다는 연락을 미리 주는 편이에요"],
    summaryBasis: "최근 30일 예약·출석 기록 · 문의 1건 · 회원 AI 도우미 대화",
    bookings: [
      { when: "10/17(토) 09:00", program: "기구 필라테스(변경 요청)", status: "AI 제안 · 승인 대기", tone: "pending", result: "—", href: "/admin/approvals?id=apr-2" },
      { when: "10/14(수) 14:00", program: "기구 필라테스", status: "확정", tone: "confirmed", result: "미확인", href: "/admin/schedule/S-1014-14" },
      { when: "10/14(수) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "출석", href: "/admin/schedule/S-1014-10" },
      { when: "10/10(토) 09:00", program: "기구 필라테스", status: "확정", tone: "confirmed", result: "노쇼" },
    ],
    inquiries: [{ when: "10/13 21:40", text: "내일 수업 10분 늦을 것 같아요", state: "답장 전", href: "/admin/inbox" }],
  },
  {
    id: "yoon-seoa",
    name: "윤서아",
    kind: "member",
    phone: "010-8***-1175",
    joined: "2026.06.30",
    consent: { booking: true, marketing: true },
    next: "10/15(목) 10:00 그룹 필라테스",
    stats: { attended: 5, noshow: 0, waiting: 1 },
    summary: ["처음으로 1:1 레슨을 신청했어요 · 허리가 조금 안 좋다고 적었어요", "최근 30일 출석 5회 · 노쇼 없어요", "오늘 19:00 그룹 대기 1번이에요"],
    summaryBasis: "최근 30일 예약·출석 기록 · 1:1 레슨 신청 메모",
    bookings: [
      { when: "10/15(목) 11:00", program: "1:1 레슨", status: "승인 대기", tone: "pending", result: "—", href: "/admin/bookings?tab=pending" },
      { when: "10/15(목) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "미확인", href: "/admin/schedule/S-1015-10" },
      { when: "10/14(수) 19:00", program: "그룹 필라테스", status: "대기 1번", tone: "waitlisted", result: "—", href: "/admin/schedule/S-1014-19" },
      { when: "10/13(화) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "출석", href: "/admin/schedule/S-1013-10" },
    ],
    inquiries: [],
  },
  {
    id: "kang-doyun",
    name: "강도윤",
    kind: "member",
    phone: "010-5***-2207",
    joined: "2026.09.18",
    consent: { booking: true, marketing: false },
    next: "10/17(토) 09:00 기구 필라테스(승인 대기)",
    stats: { attended: 3, noshow: 0, waiting: 0 },
    summary: ["10/16 기구 수업 휴강 대상이에요 · 10/17(토) 09:00로 옮기기를 신청했어요", "회원 AI 도우미로 예약하는 편이에요"],
    summaryBasis: "휴강 처리 기록 · 예약 기록 · 문의 1건",
    bookings: [
      { when: "10/17(토) 09:00", program: "기구 필라테스(휴강 대체)", status: "승인 대기", tone: "pending", result: "—", href: "/admin/bookings?tab=pending" },
      { when: "10/16(금) 10:00", program: "기구 필라테스", status: "취소 · 휴강", tone: "cancelled", result: "—", href: "/admin/schedule/S-1016-10" },
      { when: "10/14(수) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "출석", href: "/admin/schedule/S-1014-10" },
    ],
    inquiries: [{ when: "10/14 11:02", text: "16일 휴강이면 토요일 오전으로 옮길 수 있나요?", state: "AI 초안 · 답장 전", href: "/admin/inbox" }],
  },
  {
    id: "han-seoyun",
    name: "한서윤",
    kind: "member",
    phone: "010-9***-3086",
    joined: "2026.10.03",
    consent: { booking: true, marketing: false },
    next: "10/14(수) 16:00 기구 필라테스",
    stats: { attended: 2, noshow: 0, waiting: 0 },
    summary: ["오늘 전화로 10/16 19:00 그룹을 예약했어요 · 확정 메시지는 보내지 못했어요", "가입한 지 2주 된 새 회원이에요"],
    summaryBasis: "예약 기록 · 메시지 전송 기록",
    bookings: [
      { when: "10/16(금) 19:00", program: "그룹 필라테스", status: "확정 · 메시지 실패", tone: "confirmed", result: "미확인", href: "/admin/activity" },
      { when: "10/15(목) 10:00", program: "그룹 필라테스", status: "확정", tone: "confirmed", result: "미확인", href: "/admin/schedule/S-1015-10" },
      { when: "10/14(수) 16:00", program: "기구 필라테스", status: "확정", tone: "confirmed", result: "미확인", href: "/admin/schedule/S-1014-16" },
    ],
    inquiries: [],
  },
  {
    id: "han-yujin",
    name: "한유진",
    kind: "lead",
    phone: "010-0000-1234",
    joined: "10/14 문의",
    consent: { booking: false, marketing: false },
    stats: { attended: 0, noshow: 0, waiting: 0 },
    summary: ["필라테스가 처음이에요 · 평일 저녁 그룹 수업과 체험을 궁금해해요", "수신 동의 기록이 없어 문의 답장 외에는 연락하지 않아요"],
    summaryBasis: "문의 1건",
    bookings: [],
    inquiries: [{ when: "10/14 12:40", text: "평일 저녁 그룹 수업·체험 문의", state: "AI 초안 · 답장 전", href: "/admin/inbox" }],
  },
];
