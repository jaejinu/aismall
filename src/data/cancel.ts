/*
 * 휴강 처리 — manyfast 와이어프레임 n42 기준. 휴강은 위험 높음이라 사업장 오너만 확정해요.
 * 확정하면 확정 예약은 '취소(휴강)'가 되고, 회원은 안내에서 대체 회차를 직접 골라요.
 * 기구·듀엣·1:1은 옮기기 신청이 예약 '승인 대기'로 들어가요(강도윤 → 10/17 09:00 예시).
 */
import { weekSessions, type WeekSession } from "./schedule";
import { kindLabel, sessionLabels } from "./sessions";

export const cancelReasons = ["강사 부재", "시설 점검", "최소 인원 미달", "기타"];

/* 이번 주 다음 회차에 더해, 기준 데이터의 다음 주 대체 회차 후보 */
const nextWeek: WeekSession[] = [{ id: "S-1019-10", day: "2026-10-19", time: "10:00", kind: "reformer", coach: "최서연", room: "B룸", booked: 2, capacity: 6 }];

export type Alternative = { id: string; label: string; left: number };

export function alternativesFor(target: WeekSession): Alternative[] {
  return [...weekSessions, ...nextWeek]
    .filter((s) => s.kind === target.kind && s.id !== target.id && !s.cancelled && !s.past)
    .filter((s) => s.day > target.day || (s.day === target.day && s.time > target.time))
    .filter((s) => s.capacity - s.booked > 0)
    .map((s) => {
      const l = sessionLabels(s);
      return { id: s.id, label: `${l.date} ${s.time} ${kindLabel[s.kind]}`, left: s.capacity - s.booked };
    });
}

/* 회원마다 남은 자리 순서대로 대체 회차를 제안해요. 자리가 모자라면 '직접 고르기'. */
export function assignAlternatives(names: string[], alts: Alternative[]) {
  const left = alts.map((a) => a.left);
  return names.map((name) => {
    const i = left.findIndex((n) => n > 0);
    if (i < 0) return { name, alt: null as Alternative | null };
    left[i] -= 1;
    return { name, alt: alts[i] };
  });
}

/* 이미 휴강한 S-1016-10의 처리 결과 (10/13 저녁 확정) */
export const doneResult = {
  "S-1016-10": {
    decidedAt: "10/13(화) 18:20 · 홍지수 사업장 오너",
    reason: "강사 부재",
    members: [
      { name: "강도윤", state: "10/17(토) 09:00로 옮기기 신청 · 승인 대기", href: "/admin/bookings?tab=pending" },
      { name: "신예린", state: "안내 완료 · 아직 고르지 않음" },
      { name: "오세린", state: "안내 완료 · 아직 고르지 않음" },
      { name: "장민호", state: "안내 완료 · 아직 고르지 않음" },
      { name: "김도아", state: "안내 완료 · 아직 고르지 않음" },
      { name: "배수아", state: "안내 완료 · 아직 고르지 않음" },
    ],
  },
} as Record<string, { decidedAt: string; reason: string; members: { name: string; state: string; href?: string }[] }>;
