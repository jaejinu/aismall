import { cn } from "@/lib/cn";

/* 회원 안내 화면 공통 틀 — 상태 칩 + 보낸 시각, 제목, 설명, 요약 상자 (Figma: Member 휴강·참석 확인·빈자리·대기 결과) */
export type NoticeTone = "info" | "success" | "warning" | "danger" | "neutral";

const toneCls: Record<NoticeTone, string> = {
  info: "bg-info-bg text-info-fg",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  neutral: "bg-neutral-bg text-neutral-fg",
};

export function NoticeHead({
  chip,
  tone,
  sentAt,
  title,
  desc,
}: {
  chip?: string;
  tone?: NoticeTone;
  sentAt?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {chip && <span className={cn("rounded-md px-2 py-0.5 text-label-sm", toneCls[tone ?? "neutral"])}>{chip}</span>}
        {sentAt && <span className="text-caption text-fg-muted">{sentAt}</span>}
      </div>
      <h1 className="text-h2 text-fg">{title}</h1>
      {desc && <p className="text-body-md text-fg-secondary">{desc}</p>}
    </div>
  );
}

export function InfoBox({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4 text-body-sm">
          <dt className="w-20 shrink-0 text-fg-secondary">{k}</dt>
          <dd className="flex-1 text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
