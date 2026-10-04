import Link from "next/link";

const screens = [
  { href: "/admin/today", title: "오늘", desc: "관리자 데스크톱 · 브리핑, 오늘 회차, 승인 카드" },
  { href: "/admin/inbox", title: "문의함", desc: "관리자 데스크톱 · 대화 목록, AI 초안, 고객 요약" },
  { href: "/admin/approvals", title: "승인함", desc: "관리자 데스크톱 · AI 제안 대기열, 승인 카드, 처리된 요청" },
  { href: "/admin/bookings", title: "예약", desc: "관리자 데스크톱 · 예약 표, 승인 대기 회원 신청 확정·거절 (?tab=pending)" },
  { href: "/admin/programs", title: "프로그램·회차", desc: "관리자 데스크톱 · 프로그램 목록(정원·확정 방식·운영 지점·이번 주 현황), 상세·설정, 새 프로그램" },
  { href: "/admin/schedule", title: "일정", desc: "관리자 데스크톱 · 주간 회차 표, AI 편성 제안" },
  { href: "/admin/schedule/S-1014-10", title: "회차 상세", desc: "관리자 데스크톱 · 운영 상태, 신청자 목록, 빠른 변경, 관련 일 (주간 일정에서 회차를 누르면 열려요)" },
  { href: "/admin/schedule/S-1014-10/attendance", title: "출석부", desc: "관리자 데스크톱 · 이용 결과 기록(미확인·출석·노쇼), 미확인 모두 출석, 기록 이력" },
  { href: "/admin/settings", title: "설정", desc: "관리자 데스크톱 · 설정 목록(사업장 운영·AI·데이터와 보안)" },
  { href: "/admin/settings/member-app", title: "회원 앱·문의 페이지 설정", desc: "관리자 데스크톱 · 링크·QR, 회원 예약 열기, 문의 폼 항목, 회원 AI 도우미(유료 플랜), 미리보기" },
  { href: "/admin/members", title: "회원·고객", desc: "관리자 데스크톱 · 회원·문의 고객 목록, 상세(예약·문의 이력, AI 요약, 내부 메모)" },
  { href: "/admin/ai", title: "AI 관리", desc: "관리자 데스크톱 · 업무 유형별 AI 결과, 지켜보기 모드 4분류, 자동 실행 추천(미리보기로만)" },
  { href: "/admin/settings/ai", title: "AI 권한", desc: "관리자 데스크톱 · 업무 유형별 수준, 지점은 좁히기만, 끌 수 없는 규칙, 변경 미리보기·본인 확인 (?as=admin 최고관리자)" },
  { href: "/admin/activity", title: "활동 기록", desc: "관리자 데스크톱 · 누가 무엇을 언제 왜, 사건별 다시 보기(정책 결정·다음 행동)" },
  { href: "/mobile/push", title: "승인 알림 (관리자 모바일)", desc: "잠금 화면 푸시 → 승인 카드 (?hidden=1 내용 숨김)" },
  { href: "/mobile/approvals", title: "승인함 (관리자 모바일)", desc: "승인 카드 · 다시 확인 · 결과(일부 실패→다시 보내기) · 거절 시트 · 카드 상태 5종(?state=)" },
  { href: "/ask", title: "공개 문의 (비회원)", desc: "문의 폼 → 접수 완료 · 링크 다시 받기(10분 제한) · 문의 확인(?state=pending·answered·requested·expired)" },
  { href: "/member/home", title: "홈 (회원)", desc: "회원 모바일 · 다가오는 예약, 확인 중인 문의, 자리 있는 회차" },
  { href: "/member/schedule", title: "수업 (회원)", desc: "회원 모바일 · 주간 회차, 신청 시트, 대기 신청" },
  { href: "/member/bookings", title: "내 예약 (회원)", desc: "회원 모바일 · 다가오는 예약, 대기 중, 지난 이용" },
  { href: "/member/notifications", title: "내 알림 (회원)", desc: "회원 모바일 · 대기 결과, 빈자리, 참석 확인 알림" },
  { href: "/member/notices/attendance", title: "참석 확인 (회원)", desc: "참석할게요 / 못 가요(참석 확인 응답은 마감 후에도 바로 취소)" },
  { href: "/member/notices/open-seat", title: "빈자리 안내 (회원)", desc: "자리 잡기 시트, 예약됨, 이미 마감" },
  { href: "/member/notices/waitlist", title: "대기 결과 (회원)", desc: "자동 확정 안 됨 / ?state=auto 자동 확정됨" },
  { href: "/member/notices/cancelled-class", title: "휴강 안내 (회원 · 강도윤 예시)", desc: "옮길 회차 고르기, 취소" },
  { href: "/member/assistant", title: "AI 도우미 (회원)", desc: "회원 모바일 · 대화, 예약 초안, 담당자 연결 (시나리오 데모)" },
  { href: "/member/me", title: "내 정보 (회원)", desc: "회원 모바일 · 연락처, 수신 동의, 탈퇴 안내" },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-1">
        <p className="text-label-sm text-fg-muted">AI Small Business OS · 퍼블리싱</p>
        <h1 className="text-h1 text-fg">화면 목록</h1>
        <p className="text-body-md text-fg-secondary">Figma 디자인을 코드로 옮긴 화면이에요. 샘플 데이터 기준일은 2026-10-14(수)예요.</p>
      </header>
      <ul className="flex flex-col gap-2">
        {screens.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface p-4 hover:bg-subtle">
              <span className="text-label-md text-fg">{s.title}</span>
              <span className="text-body-sm text-fg-secondary">{s.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
