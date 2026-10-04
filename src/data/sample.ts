/*
 * 샘플 데이터 — 기획 문서의 기준 데이터(wf-canonical)와 같다.
 * 기준일 2026-10-14(수) · 재진필라테스 강남점 · 사업장 오너 홍지수.
 */
import type { Actor, RiskTier } from "@/components/ui/badges";
import type { Session } from "@/components/ui/rows";

export const today = {
  dateLabel: "오늘 · 10월 14일 (수)",
  summary: "강남점 · 회차 5개 · 예약 23건 · 빈자리 6석",
  stats: [
    { label: "오늘 예약", value: "23건", tone: "fg" as const },
    { label: "승인 대기", value: "3건", tone: "info" as const },
    { label: "출석 확인 필요", value: "1개 회차", tone: "warning" as const },
    { label: "빈자리", value: "6석", tone: "fg" as const },
  ],
};

export const todaySessions: Session[] = [
  { time: "10:00", duration: "50분", title: "그룹 필라테스", meta: "박준서 강사 · A룸", capacity: "5/8명", remaining: "잔여 3석" },
  { time: "11:00", duration: "50분", title: "1:1 레슨", meta: "이수연 회원 · 오태양 강사", capacity: "1/1명", remaining: "확정" },
  { time: "14:00", duration: "50분", title: "기구 필라테스", meta: "최서연 강사 · B룸", capacity: "4/6명", remaining: "잔여 2석", risk: "노쇼 위험 1명" },
  { time: "16:00", duration: "50분", title: "기구 필라테스", meta: "최서연 강사 · B룸", capacity: "5/6명", remaining: "잔여 1석" },
  { time: "19:00", duration: "50분", title: "그룹 필라테스", meta: "박준서 강사 · A룸", capacity: "8/8명", remaining: "마감 · 대기 2" },
];

export type Evidence = { source: string; text: string };

export type ApprovalRequest = {
  id: string;
  actor: Actor;
  risk: RiskTier;
  title: string;
  subtitle: string;
  queueMeta: string;
  expiresIn: string;
  actions: string[];
  message?: { channel: string; body: string };
  evidence: Evidence[];
  primaryLabel: string;
  doneItems: string[];
};

export const approvals: ApprovalRequest[] = [
  {
    id: "apr-1",
    actor: "ai",
    risk: "medium",
    title: "김하늘님 금 19:00 그룹 필라테스 2자리 신청",
    subtitle: "그룹 필라테스 · 문의함에서 AI가 제안 · 2시간 후 만료",
    queueMeta: "문의함 · AI 제안 · 예약 생성 + 확정 메시지 · 2시간 후 만료",
    expiresIn: "2시간 후 만료",
    actions: ["예약 생성 · 10/16(금) 19:00 회차 2자리 (잔여 2석)", "확정 메시지 전송 · 카카오 알림톡"],
    message: {
      channel: "카카오 알림톡 · 회원에게 전달될 내용",
      body: "김하늘님, 10월 16일(금) 19:00 그룹 필라테스 2자리(김하늘·정다은) 예약이 확정됐어요. 수업 10분 전까지 도착해 주세요.",
    },
    evidence: [
      { source: "문의 메시지", text: "\"금요일 저녁에 친구랑 둘이 같이 들을 수 있나요?\" (10/14 13:05)" },
      { source: "회차 데이터", text: "10/16(금) 19:00 그룹 필라테스 · 6/8명, 2자리 남음" },
      { source: "프로그램 규칙", text: "그룹 필라테스는 자동 확정 · 정원 8명" },
      { source: "수신 동의", text: "김하늘 동의 · 정다은 동의 기록 없음 → 김하늘에게만 보내요" },
    ],
    primaryLabel: "예약 만들고 메시지 보내기",
    doneItems: ["예약 생성 · 10/16(금) 19:00 그룹 필라테스 2자리", "확정 메시지 전송 · 김하늘님 카카오 알림톡"],
  },
  {
    id: "apr-2",
    actor: "ai",
    risk: "medium",
    title: "홍서준님 수 14:00 → 토 09:00 기구 필라테스 변경 요청",
    subtitle: "기구 필라테스 · 회원 AI 도우미에서 요청 · 46시간 후 만료",
    queueMeta: "회원 AI 도우미 · 대체 회차 잔여 3석 · 46시간 후 만료",
    expiresIn: "46시간 후 만료",
    actions: ["예약 변경 · 10/14(수) 14:00 → 10/17(토) 09:00 기구 필라테스", "변경 안내 · 카카오 알림톡"],
    message: {
      channel: "카카오 알림톡 · 회원에게 전달될 내용",
      body: "홍서준님, 예약이 10월 17일(토) 09:00 기구 필라테스로 바뀌었어요. 기존 10월 14일(수) 14:00 예약은 취소됐어요.",
    },
    evidence: [
      { source: "회원 AI 도우미", text: "\"오늘 2시 수업을 토요일 오전으로 옮길 수 있어요?\"" },
      { source: "회차 데이터", text: "10/17(토) 09:00 기구 필라테스 · 3/6명, 3자리 남음" },
      { source: "프로그램 규칙", text: "기구 필라테스는 관리자 확인 후 확정" },
    ],
    primaryLabel: "예약 바꾸고 안내 보내기",
    doneItems: ["예약 변경 · 10/17(토) 09:00 기구 필라테스", "변경 안내 전송 · 홍서준님 카카오 알림톡"],
  },
  {
    id: "apr-3",
    actor: "ai",
    risk: "high",
    title: "화 10:00 그룹 필라테스 회차 추가 제안 (지난주 대기 2명)",
    subtitle: "AI 회차 편성 추천 · 기존 예약 영향 없음 · 47시간 후 만료",
    queueMeta: "AI 회차 편성 추천 · 기존 예약 영향 없음 · 47시간 후 만료",
    expiresIn: "47시간 후 만료",
    actions: ["회차 추가 · 10/20(화) 10:00 그룹 필라테스 · 정원 8 · 박준서 강사"],
    evidence: [
      { source: "지난 회차", text: "10/13(화) 10:00 그룹 필라테스 8/8명 마감 · 대기 2명" },
      { source: "강사 일정", text: "박준서 강사 10/20(화) 10:00 비어 있음" },
      { source: "공간", text: "A룸 10/20(화) 10:00 비어 있음" },
    ],
    primaryLabel: "회차 추가하기",
    doneItems: ["회차 추가 · 10/20(화) 10:00 그룹 필라테스"],
  },
];

export const briefing = [
  { kind: "clock", text: "승인 대기 3건 · 가장 급한 예약 요청은 2시간 후 만료돼요", href: "/admin/approvals" },
  { kind: "risk", text: "14:00 기구 필라테스에 노쇼 위험 1명 · 참석 확인 메시지를 준비했어요", href: "/admin/approvals" },
  { kind: "attendance", text: "오늘 10:00 회차 출석 2명이 아직 기록되지 않았어요", href: "/admin/schedule/attendance" },
  { kind: "failed", text: "메시지 전송 실패 1건 · 예약은 완료돼 있어요", href: "/admin/today#todo" },
] as const;
