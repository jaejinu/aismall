import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "설정 · 재진필라테스" };

/*
 * 설정 첫 화면 — Figma 화면 없음 · manyfast 와이어프레임 n124 기준.
 * 화면 표시는 한국어만(응대 지침·참고 자료·지켜보기 모드). 이용권·결제 관련 모듈은 v1에 없어요.
 */
type Item = { title: string; desc: string; href?: string; badge?: string };

const groups: { title: string; items: Item[] }[] = [
  {
    title: "사업장 운영",
    items: [
      { title: "사업장 운영정보", desc: "영업시간, 예약·취소 마감, 프로그램 기본 설정" },
      { title: "회원 앱·문의 페이지", desc: "회원 예약 링크와 QR, 문의 폼 항목, 회원 AI 도우미", href: "/admin/settings/member-app" },
      { title: "모듈 관리", desc: "Team · Automation · Analytics 켜기·끄기 · 지금 Automation·Analytics는 꺼져 있어요" },
      { title: "연결된 앱", desc: "Google Calendar 등 외부 앱 연결과 권한 범위 확인" },
    ],
  },
  {
    title: "AI",
    items: [
      { title: "AI 권한", desc: "업무 유형별 수준(제안만 · 승인 후 실행 · 자동 실행) · 강남점은 브랜드 기본값보다 좁히기만", href: "/admin/settings/ai" },
      { title: "응대 지침", desc: "AI 답변의 말투와 지켜야 할 규칙" },
      { title: "참고 자료", desc: "자주 묻는 질문, 방문 안내 등 AI 답변의 근거 자료" },
      { title: "고급 AI 설정", desc: "지켜보기 모드, 변경 미리보기, 정책 검사 세부 조정" },
    ],
  },
  {
    title: "데이터와 보안",
    items: [{ title: "원본 기록 조회", desc: "활동 기록 원본을 기간·주체·대상으로 조회하고 내보내기 · 최고관리자 재인증 필요", badge: "최고관리자" }],
  },
];

export default function SettingsPage() {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-h1 text-fg">설정</h1>
        <p className="text-body-md text-fg-secondary">강남점 · 사업장 오너 홍지수 · 내 권한으로 바꿀 수 있는 설정만 열려요</p>
      </header>
      {groups.map((g) => (
        <section key={g.title} className="flex max-w-[880px] flex-col gap-3">
          <h2 className="text-h3 text-fg">{g.title}</h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {g.items.map((it) => {
              const body = (
                <>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-label-md text-fg">
                      {it.title}
                      {it.badge && <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-caption text-neutral-fg">{it.badge}</span>}
                    </span>
                    <span className="text-body-sm text-fg-secondary">{it.desc}</span>
                  </span>
                  {it.href ? (
                    <ChevronRight size={16} className="shrink-0 text-fg-secondary" aria-hidden />
                  ) : (
                    <span className="shrink-0 text-caption text-fg-muted">준비 중</span>
                  )}
                </>
              );
              return (
                <li key={it.title} className="border-b border-line last:border-b-0">
                  {it.href ? (
                    <Link href={it.href} className="flex items-center gap-3 px-5 py-4 hover:bg-subtle">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-5 py-4">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
