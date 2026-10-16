import {ArrowLeft,CalendarDays,Inbox,Info,Search} from 'lucide-react';
import Link from 'next/link';
import {NotificationMonitor} from '@/components/bookings/notification-monitor';
import {getNotificationMonitor} from '@/server/services/notification-monitor';
import {loadNotificationStatus,retryNotification} from '@/app/workspace/notification-actions';
import {RegistrationForm} from '@/components/bookings/registration-form';
import {SearchSelect} from '@/components/bookings/search-select';
import { BookingTabs } from '@/components/workspace/booking-tabs';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { currentSessionProvider } from '@/server/auth/current';
import { AuthenticationRequired } from '@/server/auth/session';
import { AccessDenied } from '@/server/access/tenant';
import { getDatabasePool } from '@/server/db/pool';
import { getBookings, BookingInputError, normalizeBookingFilters } from '@/server/services/bookings';
import { saveBookingOperation } from '@/app/workspace/booking-actions';
import { MemberAdministration } from '@/components/bookings/member-administration';
import { getMemberAdministration } from '@/server/services/member-bookings';
import { BookingRecord } from '@/components/bookings/booking-record';
const field='mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-body-md';
const box='rounded-2xl border border-line bg-surface p-4 sm:p-6';
const date=(v:string)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(v));
export default async function BookingsPage({params,searchParams}:{params:Promise<{tenantId:string;branchId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const scope=await params;
  const raw=await searchParams;
  const scalar=(key:string)=>typeof raw[key]==='string'?raw[key]:undefined;
  let filters;
  try {filters=normalizeBookingFilters({query:scalar('q'),status:scalar('status'),attendance:scalar('attendance'),from:scalar('from'),to:scalar('to'),page:scalar('page')===undefined?1:Number(scalar('page'))});}
  catch {return <section><p role="alert">검색 조건이나 날짜가 올바르지 않아요.</p><Link className="underline" href={`/workspace/${scope.tenantId}/branches/${scope.branchId}/bookings`}>검색 초기화</Link></section>;}
  const pageHref=(page:number)=>{const query=new URLSearchParams({q:filters.query,status:filters.status,attendance:filters.attendance,from:filters.from,to:filters.to,page:String(page)});return `?${query}#reservation-list`;};
  let data; let memberAdmin; let notificationStatus;
  try { data=await getBookings(getDatabasePool(),await currentSessionProvider(),scope,filters); if(data.canManage) {memberAdmin=await getMemberAdministration(getDatabasePool(),await currentSessionProvider(),scope);notificationStatus=await getNotificationMonitor(getDatabasePool(),await currentSessionProvider(),scope);} }
  catch(error) {
    if(error instanceof AuthenticationRequired) redirect('/login');
    if(error instanceof AccessDenied || error instanceof BookingInputError) notFound();
    return <p role="alert">예약 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>;
  }
  const manage=data.canManage;
  return <div className="space-y-6">
    <header className="space-y-5"><Link className="inline-flex items-center gap-1.5 text-label-sm text-fg-muted hover:text-fg" href={`/workspace/${scope.tenantId}`}><ArrowLeft size={14}/>운영 지점으로</Link><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-label-sm text-fg-secondary">{data.branch.name}</p><h1 className="text-h1">예약 관리</h1><p className="mt-2 text-body-sm text-fg-secondary">수업 일정부터 회원 신청까지, 오늘의 운영을 한곳에서.</p></div><span className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-caption text-fg-muted sm:inline-flex"><CalendarDays size={14}/>한국 시간 기준</span></div>
    <div className="grid grid-cols-2 gap-3"><div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4"><span className="hidden size-11 shrink-0 items-center justify-center rounded-xl sm:flex bg-info-bg text-info-fg"><CalendarDays size={21}/></span><div><p className="text-caption text-fg-muted">현재 검색 결과</p><p className="mt-1 text-label-md">예약 {data.bookings.length}건 <span className="font-normal text-fg-muted">· {filters.page}페이지</span></p></div></div>{memberAdmin?<div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4"><span className="hidden size-11 shrink-0 items-center justify-center rounded-xl sm:flex bg-risk-medium-bg text-risk-medium-fg"><Inbox size={21}/></span><div><p className="text-caption text-fg-muted">회원 신청</p><p className="mt-1 text-label-md">승인 대기 {memberAdmin.requests.length}{memberAdmin.requests.length===100?'+':''}건</p></div></div>:<div className="flex items-center gap-3 rounded-2xl border border-line p-4 text-body-sm text-fg-secondary"><Info size={18}/>조회 권한으로 이용 중이에요.</div>}</div>
    <p className="flex items-start gap-2 text-caption text-fg-muted"><Info size={15} className="mt-0.5 shrink-0"/>변경·취소는 시작 24시간 전까지 가능해요. 예약 알림은 아직 자동 발송되지 않아요.</p></header>
    {!manage && <p className="text-body-md">조회만 할 수 있어요. 등록·변경·취소·출석 기록은 관리자에게 요청해 주세요.</p>}
    <BookingTabs items={[
      {id:'reservations',label:'예약 목록',content:<>    <section id="reservation-list" className={box}>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-h3">예약 목록</h2><span className="text-caption text-fg-muted">최근 등록 순</span></div>
      <form key={JSON.stringify(filters)} method="get" className="mb-6 grid gap-4 rounded-xl bg-subtle p-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-label-sm">고객·프로그램 이름<input className={field} placeholder="고객 또는 프로그램 이름 검색" type="search" name="q" maxLength={120} defaultValue={filters.query} /></label>
        <label className="text-label-sm">예약 상태<select className={field} name="status" defaultValue={filters.status}><option value="all">전체</option><option value="confirmed">예약 확정</option><option value="cancelled">취소됨</option></select></label>
        <label className="text-label-sm">출석 상태<select className={field} name="attendance" defaultValue={filters.attendance}><option value="all">전체</option><option value="unrecorded">미기록</option><option value="attended">출석</option><option value="no_show">노쇼</option></select></label>
        <label className="text-label-sm">회차 시작일 · 부터<input className={field} type="date" name="from" defaultValue={filters.from} /></label>
        <label className="text-label-sm">회차 시작일 · 까지<input className={field} type="date" name="to" defaultValue={filters.to} /></label>
        <div className="flex items-end gap-4"><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-sm text-on-primary hover:bg-primary-hover"><Search size={16}/>검색하기</button><Link className="py-2 text-label-sm underline" href={`/workspace/${scope.tenantId}/branches/${scope.branchId}/bookings`}>검색 초기화</Link></div>
      </form>
      <p className="mb-4 text-caption text-fg-muted">{filters.page}페이지 · 최근 등록 순 · 페이지당 50건</p>
      <div className="hidden grid-cols-[1.2fr_1fr_1.2fr_100px_80px] gap-3 rounded-t-lg border border-line bg-subtle px-4 py-3 text-label-sm text-fg-muted md:grid"><span>회차 일시</span><span>회원·고객</span><span>프로그램</span><span>예약 상태</span><span>이용 결과</span></div><ul className="overflow-hidden rounded-xl border border-line md:rounded-t-none">{data.bookings.map(b=><BookingRecord key={b.id} scope={scope} booking={b} sessions={data.sessions} canManage={manage}/>)}</ul>
      {!data.bookings.length&&<div className="flex flex-col items-center gap-2 py-12 text-center"><CalendarDays size={30} className="mb-2 text-fg-muted"/><p className="text-label-md">조건에 맞는 예약이 없어요</p><p className="text-body-sm text-fg-muted">검색어나 날짜 범위를 바꿔 확인해 보세요.</p></div>}
      <nav aria-label="예약 목록 페이지" className="mt-5 flex gap-4 text-label-md">
        {filters.page>1&&<Link className="underline" href={pageHref(filters.page-1)}>이전 페이지</Link>}
        {data.hasNext&&filters.page<10000&&<Link className="underline" href={pageHref(filters.page+1)}>다음 페이지</Link>}
      </nav>
    </section></>},
      ...(memberAdmin?[{id:'pending',label:`승인 대기 ${memberAdmin.requests.length}${memberAdmin.requests.length===100?'+':''}`,content:<MemberAdministration scope={scope} data={data} links={memberAdmin.links} requests={memberAdmin.requests} mode="requests"/>}]:[]),
      {id:'sessions',label:'고객·프로그램·회차',content:<div className="space-y-5">    <section className={box}><h2 className="mb-4 text-h2">등록된 고객·프로그램</h2><div className="grid gap-4 sm:grid-cols-2"><div><h3 className="text-label-md">고객</h3><ul className="mt-2 space-y-1 text-body-sm">{data.customers.slice(0,200).map(c=><li key={c.id}>{c.name} · {c.id.slice(0,8)}</li>)}</ul>{!data.customers.length&&<p className="mt-2 text-body-sm">등록된 고객이 없어요.</p>}</div><div><h3 className="text-label-md">프로그램</h3><ul className="mt-2 space-y-1 text-body-sm">{data.programs.slice(0,200).map(p=><li key={p.id}>{p.name}</li>)}</ul>{!data.programs.length&&<p className="mt-2 text-body-sm">등록된 프로그램이 없어요.</p>}</div></div></section>
    <section className={box}><h2 className="mb-4 text-h2">예정 회차</h2><ul className="space-y-3">{data.sessions.slice(0,200).map(s=><li key={s.id} className="border-b border-line pb-3"><p className="text-label-md">{s.name} · {s.confirmed}/{s.capacity}명</p><p className="text-body-sm">{date(s.starts_at)} ~ {date(s.ends_at)}</p></li>)}</ul>{!data.sessions.length&&<p>예정된 회차가 없어요.</p>}</section>
</div>},
      ...(manage?[{id:'create',label:'새로 등록',content:<>    <div className="grid gap-5 lg:grid-cols-2">
      <section className={box}><h2 className="mb-4 text-h2">고객 등록</h2><RegistrationForm initialRequest={randomUUID()} action={saveBookingOperation.bind(null,scope,'customer')} label="고객 등록하기"><label className="block text-label-sm">고객 이름<input className={field} name="name" required maxLength={120} autoComplete="off" /></label></RegistrationForm></section>
      <section className={box}><h2 className="mb-4 text-h2">프로그램 등록</h2><RegistrationForm initialRequest={randomUUID()} action={saveBookingOperation.bind(null,scope,'program')} label="프로그램 등록하기"><label className="block text-label-sm">프로그램 이름<input className={field} name="name" required maxLength={120} /></label></RegistrationForm></section>
      <section className={box}><h2 className="mb-4 text-h2">회차 만들기</h2>{!data.programs.length?<p>프로그램을 먼저 등록해 주세요.</p>:<RegistrationForm initialRequest={randomUUID()} action={saveBookingOperation.bind(null,scope,'session')} label="회차 만들기"><SearchSelect scope={scope} kind="program" name="program" label="프로그램" initial={data.programs.map(p=>({id:p.id,label:p.name}))}/><label className="block text-label-sm">시작 · 한국 시간<input className={field} type="datetime-local" name="starts" required /></label><label className="block text-label-sm">종료 · 한국 시간<input className={field} type="datetime-local" name="ends" required /></label><label className="block text-label-sm">정원<input className={field} type="number" name="capacity" min={1} max={1000} defaultValue={1} required /></label></RegistrationForm>}</section>
      <section className={box}><h2 className="mb-4 text-h2">예약 확정</h2>{!data.customers.length||!data.sessions.length?<p>고객과 앞으로 열릴 회차를 먼저 등록해 주세요.</p>:<RegistrationForm initialRequest={randomUUID()} action={saveBookingOperation.bind(null,scope,'confirm')} label="예약 확정하기"><SearchSelect scope={scope} kind="customer" name="customer" label="고객" initial={data.customers.map(c=>({id:c.id,label:`${c.name} · ${c.id.slice(0,8)}`}))}/><SearchSelect scope={scope} kind="session" name="session" label="회차" initial={data.sessions.map(s=>({id:s.id,label:`${s.name} · ${date(s.starts_at)} · ${s.confirmed}/${s.capacity}명`,disabled:s.confirmed>=s.capacity}))}/><label className="flex gap-2 text-body-sm"><input type="checkbox" name="confirm" value="yes" required />선택한 고객의 예약을 확정해요.</label></RegistrationForm>}</section>
    </div></>}]:[]),
      ...(notificationStatus?[{id:'notifications',label:'알림 현황',content:<NotificationMonitor initial={notificationStatus} retry={retryNotification.bind(null,scope)} load={loadNotificationStatus.bind(null,scope)}/>}]:[]),
      ...(memberAdmin?[{id:'settings',label:'회원 신청 설정',content:<MemberAdministration scope={scope} data={data} links={memberAdmin.links} requests={memberAdmin.requests} mode="settings"/>}]:[]),
    ]}/>
    {[data.customers,data.programs,data.sessions].some(items=>items.length>200)&&<p role="status" className="text-caption text-fg-muted">현황 목록은 최대 200개를 표시해요. 등록 화면의 선택 검색은 지점 전체 데이터에서 찾아요.</p>}
  </div>;
}
