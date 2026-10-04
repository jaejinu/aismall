import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Flag,
  Info,
  Plug,
  Shield,
  Sparkles,
  User,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/* Figma: Actor Badge (6:39) — 행동 주체. 어디서나 같은 색·아이콘. */
export type Actor = "human" | "ai" | "automation" | "system" | "external";

const actorStyle: Record<Actor, { cls: string; icon: LucideIcon; label: string }> = {
  human: { cls: "bg-human-bg text-human-fg", icon: User, label: "사람" },
  ai: { cls: "bg-ai-bg text-ai-fg", icon: Sparkles, label: "AI" },
  automation: { cls: "bg-automation-bg text-automation-fg", icon: Zap, label: "Automation" },
  system: { cls: "bg-system-bg text-system-fg", icon: Cpu, label: "시스템" },
  external: { cls: "bg-external-bg text-external-fg", icon: Plug, label: "외부 앱" },
};

export function ActorBadge({ actor, label }: { actor: Actor; label?: string }) {
  const s = actorStyle[actor];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm", s.cls)}>
      <Icon size={12} aria-hidden />
      {label ?? s.label}
    </span>
  );
}

/* Figma: Risk Badge (6:56) — 색만으로 구분하지 않도록 방패 아이콘 + 등급 텍스트를 항상 함께. */
export type RiskTier = "low" | "medium" | "high" | "critical";

const riskStyle: Record<RiskTier, { cls: string; label: string }> = {
  low: { cls: "bg-risk-low-bg text-risk-low-fg", label: "위험 낮음" },
  medium: { cls: "bg-risk-medium-bg text-risk-medium-fg", label: "위험 중간" },
  high: { cls: "bg-risk-high-bg text-risk-high-fg", label: "위험 높음" },
  critical: { cls: "bg-risk-critical-bg text-risk-critical-fg", label: "위험 매우 높음" },
};

export function RiskBadge({ tier }: { tier: RiskTier }) {
  const s = riskStyle[tier];
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-label-sm", s.cls)}>
      <Shield size={12} aria-hidden />
      {s.label}
    </span>
  );
}

/* Figma: Status Chip (6:95) — 정책 문서의 승인 요청 상태와 1:1. */
export type Status =
  | "pending"
  | "confirmed"
  | "expired"
  | "superseded"
  | "partial"
  | "blocked"
  | "flagged";

const statusStyle: Record<Status, { cls: string; icon: LucideIcon; label: string }> = {
  pending: { cls: "bg-info-bg text-info-fg", icon: Clock, label: "승인 대기" },
  confirmed: { cls: "bg-success-bg text-success-fg", icon: CheckCircle, label: "확정" },
  expired: { cls: "bg-neutral-bg text-neutral-fg", icon: Clock, label: "만료" },
  superseded: { cls: "bg-neutral-bg text-neutral-fg", icon: Info, label: "내용 바뀜" },
  partial: { cls: "bg-warning-bg text-warning-fg", icon: AlertTriangle, label: "부분 실패" },
  blocked: { cls: "bg-danger-bg text-danger-fg", icon: XCircle, label: "차단" },
  flagged: { cls: "bg-danger-bg text-danger-fg", icon: Flag, label: "확인 필요" },
};

export function StatusChip({ status, label }: { status: Status; label?: string }) {
  const s = statusStyle[status];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-label-sm", s.cls)}>
      <Icon size={12} aria-hidden />
      {label ?? s.label}
    </span>
  );
}

/* Figma: AI Label (7:33) — AI가 만든 값·문장·제안 옆에. 숫자 신뢰도는 쓰지 않는다. */
export function AiLabel() {
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-ai-border bg-ai-bg px-2 py-0.5 text-label-sm text-ai-fg">
      <Sparkles size={12} aria-hidden />
      AI
    </span>
  );
}

/* 숫자 배지(메뉴 옆 처리할 건수) */
export function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1 text-label-sm text-fg">
      {count}
    </span>
  );
}
