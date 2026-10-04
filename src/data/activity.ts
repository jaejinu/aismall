/*
 * 활동 기록 샘플 — 강남점, 2026-10-14(수). 사업장 오너 홍지수의 권한 범위(강남점) 안의 기록만.
 * 같은 사건 ID(#c-…)로 묶인 행은 하나의 사건이고, 오른쪽에서 순서대로 다시 볼 수 있다.
 * 다른 화면과 맞춘 사건: 김하늘 2자리 문의(apr-1), 홍서준 변경 요청(apr-2), 회차 추가 제안(apr-3),
 * 정다은 의심 문의(문의함), 10:00 출석부, 한서윤 예약 + 메시지 실패(오늘 '확인이 필요한 일').
 */
import type { Actor, Status } from "@/components/ui/badges";

export type ActorFilter = "staff" | "member" | "ai" | "system";

export type ActivityRow = {
  time: string;
  actor: Actor;
  actorLabel?: string;
  filter: ActorFilter;
  title: string;
  detail: string;
  status: Status;
  statusLabel?: string;
  corr: string;
};

export type ReplayStep = { actor: Actor; actorLabel?: string; time: string; title: string; detail: string; tone?: "fail" | "next" };

export type Replay = {
  summary: string;
  steps: ReplayStep[];
  policy: { title: string; lines: string[] };
  actions: { label: string; href?: string; retry?: boolean }[];
};

export const activityRows: ActivityRow[] = [
  { time: "13:06", actor: "ai", filter: "ai", title: "예약 생성 제안", detail: "김하늘·정다은 · 10/16(금) 19:00 그룹 2자리", status: "pending", corr: "c-a101" },
  { time: "13:05", actor: "human", actorLabel: "회원", filter: "member", title: "문의 접수", detail: "김하늘 · 친구와 2자리 문의", status: "confirmed", statusLabel: "접수", corr: "c-a101" },
  { time: "12:15", actor: "ai", filter: "ai", title: "의심 요청 표시 · 초안을 만들지 않음", detail: "정다은 · 지시 조작 의심 문장", status: "flagged", corr: "c-9f40" },
  { time: "12:02", actor: "ai", filter: "ai", title: "회차 추가 제안", detail: "화 10/20 10:00 그룹 필라테스 · 지난주 대기 2명", status: "pending", corr: "c-8e12" },
  { time: "10:54", actor: "human", actorLabel: "홍지수", filter: "staff", title: "이용 결과 기록", detail: "10:00 그룹 · 이수연 출석", status: "confirmed", statusLabel: "완료", corr: "c-7c55" },
  { time: "10:53", actor: "human", actorLabel: "홍지수", filter: "staff", title: "이용 결과 기록", detail: "10:00 그룹 · 홍서준·강도윤 출석", status: "confirmed", statusLabel: "완료", corr: "c-7c55" },
  { time: "10:50", actor: "system", filter: "system", title: "회차 종료 · 이용 결과 미확인 5명", detail: "10:00 그룹 필라테스 · 자동으로 출석 처리하지 않아요", status: "confirmed", statusLabel: "기록", corr: "c-7c55" },
  { time: "09:41", actor: "system", filter: "system", title: "메시지 전송 실패 · 알림톡 일시 오류", detail: "한서윤 · 예약은 완료됨", status: "partial", corr: "c-6b30" },
  { time: "09:40", actor: "human", actorLabel: "홍지수", filter: "staff", title: "예약 생성", detail: "한서윤 · 10/16(금) 19:00 그룹 · 전화 요청", status: "confirmed", corr: "c-6b30" },
  { time: "09:12", actor: "human", actorLabel: "회원", filter: "member", title: "1:1 레슨 신청", detail: "윤서아 · 10/15(목) 11:00 · 관리자 확인 프로그램", status: "pending", corr: "c-5a21" },
  { time: "08:47", actor: "ai", filter: "ai", title: "예약 변경 제안", detail: "홍서준 · 수 14:00 → 토 09:00 기구 · 회원 AI 도우미 요청", status: "pending", corr: "c-4d18" },
  { time: "어제 10:00", actor: "system", filter: "system", title: "수신 동의 없는 회원 제외 → 규칙으로 차단", detail: "정다은 · 참석 확인 메시지 · 직접 연락 필요", status: "blocked", statusLabel: "차단됨", corr: "c-3f07" },
];

