/*
 * 회차 상세·출석부 샘플 — 기준 데이터(wf-canonical)의 이번 주 강남점 회차와 같다.
 * 기준 시각 2026-10-14(수) 13:00. 이용 결과(미확인·출석·노쇼)는 예약 상태와 따로 기록한다.
 * 기준 데이터에 이름이 없는 자리는 샘플 회원(박지민·최유나 등)으로 채웠다. 직원은 명단에 나오지 않는다.
 */
import type { Actor } from "@/components/ui/badges";
import { weekSessions, type Kind, type WeekSession } from "./schedule";

export type EntryStatus = "confirmed" | "pending" | "waitlisted" | "cancelled";
export type Result = "unknown" | "attended" | "noshow" | "none";

export type RosterEntry = {
  name: string;
  status: EntryStatus;
  detail?: string;
  result: Result;
  applied: string; // 10.01
  via: "회원 앱" | "회원 AI 도우미" | "관리자 생성";
  note?: string;
};

export type Related = { actor: Actor; actorLabel?: string; text: string; href?: string; cta?: string };
export type Suggestion = { text: string; evidence: string };
export type LogEvent = { actor: Actor; text: string; time: string };

export const kindLabel: Record<Kind, string> = { group: "그룹 필라테스", reformer: "기구 필라테스", duet: "듀엣 필라테스", private: "1:1 레슨" };
export const programCapacity: Record<Kind, number> = { group: 8, reformer: 6, duet: 2, private: 1 };
export const confirmMode: Record<Kind, string> = { group: "자동 확정", reformer: "관리자 확인", duet: "관리자 확인", private: "관리자 확인" };
export const waitlistRule: Record<Kind, string> = {
  group: "대기자 자동 확정 켜짐 · 동의한 회원부터 대기 순번대로, 수업 3시간 전까지",
  reformer: "대기자 자동 확정 꺼짐 · 자리가 나면 알림 후 선착순",
  duet: "대기자 자동 확정 꺼짐 · 자리가 나면 알림 후 선착순",
  private: "대기 없음",
};

const NOW = { day: "2026-10-14", minutes: 13 * 60 };
const DURATION = 50;
const weekday = ["일", "월", "화", "수", "목", "금", "토"];

const c = (name: string, applied: string, via: RosterEntry["via"], result: Result = "unknown", note?: string): RosterEntry => ({
  name,
  status: "confirmed",
  result,
  applied,
  via,
  note,
});

export const rosters: Record<string, RosterEntry[]> = {
  "S-1013-10": [
    c("정다은", "09.28", "회원 앱", "attended", "수신 동의 없음"),
    c("김하늘", "09.29", "회원 앱", "attended"),
    c("윤서아", "09.30", "회원 앱", "attended"),
    c("박지민", "10.01", "회원 앱", "attended"),
    c("최유나", "10.02", "회원 AI 도우미", "attended"),
    c("오세린", "10.04", "회원 앱", "attended"),
    c("장민호", "10.06", "관리자 생성", "noshow"),
    c("서하린", "10.08", "회원 앱", "attended"),
  ],
  "S-1014-10": [
    c("김하늘", "10.01", "회원 앱", "unknown", "최근 3회 중 출석 3"),
    c("정다은", "10.02", "회원 앱", "unknown", "수신 동의가 없어 참석 확인을 보내지 못함"),
    c("이수연", "10.03", "관리자 생성", "attended", "10/1·10/8 노쇼 2회"),
    c("홍서준", "10.05", "회원 앱", "attended", "최근 3회 중 출석 2"),
    c("강도윤", "10.07", "회원 AI 도우미", "attended", "최근 3회 중 출석 3"),
  ],
  "S-1014-11": [c("이수연", "10.06", "관리자 생성", "attended", "10/1·10/8 노쇼 2회")],
  "S-1014-14": [
    c("홍서준", "10.08", "회원 앱", "unknown", "노쇼 위험 높음 · 토 09:00로 변경 요청 중"),
    c("문지후", "10.09", "회원 앱"),
    c("배수아", "10.10", "회원 AI 도우미"),
    c("임도현", "10.12", "관리자 생성"),
  ],
  "S-1014-16": [
    c("신예린", "10.07", "회원 앱"),
    c("류하준", "10.08", "회원 앱"),
    c("김도아", "10.10", "회원 AI 도우미"),
    c("한서윤", "10.11", "회원 앱"),
    c("오세린", "10.12", "관리자 생성"),
  ],
  "S-1014-19": [
    c("박지민", "10.05", "회원 앱"),
    c("최유나", "10.06", "회원 앱"),
    c("장민호", "10.07", "회원 AI 도우미"),
    c("서하린", "10.08", "회원 앱"),
    c("문지후", "10.09", "회원 앱"),
    c("배수아", "10.10", "회원 앱"),
    c("신예린", "10.11", "관리자 생성"),
    c("김도아", "10.12", "회원 앱"),
    { name: "윤서아", status: "waitlisted", detail: "대기 1번", result: "none", applied: "10.13", via: "회원 앱" },
    { name: "김하늘", status: "waitlisted", detail: "대기 2번 · 자리 나면 자동 확정 동의", result: "none", applied: "10.14", via: "회원 앱" },
  ],
  "S-1015-10": [
    c("김하늘", "10.09", "회원 앱"),
    c("정다은", "10.09", "회원 앱", "unknown", "수신 동의 없음"),
    c("윤서아", "10.10", "회원 앱"),
    c("류하준", "10.11", "회원 AI 도우미"),
    c("한서윤", "10.12", "회원 앱"),
    c("임도현", "10.13", "관리자 생성"),
  ],
  "S-1016-10": [
    { name: "강도윤", status: "cancelled", detail: "휴강 · 10/17(토) 09:00로 이동 신청", result: "none", applied: "10.06", via: "회원 AI 도우미" },
    ...["신예린", "오세린", "장민호", "김도아", "배수아"].map(
      (name, i): RosterEntry => ({ name, status: "cancelled", detail: "휴강 · 안내 완료", result: "none", applied: ["10.07", "10.08", "10.09", "10.10", "10.11"][i], via: "회원 앱" }),
    ),
  ],
  "S-1016-19": [
    c("박지민", "10.08", "회원 앱"),
    c("최유나", "10.09", "회원 앱"),
    c("서하린", "10.10", "회원 AI 도우미"),
    c("문지후", "10.11", "회원 앱"),
    c("류하준", "10.12", "회원 앱"),
    c("한서윤", "10.13", "관리자 생성"),
  ],
  "S-1017-09": [
    c("임도현", "10.10", "회원 앱"),
    c("신예린", "10.11", "회원 앱"),
    c("김도아", "10.12", "회원 AI 도우미"),
    { name: "강도윤", status: "pending", detail: "만료 10/16(금) 09:00 · 휴강 대체 이동", result: "none", applied: "10.14", via: "회원 앱" },
  ],
};

