/*
 * 응대 지침·참고 자료 샘플 — 강남점.
 * Figma의 '근거 없음' 사례(주차 문의, 157:605)와 맞추려고 주차 안내는 아직 없어요.
 * v1에는 결제·환불이 없어서 환불 관련 자료는 두지 않아요.
 */
export type Guide = { id: string; title: string; text: string };

export const initialGuides: Guide[] = [
  {
    id: "tone",
    title: "기본 응대 원칙",
    text: "짧은 해요체로 답해요. 모르는 건 추측하지 않고 '확인해서 알려 드릴게요'라고 해요. 참고 자료에 없는 가격·시간은 말하지 않아요.",
  },
  {
    id: "booking",
    title: "예약·변경·취소",
    text: "변경·취소 마감은 수업 24시간 전이라고 안내해요. 참석 확인에 '못 가요'로 답하면 마감이 지나도 수업 전까지 바로 취소된다고 알려요. 기구·듀엣·1:1은 관리자 확인 후 확정돼요.",
  },
  {
    id: "noshow",
    title: "노쇼·참석 확인",
    text: "노쇼 위험이 있어도 회원에게 위험하다고 말하지 않아요. 참석 확인 메시지만 제안하고, 취소는 회원이 직접 확인해야 처리돼요.",
  },
  {
    id: "handoff",
    title: "사람에게 넘기는 경우",
    text: "환불·결제 문의, 불만, 건강 상태 상담, 참고 자료로 답할 수 없는 질문은 답장 초안을 만들지 않고 담당자에게 넘겨요.",
  },
];

export type GuideSuggestion = { id: string; target: string; text: string; basis: string };

export const guideSuggestions: GuideSuggestion[] = [
  { id: "s1", target: "noshow", text: "참석 확인 메시지에 '취소하시겠어요?' 같은 취소 권유 문구를 넣지 않아요.", basis: "최근 3번 같은 문구를 거절함" },
  { id: "s2", target: "booking", text: "1:1 레슨 변경 요청은 담당 강사 일정을 먼저 확인한다고 안내해요.", basis: "최근 5번 같은 내용을 고쳐서 보냄" },
];

export type Mode = "quote" | "summary" | "off";
export const modeLabel: Record<Mode, string> = { quote: "그대로 인용", summary: "요약해서 참고", off: "참고 안 함" };
export const categories = ["자주 묻는 질문", "방문 안내", "준비물", "말투", "내부 운영 문서"] as const;
export type Category = (typeof categories)[number];

export type Doc = {
  id: string;
  title: string;
  category: Category;
  text: string;
  mode: Mode;
  active: boolean;
  updated: string;
  created: string;
  related?: { label: string; href: string }[];
  history: { version: string; who: string; when: string; what: string }[];
};

