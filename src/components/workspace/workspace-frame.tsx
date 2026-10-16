'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Building2,ClipboardList,ChevronRight,User,ArrowUpRight,Layers} from 'lucide-react';
import type {ReactNode} from 'react';
export function WorkspaceFrame({children,logout}:{children:ReactNode;logout:ReactNode}) {
 const path=usePathname();
 if(path==='/workspace/member')return <div className="min-h-screen bg-subtle text-fg"><div className="mx-auto min-h-screen max-w-[430px] bg-canvas sm:border-x sm:border-line">{children}</div></div>;
 const booking=path.endsWith('/bookings');
 return <div className="flex min-h-screen bg-canvas text-fg">
 <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
 <Link href="/workspace" className="mb-10 flex items-center gap-3 px-2"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-on-primary"><Layers size={21}/></span><span className="text-label-md">Small Business<span className="mt-0.5 block text-caption text-fg-muted">사업장 운영 워크스페이스</span></span></Link>
 <p className="mb-3 px-3 text-caption text-fg-muted">워크스페이스</p><nav className="space-y-1.5" aria-label="운영 메뉴"><Link className="flex items-center gap-3 rounded-lg p-3 text-body-sm text-fg-secondary hover:bg-subtle" href="/workspace"><Building2 size={18}/>조직·지점</Link>{booking&&<Link className="flex items-center gap-3 rounded-lg bg-primary p-3 text-label-sm text-on-primary" href={path} aria-current="page"><ClipboardList size={18}/>예약 관리<ChevronRight size={14} className="ml-auto"/></Link>}</nav>
 <div className="mt-auto space-y-4"><Link className="flex items-center gap-3 rounded-xl border border-line p-3 text-body-sm text-fg-secondary hover:bg-subtle" href="/workspace/member"><User size={18}/><span>회원 화면 보기</span><ArrowUpRight size={16} className="ml-auto"/></Link><div className="border-t border-line pt-4">{logout}</div></div></aside>
 <div className="min-w-0 flex-1"><header className="flex min-h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-8"><div className="flex items-center gap-2 text-label-sm"><Link href="/workspace" className="text-fg-muted">내 사업장</Link>{booking&&<><ChevronRight size={14} className="text-fg-muted"/><span>예약 관리</span></>}</div><div className="flex items-center gap-3"><Link href="/workspace/member" className="hidden items-center gap-1 text-label-sm text-fg-secondary sm:flex">회원 화면<ArrowUpRight size={14}/></Link><div className="lg:hidden">{logout}</div><span className="hidden rounded-full border border-line px-3 py-1 text-caption text-fg-muted lg:block">운영 워크스페이스</span></div></header><main className={booking?'mx-auto max-w-[1440px] p-4 sm:p-8 xl:p-10':'mx-auto max-w-4xl px-5 py-10 sm:px-8'}>{children}</main></div></div>;
}
