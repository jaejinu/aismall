/* 관리자 모바일 — 승인함 흐름(Figma Mobile Approvals 120:2). 데스크톱에서는 가운데 430px로 보여요. */
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-canvas sm:border-x sm:border-line">{children}</div>;
}
