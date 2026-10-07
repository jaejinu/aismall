import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import approvals from "@/assets/showcase/approvals.png";
import aiPermissions from "@/assets/showcase/ai-permissions.png";
import activity from "@/assets/showcase/activity.png";
import figmaFoundations from "@/assets/showcase/figma-foundations.png";
import cardA from "@/assets/showcase/test-a-card-a.png";
import cardB from "@/assets/showcase/test-a-card-b.png";
import cardC from "@/assets/showcase/test-a-card-c.png";
import mPush from "@/assets/showcase/m-push.png";
import mResult from "@/assets/showcase/m-result.png";
import memberHome from "@/assets/showcase/member-home.png";
import memberAssist from "@/assets/showcase/member-assist.png";
import mAdminToday from "@/assets/showcase/m-admin-today.png";
import mInboxDraft from "@/assets/showcase/m-inbox-draft.png";
import mInboxFlagged from "@/assets/showcase/m-inbox-flagged.png";

/*
 * 첫 화면 = 포트폴리오 소개. 위에서부터 한 줄 소개 → 문제와 결정(케이스) → 과정 → 전체 화면 목록.
 * 스크린샷은 src/assets/showcase (README도 같은 파일을 써요). 화면이 바뀌면 다시 찍어요.
 */

export const metadata: Metadata = {
  title: "AI Small Business OS · UX 포트폴리오",
  description: "AI가 제안하고 사람이 승인하는 예약 중심 운영 플랫폼 — 기획·디자인 시스템·퍼블리싱",
};

const GITHUB = "https://github.com/jaejinu/aismall";

type Screen = { href: string; title: string; desc: string };

const groups: { title: string; screens: Screen[] }[] = [
  {
    title: "관리자 · 데스크톱",
    screens: [
      { href: "/admin/today", title: "오늘", desc: "브리핑, 오늘 회차, 확인이 필요한 일" },
      { href: "/admin/inbox", title: "문의함", desc: "대화 목록, AI 답변 초안과 근거, 고객 요약" },
      { href: "/admin/approvals", title: "승인함", desc: "AI 제안 대기열, 승인 카드, 처리된 요청" },
      { href: "/admin/schedule", title: "일정", desc: "주간 회차 표, AI 편성 제안" },
      { href: "/admin/schedule/S-1014-14", title: "회차 상세", desc: "운영 상태, 신청자, 빠른 변경과 회원 안내" },
      { href: "/admin/schedule/S-1015-10/cancel", title: "휴강 처리", desc: "회원별 대체 회차, AI 안내문 초안, 확정 확인" },
      { href: "/admin/schedule/S-1014-10/attendance", title: "출석부", desc: "이용 결과 기록(미확인·출석·노쇼)" },
      { href: "/admin/bookings?tab=pending", title: "예약", desc: "상태별 예약, 승인 대기 회원 신청 확정·거절" },
      { href: "/admin/programs", title: "프로그램·회차", desc: "정원·확정 방식·마감, 프로그램 상세" },
      { href: "/admin/members", title: "회원·고객", desc: "회원·문의 고객, 상세(이력·AI 요약·메모)" },
      { href: "/admin/ai", title: "AI 관리", desc: "업무 유형별 결과, 지켜보기 모드, 자동 실행 추천" },
      { href: "/admin/activity", title: "활동 기록", desc: "누가·무엇을·왜, 사건 단위 다시 보기" },
      { href: "/admin/settings", title: "설정", desc: "운영정보·회원 앱·모듈·연결된 앱·AI 권한·응대 지침·참고 자료·고급 AI·원본 기록" },
      { href: "/admin/settings/ai?as=admin&preview=reminder", title: "AI 권한", desc: "업무 유형별 수준, 끌 수 없는 규칙, 바꾸기 전 미리보기" },
    ],
  },
  {
    title: "관리자 · 모바일",
    screens: [
      { href: "/mobile/today", title: "오늘", desc: "수치, 가장 급한 승인, AI 브리핑, 확인이 필요한 일, 오늘 회차" },
      { href: "/mobile/inbox", title: "문의함", desc: "대화, AI 초안은 사람이 고쳐서 보내기, 의심 요청은 직접 답장" },
      { href: "/mobile/schedule", title: "일정", desc: "이번 주 요일별 회차와 상태(잔여·마감·휴강·출석 미확인)" },
      { href: "/mobile/push", title: "승인 알림", desc: "잠금 화면 알림 → 승인 카드" },
      { href: "/mobile/approvals", title: "승인함", desc: "카드 · 실행 직전 다시 확인 · 결과 · 거절 · 상태 5종" },
      { href: "/mobile/approvals/apr-1?step=result", title: "실행 결과", desc: "예약은 확정, 메시지만 실패 → 다시 보내기" },
    ],
  },
  {
    title: "회원 · 공개",
    screens: [
      { href: "/member/home", title: "회원 홈", desc: "다가오는 예약, 확인 중인 문의, 자리 있는 회차" },
      { href: "/member/schedule", title: "수업", desc: "주간 회차, 신청 시트, 대기 신청" },
      { href: "/member/bookings", title: "내 예약", desc: "다가오는 예약, 대기 중, 지난 이용" },
      { href: "/member/assistant", title: "AI 도우미", desc: "대화로 찾고, 회원이 확인해야 예약돼요" },
      { href: "/member/notifications", title: "내 알림", desc: "대기 결과, 빈자리, 참석 확인" },
      { href: "/member/notices/attendance", title: "참석 확인", desc: "참석할게요 / 못 가요" },
      { href: "/member/notices/open-seat", title: "빈자리 안내", desc: "자리 잡기, 이미 마감" },
      { href: "/member/notices/cancelled-class", title: "휴강 안내", desc: "옮길 회차 고르기, 취소" },
      { href: "/member/me", title: "내 정보", desc: "연락처, 수신 동의(예약 안내·광고 분리)" },
      { href: "/ask", title: "공개 문의 (비회원)", desc: "문의 폼 → 접수 → 링크로 답변 확인" },
    ],
  },
];