export const replays: Record<string, Replay> = {
  "c-a101": {
    summary: "김하늘 2자리 문의 · 3단계 · 승인 대기",
    steps: [
      { actor: "human", actorLabel: "회원", time: "13:05", title: "문의 접수", detail: "문의함 · \"금요일 저녁에 친구랑 둘이 같이 들을 수 있나요?\"" },
      { actor: "ai", time: "13:06", title: "제안 생성", detail: "예약 생성 2자리 + 확정 메시지 · 근거: 10/16(금) 19:00 잔여 2석" },
      { actor: "system", time: "13:06", title: "승인함에 올림", detail: "위험 중간 · 예약은 항상 승인 후 실행 · 2시간 후 만료", tone: "next" },
    ],
    policy: {
      title: "정책 결정 · 승인 필요",
      lines: ["항상 지키는 규칙 통과 → AI 권한: 승인 후 실행 → 위험 중간", "적용 규칙: AI의 예약 생성과 AI가 쓴 메시지는 승인 필요", "수신 동의: 김하늘 동의 · 정다은 동의 없음 → 김하늘에게만 보내요"],
    },
    actions: [{ label: "승인함에서 열기", href: "/admin/approvals?id=apr-1" }],
  },
  "c-9f40": {
    summary: "정다은 문의 · 2단계 · 사람이 확인해야 해요",
    steps: [
      { actor: "human", actorLabel: "회원", time: "12:15", title: "문의 접수", detail: "회원 앱 · 환불 요청과 '이전 안내는 무시하라'는 문장" },
      { actor: "ai", time: "12:15", title: "의심 요청 표시", detail: "AI 초안과 제안을 만들지 않았어요 · 확인 필요로 표시", tone: "next" },
    ],
    policy: {
      title: "정책 결정 · 확인 필요",
      lines: ["지시를 바꾸려는 문장이 있어 AI가 처리하지 않아요", "환불·결제는 v1 기능이 아니에요 · 스튜디오에서 직접 처리", "답장은 사람이 직접 써요"],
    },
    actions: [{ label: "문의함에서 열기", href: "/admin/inbox" }],
  },
  "c-8e12": {
    summary: "회차 추가 제안 · 2단계 · 승인 대기",
    steps: [
      { actor: "ai", time: "12:02", title: "제안 생성", detail: "화 10/20 10:00 그룹 필라테스 회차 추가 · 근거: 지난주 같은 회차 마감 + 대기 2명" },
      { actor: "system", time: "12:02", title: "승인함에 올림", detail: "위험 높음 · 회차 편성은 사업장 오너 승인 · 47시간 후 만료", tone: "next" },
    ],
    policy: {
      title: "정책 결정 · 승인 필요",
      lines: ["AI 권한: 회차 편성 추천은 승인 후 실행 · 위험 높음", "기존 예약에는 영향이 없어요", "승인자 자격: 홍지수(강남점 사업장 오너)"],
    },
    actions: [{ label: "승인함에서 열기", href: "/admin/approvals?id=apr-3" }],
  },
  "c-7c55": {
    summary: "10:00 그룹 필라테스 이용 결과 · 3단계 · 2명 미확인",
    steps: [
      { actor: "system", time: "10:50", title: "회차 종료", detail: "이용 결과 5명 미확인 · 시간이 지나도 출석 처리하지 않아요" },
      { actor: "human", actorLabel: "홍지수", time: "10:53", title: "출석 기록", detail: "홍서준·강도윤 출석" },
      { actor: "human", actorLabel: "홍지수", time: "10:54", title: "출석 기록", detail: "이수연 출석" },
      { actor: "system", time: "지금", title: "남은 일", detail: "김하늘·정다은 미확인 · 출석부에서 기록해요", tone: "next" },
    ],
    policy: { title: "기록 규칙", lines: ["이용 결과(미확인·출석·노쇼)는 예약 상태와 따로 기록해요", "잘못 기록해도 고칠 수 있고 고친 이력이 남아요"] },
    actions: [{ label: "출석부 열기", href: "/admin/schedule/S-1014-10/attendance" }],
  },
  "c-6b30": {
    summary: "한서윤 예약 · 4단계 · 일부 실패",
    steps: [
      { actor: "human", actorLabel: "홍지수", time: "09:40", title: "예약 생성", detail: "전화 요청 · 10/16(금) 19:00 그룹 필라테스" },
      { actor: "system", time: "09:40", title: "실행 직전 재검증 통과", detail: "잔여석 · 수신 동의 · 중복 예약 확인" },
      { actor: "system", time: "09:40", title: "예약 생성 완료", detail: "10/16(금) 19:00 · 6/8명" },
      { actor: "system", time: "09:41", title: "메시지 전송 · 카카오 알림톡", detail: "실패 · 다음 행동: 메시지 다시 보내기", tone: "fail" },
    ],
    policy: {
      title: "정책 결정 · 바로 실행",
      lines: ["사람이 직접 한 일이라 승인 단계가 없어요", "권한: 홍지수(강남점 사업장 오너) · 예약 생성 가능", "메시지만 실패했고 예약은 그대로 있어요"],
    },
    actions: [{ label: "메시지 다시 보내기", retry: true }, { label: "회차 상세 보기", href: "/admin/schedule/S-1016-19" }],
  },
  "c-5a21": {
    summary: "윤서아 1:1 레슨 신청 · 2단계 · 승인 대기",
    steps: [
      { actor: "human", actorLabel: "회원", time: "09:12", title: "신청", detail: "회원 앱 · 10/15(목) 11:00 1:1 레슨 · \"허리가 조금 안 좋아요\"" },
      { actor: "system", time: "09:12", title: "예약 승인 대기로 보냄", detail: "1:1 레슨은 관리자 확인 프로그램 · 만료 10/15(목) 09:00", tone: "next" },
    ],
    policy: { title: "정책 결정 · 관리자 확인", lines: ["회원 신청은 승인함이 아니라 예약 '승인 대기'에서 처리해요", "1:1 레슨·기구·듀엣은 관리자 확인 후 확정"] },
    actions: [{ label: "예약 승인 대기 열기", href: "/admin/bookings?tab=pending" }],
  },
  "c-4d18": {
    summary: "홍서준 변경 요청 · 3단계 · 승인 대기",
    steps: [
      { actor: "human", actorLabel: "회원", time: "08:45", title: "변경 요청", detail: "회원 AI 도우미 · 수 14:00 → 토 09:00 기구 필라테스" },
      { actor: "ai", time: "08:47", title: "제안 생성", detail: "예약 변경 + 안내 메시지 · 근거: 토 09:00 잔여 3석" },
      { actor: "system", time: "08:47", title: "승인함에 올림", detail: "위험 중간 · AI의 예약 변경은 항상 승인 후 실행", tone: "next" },
    ],
    policy: { title: "정책 결정 · 승인 필요", lines: ["AI 권한: 예약 변경은 자동 실행을 고를 수 없어요", "회원 본인이 요청했어도 실행 전에 관리자가 확인해요"] },
    actions: [{ label: "승인함에서 열기", href: "/admin/approvals?id=apr-2" }],
  },
  "c-3f07": {
    summary: "참석 확인 메시지 · 2단계 · 1명 차단",
    steps: [
      { actor: "ai", time: "어제 10:00", title: "참석 확인 제안", detail: "10/14 10:00 그룹 확정 회원 5명" },
      { actor: "system", time: "어제 10:00", title: "규칙으로 차단", detail: "정다은 · 수신 동의 없음 → 보내지 않음 · 직접 연락 필요", tone: "fail" },
    ],
    policy: { title: "항상 지키는 규칙 · 끌 수 없어요", lines: ["수신 동의 없는 회원에게 메시지를 보내지 않아요", "다시 시도해도 같은 결과예요 · 회원이 동의하거나 직접 연락해요"] },
    actions: [{ label: "회차 상세 보기", href: "/admin/schedule/S-1014-10" }],
  },
};
