/*
 * 모바일 승인 — Figma Mobile Approvals(120:2). 승인함 데이터는 데스크톱과 같은 apr-1~3을 써요.
 * 승인하면: 실행 직전 다시 확인 → 실행 → 결과. 김하늘님 건(apr-1)은 Figma 흐름대로 '예약은 완료, 메시지는 실패'를 보여 줘요.
 * 카드 상태(충돌·만료·내용 바뀜·이미 처리됨·정책 충돌)는 ?state= 로 열어요.
 */
import type { ApprovalRequest } from "./sample";

export const recheck: Record<string, string[]> = {
  "apr-1": ["10/16(금) 19:00 회차 잔여 2석 그대로예요", "정책 확인 · 홍지수님 승인 완료", "알림톡 연결 확인"],
  "apr-2": ["10/17(토) 09:00 회차 잔여 3석 그대로예요", "정책 확인 · 홍지수님 승인 완료", "알림톡 연결 확인"],
  "apr-3": ["박준서 강사·A룸 10/20(화) 10:00 비어 있어요", "정책 확인 · 위험 높음 · 사업장 오너 승인 완료"],
};

/* 결과가 일부 실패인 건 */
export const partialResult: Record<string, { done: string[]; failed: string[]; note: string }> = {
  "apr-1": {
    done: ["예약 2건 생성 · 김하늘·정다은님 10/16(금) 19:00"],
    failed: ["메시지 전송 실패 · 알림톡 일시 오류"],
    note: "예약은 이미 확정됐어요. 회원 앱 내 예약에도 확정으로 보여요.",
  },
};

export type CardState = "conflict" | "expired" | "superseded" | "handled" | "policy";

export const stateMeta: Record<
  CardState,
  { chip: string; title: string; tone: "warning" | "neutral" | "info" | "success" | "danger"; done: string; notDone: string; next: string; preview: string }
> = {
  conflict: {
    chip: "충돌",
    title: "자리가 없어요",
    tone: "warning",
    done: "아무것도 실행하지 않았어요. 승인 대기 중에는 자리를 잡아 두지 않아요.",
    notDone: "10/16(금) 19:00 회차가 방금 마감됐어요 (8/8).",
    next: "대체 회차로 바꿔 승인하거나 고객에게 다른 시간을 물어보세요.",
    preview: "자리가 방금 마감됐을 때",
  },
  expired: {
    chip: "만료",
    title: "승인 시간이 지났어요",
    tone: "neutral",
    done: "아무것도 실행하지 않았어요.",
    notDone: "2시간 안에 승인하지 않아 제안이 만료됐어요 (15:06).",
    next: "필요하면 문의함에서 AI에게 다시 제안받거나 직접 답해요.",
    preview: "승인 시간이 지났을 때",
  },
  superseded: {
    chip: "내용 바뀜",
    title: "기다리는 동안 요청이 바뀌었어요",
    tone: "info",
    done: "아무것도 실행하지 않았어요.",
    notDone: "김하늘님이 '목요일 오전도 괜찮아요'라고 다시 문의했어요.",
    next: "바뀐 내용으로 만든 새 제안을 확인해요. 이 제안은 닫혀요.",
    preview: "고객이 요청을 바꿨을 때",
  },
  handled: {
    chip: "이미 처리됨",
    title: "김민준 매니저가 먼저 승인했어요",
    tone: "success",
    done: "예약 2건 생성 · 확정 메시지 전송 (13:12 · 김민준 매니저)",
    notDone: "없어요.",
    next: "할 일이 없어요. 결과는 활동 기록에서 볼 수 있어요.",
    preview: "다른 사람이 먼저 처리했을 때",
  },
  policy: {
    chip: "차단됨",
    title: "정책과 맞지 않아 실행할 수 없어요",
    tone: "danger",
    done: "메시지를 보내지 않았어요.",
    notDone: "정다은님은 메시지 수신 동의가 없어요. 수신 동의 확인은 항상 켜진 규칙이라 끌 수 없어요.",
    next: "전화 등으로 직접 연락한 뒤 '직접 연락함'으로 기록해 주세요.",
    preview: "규칙에 막혔을 때",
  },
};

/* 정책 충돌 예시 — 승인함 3건과 별개로 상태 화면에서만 보여 줘요. */
export const policyExample: ApprovalRequest = {
  id: "apr-policy",
  actor: "ai",
  risk: "medium",
  title: "정다은님 내일 10:00 그룹 필라테스 참석 확인",
  subtitle: "노쇼 참석 확인 · AI가 제안 · 30분 후 만료",
  queueMeta: "",
  expiresIn: "30분 후 만료",
  actions: ["참석 확인 메시지 전송 · 정다은님 · 카카오 알림톡"],
  evidence: [],
  primaryLabel: "",
  doneItems: [],
};

export const conflictAlternative = { label: "10/15(목) 10:00 그룹 필라테스", meta: "6/8 · 2자리 남음 · 박준서 강사" };