const stats = [
  { value: "46", label: "퍼블리싱 화면" },
  { value: "90", label: "유저플로우 화면" },
  { value: "57", label: "Figma 컴포넌트" },
  { value: "55", label: "기능 명세" },
];

function Shot({ src, alt, className, priority }: { src: StaticImageData; alt: string; className?: string; priority?: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      priority={priority}
      sizes="(min-width: 1024px) 960px, 100vw"
      className={`h-auto w-full rounded-xl border border-line bg-surface shadow-sm ${className ?? ""}`}
    />
  );
}

function Phone({ src, alt }: { src: StaticImageData; alt: string }) {
  return <Image src={src} alt={alt} sizes="240px" className="h-auto w-full rounded-2xl border border-line bg-surface shadow-sm" />;
}

function Case({ no, title, problem, decision, children }: { no: string; title: string; problem: string; decision: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-line pt-10">
      <div className="flex flex-col gap-3 md:max-w-3xl">
        <p className="text-label-sm text-fg-muted">{no}</p>
        <h2 className="text-h2 text-fg">{title}</h2>
        <div className="flex flex-col gap-2 text-body-md">
          <p className="text-fg-secondary">
            <span className="mr-2 text-label-md text-fg">문제</span>
            {problem}
          </p>
          <div className="text-fg-secondary">
            <span className="mr-2 text-label-md text-fg">결정</span>
            {decision}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-14 px-4 py-12 md:py-16">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-label-sm text-fg-muted">UX 기획 · 디자인 시스템 · 퍼블리싱 포트폴리오</p>
          <h1 className="text-display text-fg">AI가 일하고, 사장님이 승인해요</h1>
          <p className="max-w-3xl text-body-lg text-fg-secondary">
            1~5인 필라테스·요가 스튜디오를 위한 운영 플랫폼 <b className="font-medium text-fg">AI Small Business OS</b>예요. 문의·예약·회차·고객을 한곳에서 다루고, 반복 업무는 AI가
            제안하고 사람이 승인해서 실행해요. 핵심은 자동화가 아니라 <b className="font-medium text-fg">AI가 무엇을 하려는지 이해하고 통제할 수 있는 경험</b>이에요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/approvals" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-label-md text-on-primary hover:bg-primary-hover">
            승인함부터 보기 <ArrowRight size={16} aria-hidden />
          </Link>
          <a href="#screens" className="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-label-md text-on-secondary hover:bg-secondary-hover">
            전체 화면 목록
          </a>
          <a href={GITHUB} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-label-md text-fg hover:bg-subtle">
            GitHub <ExternalLink size={16} aria-hidden />
          </a>
        </div>
        <Shot src={approvals} alt="관리자 승인함 — AI가 제안한 예약 요청과 승인 카드" priority />
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5 rounded-lg bg-subtle px-4 py-3">
              <dt className="order-2 text-caption text-fg-secondary">{s.label}</dt>
              <dd className="order-1 text-h2 text-fg">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-caption text-fg-muted">
          화면 데이터는 모두 샘플이에요(기준 2026-10-14 수 13:00, 재진필라테스 강남점). 사람과 연락처는 지어낸 것이고, 실제 AI·서버 연결은 2차 범위예요.
        </p>
      </header>

      <Case
        no="01 · 승인 카드"
        title="짧은 시간에 무엇이 바뀌는지 알 수 있게"
        problem="AI가 '예약 만들고 메시지 보내기'를 하려 할 때, 정보가 많으면 읽지 않고 승인하고 적으면 불안해서 누르지 못해요."
        decision={
          <p>
            같은 요청을 세 가지 밀도로 만들었어요. A는 전부 보여 주기, B는 한 줄 요약, C는 실행할 행동과 회원에게 갈 메시지만 보이고 근거는 펼쳐 보기예요. 사용성 테스트(Test A)로 고르기로 하고, 지금
            화면은 C안이에요.
          </p>
        }
      >
        <div className="grid grid-cols-3 gap-3 md:max-w-3xl md:gap-6">
          {[
            { src: cardA, label: "A · 전부" },
            { src: cardB, label: "B · 요약" },
            { src: cardC, label: "C · 핵심 + 근거 펼치기" },
          ].map((c) => (
            <figure key={c.label} className="flex flex-col gap-2">
              <Phone src={c.src} alt={`승인 카드 ${c.label}`} />
              <figcaption className="text-caption text-fg-secondary">{c.label}</figcaption>
            </figure>
          ))}
        </div>
      </Case>

      <Case
        no="02 · 실행 결과"
        title="실패를 숨기지 않아요"
        problem="승인 후 예약은 됐는데 알림톡만 실패하면, '처리 완료'만 보여서는 회원이 안내를 못 받은 걸 아무도 몰라요."
        decision={<p>실행 직전에 정원·정책·연결을 다시 확인하고, 결과는 &lsquo;된 것 · 안 된 것 · 다음 행동&rsquo;으로 보여 줘요. 실패한 메시지만 다시 보낼 수 있어요.</p>}
      >
        <div className="grid grid-cols-2 gap-3 md:max-w-xl md:gap-6">
          <figure className="flex flex-col gap-2">
            <Phone src={mPush} alt="잠금 화면 승인 알림" />
            <figcaption className="text-caption text-fg-secondary">잠금 화면 알림 → 카드</figcaption>
          </figure>
          <figure className="flex flex-col gap-2">
            <Phone src={mResult} alt="실행 결과 — 예약은 확정, 메시지만 실패" />
            <figcaption className="text-caption text-fg-secondary">예약 확정 · 메시지 실패 → 다시 보내기</figcaption>
          </figure>
        </div>
      </Case>

      <Case
        no="03 · AI 권한"
        title="권한은 좁히기만, 어떤 규칙은 끌 수 없게"
        problem="지점마다 AI를 다르게 쓰고 싶지만, 한 지점의 설정 실수가 회원에게 그대로 가면 안 돼요."
        decision={
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>자동 실행은 위험 낮음만. 위험 중간은 같은 유형을 묶어 승인하고, 예약 생성·변경·취소는 항상 승인 후 실행해요.</li>
            <li>브랜드 기본값(최고관리자) 아래에서 지점(사업장 오너)은 더 좁히기만 해요.</li>
            <li>수신 동의 없는 회원에게 메시지, 노쇼 위험을 이유로 한 예약 제한은 설정으로도 바꿀 수 없어요.</li>
          </ul>
        }
      >
        <Shot src={aiPermissions} alt="AI 권한 — 업무 유형별 수준, 끌 수 없는 규칙, 변경 미리보기" />
      </Case>

      <Case
        no="04 · 활동 기록"
        title="누가, 무엇을, 왜 했는지 다시 볼 수 있게"
        problem="AI·직원·회원·시스템이 같은 예약을 건드리면, 문제가 생겼을 때 어디서 틀어졌는지 찾기 어려워요."
        decision={<p>모든 행동을 주체와 사건 ID로 묶어 기록하고, 사건 하나를 단계·정책 결정·다음 행동 순서로 다시 볼 수 있게 했어요.</p>}
      >
        <Shot src={activity} alt="활동 기록 — 사건 단위 다시 보기" />
      </Case>

      <Case
        no="05 · 회원 앱"
        title="회원은 직접, 확인도 회원이"
        problem="회원이 AI와 대화로 예약할 때, AI가 대신 예약을 확정해 버리면 회원은 무엇이 됐는지 모를 수 있어요."
        decision={<p>회원은 수업을 직접 신청·변경·취소하고, AI 도우미는 예약 초안만 만들어요. 회원이 버튼을 눌러야 예약돼요. 기구·1:1처럼 관리자 확인 프로그램은 &lsquo;승인 대기&rsquo;로 들어가요.</p>}
      >
        <div className="grid grid-cols-2 gap-3 md:max-w-xl md:gap-6">
          <figure className="flex flex-col gap-2">
            <Phone src={memberHome} alt="회원 홈" />
            <figcaption className="text-caption text-fg-secondary">회원 홈</figcaption>
          </figure>
          <figure className="flex flex-col gap-2">
            <Phone src={memberAssist} alt="회원 AI 도우미" />
            <figcaption className="text-caption text-fg-secondary">AI 도우미</figcaption>
          </figure>
        </div>
      </Case>

      <Case
        no="06 · 관리자 모바일"
        title="수업 사이에 폰으로, 넓은 일은 PC로"
        problem="사장님은 수업 중간이나 이동 중에 폰으로 확인해요. 모든 메뉴를 작은 화면에 넣으면 정작 급한 일을 못 찾아요."
        decision={
          <p>
            모바일은 오늘·승인함·문의함·일정 네 가지만 깊게 만들고, 설정·활동 기록처럼 넓은 화면이 필요한 메뉴는 PC로 연결해요(PC로 열린다는 표시를 붙였어요). 문의 답장은 AI 초안을 사람이 고쳐서 보내고,
            지시를 바꾸려는 의심 문의에는 초안을 만들지 않아요.
          </p>
        }
      >
        <div className="grid grid-cols-3 gap-3 md:max-w-3xl md:gap-6">
          {[
            { src: mAdminToday, label: "오늘 · 급한 승인과 브리핑" },
            { src: mInboxDraft, label: "AI 초안 · 사람이 보내요" },
            { src: mInboxFlagged, label: "의심 문의 · 초안 없이 직접" },
          ].map((c) => (
            <figure key={c.label} className="flex flex-col gap-2">
              <Phone src={c.src} alt={`관리자 모바일 ${c.label}`} />
              <figcaption className="text-caption text-fg-secondary">{c.label}</figcaption>
            </figure>
          ))}
        </div>
      </Case>

      <section className="flex flex-col gap-5 border-t border-line pt-10">
        <div className="flex flex-col gap-2">
          <p className="text-label-sm text-fg-muted">과정</p>
          <h2 className="text-h2 text-fg">기획에서 퍼블리싱까지 한 기준 데이터로</h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-2">
          {[
            ["기획", "PRD·요구사항 17·기능 55·스펙 31·정책 8을 정리하고, 외부 검토 의견 15건(D-01~D-15)을 반영했어요. 유저플로우 화면 90개, 와이어프레임까지."],
            ["디자인 시스템", "Figma 변수(색 라이트·다크, 간격, 반경), 텍스트 스타일 10개, 컴포넌트 57개. 화면은 모두 변수·스타일에 연결했어요."],
            ["사용성 테스트 준비", "승인 카드 A/B/C안 비교(Test A) — 계획, 모집 공고, 동의서, 진행 대본, 기록 양식, 결과 집계."],
            ["퍼블리싱", "Figma 변수를 CSS 토큰으로 1:1 옮기고, 모든 화면이 같은 기준 데이터를 써서 화면끼리 숫자와 사람이 맞아요."],
          ].map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-5">
              <span className="text-label-sm text-fg-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-h3 text-fg">{t}</span>
              <span className="text-body-sm text-fg-secondary">{d}</span>
            </li>
          ))}
        </ol>
        <figure className="flex flex-col gap-2 md:max-w-xl">
          <Shot src={figmaFoundations} alt="Figma 디자인 시스템 — 색 변수(라이트)" />
          <figcaption className="text-caption text-fg-secondary">Figma 색 변수 · 라이트 모드 (다크 모드도 있어요)</figcaption>
        </figure>
        <p className="text-body-sm text-fg-secondary">
          Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Vercel. 도구는 Figma, manyfast(기획 문서), Claude Code(AI 페어 프로그래밍)를 썼어요.
        </p>
      </section>

      <section id="screens" className="flex scroll-mt-8 flex-col gap-6 border-t border-line pt-10">
        <div className="flex flex-col gap-2">
          <p className="text-label-sm text-fg-muted">전체 화면</p>
          <h2 className="text-h2 text-fg">직접 눌러 보세요</h2>
          <p className="text-body-sm text-fg-secondary">새로고침하면 처음 상태로 돌아가요.</p>
        </div>
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-2">
            <h3 className="text-h3 text-fg">{g.title}</h3>
            <ul className="grid gap-2 md:grid-cols-2">
              {g.screens.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="flex h-full flex-col gap-0.5 rounded-lg border border-line bg-surface p-4 hover:bg-subtle">
                    <span className="text-label-md text-fg">{s.title}</span>
                    <span className="text-body-sm text-fg-secondary">{s.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <footer className="flex flex-col gap-1 border-t border-line pt-6 text-caption text-fg-muted">
        <p>
          AI Small Business OS · <a href={GITHUB} className="text-link hover:underline">GitHub</a>
        </p>
        <p>샘플 브랜드 &lsquo;재진필라테스&rsquo;와 등장인물은 모두 지어낸 것이에요.</p>
      </footer>
    </main>
  );
}