export const related: Record<string, Related[]> = {
  "S-1013-10": [{ actor: "ai", text: "대기 2명이 있었어요 · 화 10/20 10:00 회차 추가를 제안했어요", href: "/admin/approvals?id=apr-3", cta: "승인함에서 보기" }],
  "S-1014-14": [
    { actor: "ai", text: "홍서준님 노쇼 위험이 높아요 · 참석 확인 메시지를 준비했어요", href: "/admin/approvals", cta: "승인함에서 보기" },
    { actor: "ai", text: "홍서준님 토 09:00 기구 필라테스로 변경 요청 · 승인 대기", href: "/admin/approvals?id=apr-2", cta: "승인함에서 보기" },
  ],
  "S-1014-19": [{ actor: "system", text: "자리가 나면 '자리 나면 자동 확정'에 동의한 대기자부터 순번대로 확정돼요(16:00까지)" }],
  "S-1016-10": [
    { actor: "system", text: "휴강 · 확정했던 6명에게 안내했어요" },
    { actor: "human", actorLabel: "회원", text: "강도윤님 10/17(토) 09:00로 옮기기 신청 · 승인 대기", href: "/admin/bookings?tab=pending", cta: "예약에서 확인" },
  ],
  "S-1016-19": [{ actor: "ai", text: "김하늘님 2자리 신청(정다은님과 함께) · 승인 대기", href: "/admin/approvals?id=apr-1", cta: "승인함에서 보기" }],
  "S-1017-09": [{ actor: "human", actorLabel: "회원", text: "강도윤님 휴강 회차에서 옮기기 신청 1건 · 승인 대기", href: "/admin/bookings?tab=pending", cta: "예약에서 확인" }],
};

/* 와이어프레임 n39의 AI 제안 — 빈자리 안내는 위험 중간이라 승인 후 발송. */
export const suggestions: Record<string, Suggestion> = {
  "S-1015-10": {
    text: "이 회차는 2석이 비었어요. 최근 30일 그룹 필라테스 이용 회원 중 이 시간대를 자주 쓴 4명에게 빈자리를 안내할까요?",
    evidence: "근거: 최근 30일 목 10:00 이용 기록 · 수신 동의한 회원만",
  },
};

export const attendanceLog: Record<string, LogEvent[]> = {
  "S-1013-10": [
    { actor: "human", text: "홍지수 오너가 8명 이용 결과 기록", time: "10/13 11:02" },
    { actor: "system", text: "회차 종료 · 이용 결과 8명 미확인", time: "10/13 10:50" },
  ],
  "S-1014-10": [
    { actor: "human", text: "홍지수 오너가 이수연 출석으로 표시", time: "10:54" },
    { actor: "human", text: "홍지수 오너가 홍서준·강도윤 출석으로 표시", time: "10:53" },
    { actor: "system", text: "회차 종료 · 이용 결과 5명 미확인", time: "10:50" },
    { actor: "ai", text: "참석 확인 제안에서 정다은 제외 · 수신 동의 없음", time: "어제 10:00" },
  ],
  "S-1014-11": [
    { actor: "human", text: "홍지수 오너가 이수연 출석으로 표시", time: "11:52" },
    { actor: "system", text: "회차 종료 · 이용 결과 1명 미확인", time: "11:50" },
  ],
};

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export type Phase = "ended" | "upcoming" | "cancelled";

export function phaseOf(s: WeekSession): Phase {
  if (s.cancelled) return "cancelled";
  if (s.day < NOW.day) return "ended";
  if (s.day === NOW.day && toMinutes(s.time) + DURATION <= NOW.minutes) return "ended";
  return "upcoming";
}

export function sessionLabels(s: WeekSession) {
  const d = new Date(`${s.day}T00:00:00`);
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const end = fromMinutes(toMinutes(s.time) + DURATION);
  return {
    date: `${md}(${weekday[d.getDay()]})`,
    title: `${kindLabel[s.kind]} · ${md}(${weekday[d.getDay()]}) ${s.time}`,
    range: `${s.day.replaceAll("-", ".")} ${s.time}–${end}`,
    end,
    duration: `${DURATION}분`,
  };
}

export function getSession(id: string) {
  const s = weekSessions.find((x) => x.id === id);
  if (!s) return null;
  return {
    session: s,
    phase: phaseOf(s),
    labels: sessionLabels(s),
    roster: rosters[id] ?? [],
    related: related[id] ?? [],
    suggestion: suggestions[id] ?? null,
    log: attendanceLog[id] ?? [],
  };
}

export type SessionData = NonNullable<ReturnType<typeof getSession>>;
