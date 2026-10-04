import { CheckCircle, Clock } from "lucide-react";
import { programLabel, type MemberSession } from "@/data/member";
import { cn } from "@/lib/cn";

/*
 * Figma: Session Card (19:109) — 회원용 회차 카드.
 * 잔여석 2석 이하는 경고색, 마감은 대기 신청(알림만, 자리를 차지하지 않음), 예약함은 내 회차.
 */
export function SessionCard({ s, onAction }: { s: MemberSession; onAction?: (s: MemberSession) => void }) {
  const left = s.capacity - s.booked;

  let status: React.ReactNode;
  let action: React.ReactNode = null;
  switch (s.state) {
    case "booked":
      status = (
        <span className="inline-flex items-center gap-1 text-label-sm text-success-fg">
          <CheckCircle size={12} aria-hidden />
          예약함
        </span>
      );
      break;
    case "requested":
      status = (
        <span className="inline-flex items-center gap-1 text-label-sm text-info-fg">
          <Clock size={12} aria-hidden />
          승인 대기 · 관리자 확인 후 확정돼요
        </span>
      );
      break;
    case "waitlisted":
      status = (
        <span className="inline-flex items-center gap-1 text-label-sm text-info-fg">
          <Clock size={12} aria-hidden />
          대기 {s.myWaitNo}번 · 자리 나면 알려 드려요
        </span>
      );
      break;
    case "cancelled":
      status = <span className="text-label-sm text-danger-fg">휴강 · 대체 회차를 확인해 주세요</span>;
      break;
    case "full":
      status = <span className="text-label-sm text-fg-muted">마감 · 대기 {s.waitlist ?? 0}명</span>;
      action = (
        <button type="button" onClick={() => onAction?.(s)} className="shrink-0 cursor-pointer rounded-md bg-secondary px-3 py-1 text-label-sm text-on-secondary hover:bg-secondary-hover">
          자리 나면 알림
        </button>
      );
      break;
    default:
      status = <span className={cn("text-label-sm", left <= 2 ? "text-warning-fg" : "text-fg-secondary")}>{left}자리 남음</span>;
      action = (
        <button type="button" onClick={() => onAction?.(s)} className="shrink-0 cursor-pointer rounded-md bg-primary px-3 py-1 text-label-sm text-on-primary hover:bg-primary-hover">
          신청
        </button>
      );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-surface px-4 py-3",
        s.state === "booked" ? "border-success-fg/40" : "border-line",
        s.state === "cancelled" && "opacity-70",
      )}
    >
      <div className="flex w-12 shrink-0 flex-col gap-0.5">
        <span className="text-label-md text-fg">{s.time}</span>
        <span className="text-caption text-fg-muted">50분</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label-md text-fg">{programLabel[s.kind]}</span>
        <span className="text-caption text-fg-secondary">
          {s.coach} · {s.room}
        </span>
        {status}
      </div>
      {action}
    </div>
  );
}
