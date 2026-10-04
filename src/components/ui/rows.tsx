import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle, XCircle, type LucideIcon } from "lucide-react";
import { ActorBadge, RiskBadge, type Actor, type RiskTier } from "./badges";
import { cn } from "@/lib/cn";

/* Figma: Schedule Row (11:2) — 오늘 회차 한 줄. 노쇼 위험은 관리자 화면에만, 점수 없이. */
export type Session = {
  time: string;
  duration: string;
  title: string;
  meta: string;
  capacity: string;
  remaining: string;
  risk?: string;
};

export function ScheduleRow({ s }: { s: Session }) {
  return (
    <div className="flex items-center gap-4 border-b border-line bg-surface px-4 py-3 last:border-b-0">
      <div className="flex w-14 shrink-0 flex-col gap-0.5">
        <span className="text-label-md text-fg">{s.time}</span>
        <span className="text-caption text-fg-muted">{s.duration}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label-md text-fg">{s.title}</span>
        <span className="truncate text-body-sm text-fg-secondary">{s.meta}</span>
      </div>
      {s.risk && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning-bg px-2 py-0.5 text-label-sm text-warning-fg">
          <AlertTriangle size={12} aria-hidden />
          {s.risk}
        </span>
      )}
      <div className="flex w-20 shrink-0 flex-col items-end gap-0.5">
        <span className="text-label-md text-fg">{s.capacity}</span>
        <span className="text-caption text-fg-secondary">{s.remaining}</span>
      </div>
    </div>
  );
}

/* Figma: Briefing Item (11:18) — 숫자는 실제 집계값만. 누르면 해당 화면으로. */
export function BriefingItem({
  icon: Icon,
  text,
  href,
  tone = "fg",
}: {
  icon: LucideIcon;
  text: string;
  href: string;
  tone?: "fg" | "warning" | "info" | "danger";
}) {
  const toneCls = { fg: "text-fg", warning: "text-warning-fg", info: "text-info-fg", danger: "text-danger-fg" }[tone];
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-md py-2 hover:bg-subtle">
      <Icon size={16} className={cn("shrink-0", toneCls)} aria-hidden />
      <span className="flex-1 text-body-md text-fg">{text}</span>
      <ArrowRight size={16} className="shrink-0 text-fg-secondary group-hover:text-fg" aria-hidden />
    </Link>
  );
}

/* Figma: Approval Queue Row (13:325) — 누르면 우측 패널의 승인 카드가 이 요청으로 바뀐다. */
export function ApprovalQueueRow({
  actor,
  risk,
  title,
  meta,
  selected,
  onSelect,
}: {
  actor: Actor;
  risk: RiskTier;
  title: string;
  meta: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-surface px-4 py-3 text-left hover:bg-subtle",
        selected ? "border-fg" : "border-line",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex gap-1">
          <ActorBadge actor={actor} />
          <RiskBadge tier={risk} />
        </span>
        <span className="text-label-md text-fg">{title}</span>
        <span className="text-caption text-fg-secondary">{meta}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-fg-secondary" aria-hidden />
    </button>
  );
}

/* Figma: Result Block (8:112) — 된 것(✓)·안 된 것(✕)·다음 행동(→)을 항상 함께. */
export function ResultBlock({
  title,
  tone = "warning",
  done,
  failed = [],
  actions,
}: {
  title: string;
  tone?: "warning" | "success";
  done: string[];
  failed?: string[];
  actions?: React.ReactNode;
}) {
  const head = tone === "warning" ? "bg-warning-bg text-warning-fg" : "bg-success-bg text-success-fg";
  const HeadIcon = tone === "warning" ? AlertTriangle : CheckCircle;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className={cn("flex items-center gap-2 rounded-md p-2 text-label-md", head)}>
        <HeadIcon size={16} aria-hidden />
        {title}
      </div>
      <ul className="flex flex-col gap-2">
        {done.map((d) => (
          <li key={d} className="flex items-center gap-2 text-body-sm text-fg">
            <CheckCircle size={16} className="shrink-0 text-success-fg" aria-label="된 것" />
            {d}
          </li>
        ))}
        {failed.map((f) => (
          <li key={f} className="flex items-center gap-2 text-body-sm text-fg">
            <XCircle size={16} className="shrink-0 text-danger-fg" aria-label="안 된 것" />
            {f}
          </li>
        ))}
      </ul>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          <ArrowRight size={16} className="text-fg-secondary" aria-label="다음 행동" />
          {actions}
        </div>
      )}
    </div>
  );
}

/* 오늘 화면 상단 수치 카드 */
export function StatCard({ label, value, tone = "fg" }: { label: string; value: string; tone?: "fg" | "info" | "warning" }) {
  const toneCls = { fg: "text-fg", info: "text-info-fg", warning: "text-warning-fg" }[tone];
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg border border-line bg-surface p-4">
      <span className="text-caption text-fg-secondary">{label}</span>
      <span className={cn("text-h2", toneCls)}>{value}</span>
    </div>
  );
}