export const initialDocs: Doc[] = [
  {
    id: "first-visit",
    title: "첫 방문 안내",
    category: "자주 묻는 질문",
    text: "처음 오시면 수업 10분 전까지 도착해 주세요. 프런트에서 간단한 건강 상태 확인서를 쓰고, 강사가 기초 동작을 먼저 알려 드려요. 그룹 필라테스는 처음이어도 들을 수 있어요.",
    mode: "quote",
    active: true,
    updated: "2026.10.12 · 홍지수",
    created: "2026.10.01 · 이미래",
    related: [{ label: "그룹 필라테스", href: "/admin/programs/group" }],
    history: [
      { version: "v3", who: "홍지수", when: "10/12 18:40", what: "도착 시간 15분 → 10분" },
      { version: "v2", who: "김민준", when: "10/05 11:02", what: "건강 상태 확인서 문장 추가" },
      { version: "v1", who: "이미래", when: "10/01 09:30", what: "처음 만듦" },
    ],
  },
  {
    id: "prepare",
    title: "수업 준비물·복장",
    category: "준비물",
    text: "몸에 붙는 운동복과 미끄럼 방지 양말을 준비해 주세요. 양말은 프런트에서 살 수 있어요. 개인 물병은 들고 들어올 수 있어요.",
    mode: "quote",
    active: true,
    updated: "2026.10.05 · 김민준",
    created: "2026.10.01 · 이미래",
    related: [
      { label: "그룹 필라테스", href: "/admin/programs/group" },
      { label: "기구 필라테스", href: "/admin/programs/reformer" },
    ],
    history: [
      { version: "v2", who: "김민준", when: "10/05 10:12", what: "물병 안내 추가" },
      { version: "v1", who: "이미래", when: "10/01 09:31", what: "처음 만듦" },
    ],
  },
  {
    id: "deadline",
    title: "취소·변경 마감 안내",
    category: "자주 묻는 질문",
    text: "변경·취소는 수업 24시간 전까지 회원 앱에서 직접 할 수 있어요. 참석 확인 메시지에 '못 가요'로 답하면 그 뒤에도 수업 전까지 바로 취소돼요.",
    mode: "quote",
    active: true,
    updated: "2026.10.10 · 홍지수",
    created: "2026.10.01 · 이미래",
    history: [
      { version: "v2", who: "홍지수", when: "10/10 15:20", what: "참석 확인 예외 문장 추가" },
      { version: "v1", who: "이미래", when: "10/01 09:32", what: "처음 만듦" },
    ],
  },
  {
    id: "hongdae-way",
    title: "홍대점 오시는 길",
    category: "방문 안내",
    text: "홍대입구역 9번 출구에서 걸어서 5분이에요. 같은 브랜드라 홍대점 수업도 회원 앱에서 예약할 수 있어요.",
    mode: "summary",
    active: true,
    updated: "2026.10.02 · 이유나",
    created: "2026.10.02 · 이유나",
    history: [{ version: "v1", who: "이유나", when: "10/02 14:00", what: "처음 만듦" }],
  },
  {
    id: "tone-guide",
    title: "답변 말투",
    category: "말투",
    text: "존댓말 해요체로 짧게 써요. 이모지는 쓰지 않아요. 회원 이름 뒤에는 '님'을 붙여요.",
    mode: "summary",
    active: true,
    updated: "2026.10.01 · 이미래",
    created: "2026.10.01 · 이미래",
    history: [{ version: "v1", who: "이미래", when: "10/01 09:40", what: "처음 만듦" }],
  },
  {
    id: "complaint",
    title: "불만 응대 원칙",
    category: "말투",
    text: "불만 문의에는 AI가 답장 초안을 만들지 않고 사업장 오너에게 바로 넘겨요.",
    mode: "off",
    active: false,
    updated: "2026.10.01 · 이미래",
    created: "2026.10.01 · 이미래",
    history: [{ version: "v1", who: "이미래", when: "10/01 09:45", what: "처음 만듦 · 응대 지침으로 옮겨서 꺼 둠" }],
  },
  {
    id: "coach-change",
    title: "강사 교체 시 안내 절차",
    category: "내부 운영 문서",
    text: "강사가 바뀌면 수업 하루 전까지 확정 회원에게 알리고, 원하면 수수료 없이 취소할 수 있다고 안내해요.",
    mode: "summary",
    active: true,
    updated: "2026.10.05 · 홍지수",
    created: "2026.10.05 · 홍지수",
    history: [{ version: "v1", who: "홍지수", when: "10/05 17:10", what: "처음 만듦" }],
  },
  {
    id: "cancel-notice",
    title: "휴강 안내 문구 기준",
    category: "내부 운영 문서",
    text: "휴강 안내에는 사유, 대체 회차, 옮기는 방법을 꼭 넣어요. 기구·듀엣·1:1은 옮기기 신청이 관리자 확인 후 확정된다고 적어요.",
    mode: "summary",
    active: true,
    updated: "2026.10.13 · 홍지수",
    created: "2026.10.04 · 홍지수",
    history: [
      { version: "v2", who: "홍지수", when: "10/13 18:10", what: "관리자 확인 문장 추가" },
      { version: "v1", who: "홍지수", when: "10/04 16:00", what: "처음 만듦" },
    ],
  },
];

/* 문의함에서 근거가 없어 AI가 답하지 못한 질문 — 참고 자료 추가 제안 */
export const missingDoc = {
  title: "강남점 주차 안내",
  category: "방문 안내" as Category,
  basis: "이번 주 주차 문의 2건에 답할 근거가 없어 AI가 초안을 만들지 못했어요",
};
