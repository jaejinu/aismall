/* 공개 문의 페이지 — 가입 없이 쓰는 모바일 페이지(회원 하단 탭 없음). 데스크톱에서는 가운데 430px로 보여요. */
export default function AskLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-canvas sm:border-x sm:border-line">{children}</div>;
}
