import { CheckCircle, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/* 공개 문의 페이지 공통 — 가입 없이 쓰는 모바일 페이지. 회원 하단 탭은 없어요. */
export function AskHeader({ title }: { title: string }) {
  return (
    <header className="flex flex-col gap-0.5 bg-surface px-4 pb-3 pt-4">
      <h1 className="text-h3 text-fg">{title}</h1>
      <p className="text-caption text-fg-muted">재진필라테스 강남점</p>
    </header>
  );
}

export function AskHero({ icon: Icon = CheckCircle, tone = "info", title, desc }: { icon?: LucideIcon; tone?: "info" | "neutral"; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2 pt-6 text-center">
      <span className={cn("flex size-10 items-center justify-center rounded-full", tone === "info" ? "bg-info-bg text-info-fg" : "bg-subtle text-fg-secondary")}>
        <Icon size={18} aria-hidden />
      </span>
      <h2 className="text-h2 text-fg">{title}</h2>
      <p className="text-body-md text-fg-secondary">{desc}</p>
    </div>
  );
}

export function AskNote({ children, icon: Icon = Clock }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function AskActions({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-canvas px-4 pb-6 pt-3">{children}</div>;
}

export const askPrimary =
  "flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-primary text-label-md text-on-primary hover:bg-primary-hover disabled:cursor-default disabled:bg-muted disabled:text-fg-muted";
export const askSecondary = "flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-secondary text-label-md text-on-secondary hover:bg-secondary-hover";
export const askGhost = "flex h-11 w-full cursor-pointer items-center justify-center rounded-md text-label-md text-fg hover:bg-subtle";

export function Summary({ rows, chip }: { rows: [string, string][]; chip: { label: string; cls: string } }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center">
        <h3 className="flex-1 text-label-md text-fg">보낸 문의</h3>
        <span className={cn("rounded-full px-2 py-0.5 text-label-sm", chip.cls)}>{chip.label}</span>
      </div>
      <dl className="flex flex-col gap-1.5 text-body-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="shrink-0 text-fg-secondary">{k}</dt>
            <dd className="text-right text-fg">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
