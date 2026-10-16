'use client';
import {useState,useTransition} from 'react';
import {Bell,Info,RefreshCw,Clock,CheckCircle2,AlertCircle,LoaderCircle,ArrowRight} from 'lucide-react';
import {NotificationDeliveryCard} from './notification-delivery-card';
import {Button} from '@/components/ui/button';
import type {NotificationMonitor as Monitor,NotificationStatus} from '@/server/services/notification-monitor';
const statusStyle={pending:'bg-subtle text-fg-secondary',processing:'bg-info-bg text-info-fg',delivered:'bg-success-bg text-success-fg',dead:'bg-danger-bg text-danger-fg'};
const statusIcon={pending:Clock,processing:LoaderCircle,delivered:CheckCircle2,dead:AlertCircle};
const labels={all:'전체',pending:'대기',processing:'처리 중',delivered:'처리 완료',dead:'최종 실패'};
const events:Record<string,string>={'booking.confirmed':'예약 확정','booking.rescheduled':'회차 변경','booking.cancelled':'예약 취소'};
const resultLabels:Record<string,string>={
 recipient_suppressed:'이 지점 고객의 이전 이메일에 영구 반송 또는 스팸 신고가 있어 추가 발송을 차단했어요. 다시 처리해도 차단은 해제되지 않아요.',
 provider_accepted:'발송 서비스가 요청을 접수했어요. 전달 여부는 아래 전달 결과에서 확인해 주세요.',
 transport_temporary:'발송 서비스에 일시적인 문제가 있어요.',transport_permanent:'발송 설정 또는 수신 대상 문제로 발송 서비스가 요청을 거절했어요.',
 identity_unavailable:'인증 서비스에서 계정을 확인하지 못했어요.',identity_unverified:'현재 인증 이메일이 연결된 이메일과 다르거나 인증되지 않았어요.',
 inactive_scope:'조직 또는 지점이 비활성 상태여서 차단했어요.',superseded:'예약이 변경되어 이전 알림을 차단했어요.',expired_event:'요청이 24시간을 지났거나 수업이 시작되어 차단했어요.',
 recipient_unavailable:'회원 연결이 없거나 회수됐거나 계정이 비활성 상태예요.',consent_missing:'예약 이메일 수신에 동의하지 않아 차단했어요.',before_consent:'현재 수신 동의 전에 생성된 알림이어서 차단했어요.',channel_disabled:'이 지점의 이메일 발송이 꺼져 있어요.'
};
const errors={temporary:'일시 오류 · 다시 처리할 예정이에요.',permanent:'계속 처리할 수 없는 오류예요.',lease_expired:'처리 응답을 받지 못했어요.'};
const date=(v:string)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(v));
export function NotificationMonitor({initial,load,retry}:{retry:(id:string,generation:number)=>Promise<{error?:string}>;initial:Monitor;load:(status:NotificationStatus,page:number)=>Promise<{data?:Monitor;error?:string}>}) {
 const [data,setData]=useState<Monitor|null>(initial),[status,setStatus]=useState<NotificationStatus>(initial.status),[page,setPage]=useState(initial.page),[error,setError]=useState('');
 const [pending,start]=useTransition();
 const [notice,setNotice]=useState('');
 function redrive(item:Monitor['items'][number]){start(async()=>{
  setNotice('');
  try{const result=await retry(item.id,item.redrive_count);const latest=await load(status,page);setData(latest.data??null);setError(result.error??latest.error??'');if(!result.error)setNotice('다시 처리하도록 대기열에 넣었어요. 발송 조건을 확인한 뒤 처리해요.');}
  catch{setData(null);setError('결과를 확인하지 못했어요. 새로고침해 주세요.');}
 });}

 function refresh(nextStatus=status,nextPage=page){start(async()=>{try{const result=await load(nextStatus,nextPage);setData(result.data??null);setError(result.error??'');if(result.data){setStatus(nextStatus);setPage(nextPage);}}catch{setData(null);setError('잠시 후 다시 시도해 주세요.');}});}
 return <section className="space-y-5" aria-busy={pending}>
 <div className="flex items-center justify-between gap-3"><div><p className="mb-1 text-caption text-fg-muted">예약 안내 이메일</p><h2 className="text-h3">알림 현황</h2></div><Button disabled={pending} onClick={()=>refresh()} variant="secondary" className="min-h-11 border border-line bg-surface"><RefreshCw size={16} className={pending?'animate-spin':''}/>새로고침</Button></div>
 {notice&&<p role="status" className="rounded-xl bg-info-bg p-4 text-body-sm text-info-fg">{notice}</p>}
 {error&&<p role="alert" className="rounded-xl bg-danger-bg p-4 text-body-sm text-danger-fg">{error}</p>}
 {data&&<><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{(['pending','processing','delivered','dead'] as const).map(s=>{const Icon=statusIcon[s];return <button type="button" key={s} disabled={pending} onClick={()=>refresh(s,1)} aria-pressed={status===s} className={`rounded-2xl border p-4 text-left transition-colors hover:border-fg-muted disabled:opacity-60 ${status===s?'border-primary bg-subtle ring-1 ring-primary':'border-line bg-surface'}`}><div className="flex items-center gap-2"><Icon size={15} className="text-fg-muted"/><span className="text-label-sm text-fg-secondary">{labels[s]}</span></div><p className="mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{data.counts[s]}<span className="ml-1.5 text-caption font-normal text-fg-muted">건</span></p></button>;})}</div>
 {data.counts.expired>0&&<p className="rounded-xl bg-risk-medium-bg p-3 text-body-sm">응답 기한이 지난 요청 {data.counts.expired}건이 있어요. 다음 처리에서 복구 여부를 확인해요.</p>}</>}
 <div className="overflow-hidden rounded-2xl border border-line bg-surface">
 <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5"><label className="flex items-center gap-3 text-label-sm">처리 상태<select className="min-h-11 rounded-lg border border-line bg-surface px-3 py-2 text-body-sm" value={status} disabled={pending} onChange={e=>refresh(e.target.value as NotificationStatus,1)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><span className="text-caption text-fg-muted">최근 요청 순 · 한국 시간</span></div>
 {pending&&<p role="status" className="px-5 py-3 text-body-sm text-fg-muted">현황을 불러오고 있어요.</p>}
 {data&&<><ul className="divide-y divide-line">{data.items.map(item=><li key={item.id} className="p-4 sm:p-6">
 <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-label-md text-fg-secondary">{item.customer.slice(0,1)}</span><div className="min-w-0"><h3 className="break-words text-label-md">{item.customer}</h3><p className="mt-0.5 text-caption text-fg-muted">{events[item.event]??'예약 알림'} · {date(item.created_at)}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-caption ${statusStyle[item.status]}`}>{labels[item.status]}</span></div>
 <p className="mt-3 text-body-sm text-fg-secondary">{item.program} <span className="mx-1 text-fg-muted">/</span> {date(item.starts_at)}</p>
 <NotificationDeliveryCard delivery={item.delivery} accepted={item.last_result?.reason==='provider_accepted'||item.status==='delivered'}/>
 {item.last_result&&item.last_result.reason!=='provider_accepted'&&<div className={`mt-3 rounded-xl p-3 text-body-sm ${item.status==='dead'?'bg-danger-bg text-danger-fg':'bg-subtle text-fg-secondary'}`}><p className="text-label-sm">{item.last_result.generation!==item.redrive_count?'이전 처리에서 확인된 사항':'처리 안내'}</p><p className="mt-1 leading-relaxed">{resultLabels[item.last_result.reason]??'처리 결과를 확인해 주세요.'}</p></div>}
 {!item.last_result&&item.last_error&&<p className="mt-3 text-body-sm text-danger-fg">{errors[item.last_error]}</p>}
 {item.expired&&<p className="mt-2 text-body-sm text-fg-secondary">처리 응답 기한이 지났어요.</p>}
 {item.status==='pending'&&item.attempts>0&&<p className="mt-2 text-caption text-fg-muted">다음 처리 가능 시각 {date(item.available_at)}</p>}
 <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-line pt-3"><details className="min-w-0 flex-1 text-caption text-fg-muted"><summary className="w-fit cursor-pointer py-2 hover:text-fg">처리 이력·요청 정보</summary><div className="mt-2 space-y-2 rounded-xl bg-subtle p-3 leading-relaxed"><p>시도 {item.attempts}/5회 · 수동 재처리 {item.redrive_count}/3회</p>{item.last_result&&<p>최근 결과 {date(item.last_result.created_at)} · {item.last_result.generation===0?'최초 처리':`재처리 ${item.last_result.generation}회차`} · 시도 {item.last_result.attempt}회</p>}{item.finished_at&&<p>처리 종료 {date(item.finished_at)}</p>}<p className="break-all">예약 {item.booking_id} · 버전 {item.booking_version}</p><p className="break-all">요청 {item.id}</p></div></details>{item.can_redrive&&<Button variant="secondary" className="min-h-11" disabled={pending} onClick={()=>redrive(item)}>다시 처리 요청<ArrowRight size={14}/></Button>}</div>
 {item.status==='dead'&&!item.can_redrive&&<p className="mt-2 text-caption text-fg-muted">재처리 조건에 맞지 않아요. 최신 예약 상태와 요청 생성 시간을 확인해 주세요.</p>}
 </li>)}</ul>
 {!data.items.length&&<div className="flex flex-col items-center px-6 py-16 text-center"><span className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-line bg-canvas"><Bell size={23} className="text-fg-muted"/></span><p className="text-label-md">{status==='all'?'아직 알림 요청이 없어요':'조건에 맞는 알림 요청이 없어요'}</p><p className="mt-2 max-w-sm text-body-sm leading-relaxed text-fg-muted">예약 확정·변경·취소가 생기면<br/>이곳에서 처리 과정과 전달 결과를 확인할 수 있어요.</p></div>}
 <nav aria-label="알림 현황 페이지" className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5"><Button variant="ghost" className="min-h-11" disabled={pending||page<=1} onClick={()=>refresh(status,page-1)}>이전</Button><span className="text-caption text-fg-muted">{page}페이지 · 50건씩</span><Button variant="ghost" className="min-h-11" disabled={pending||!data.hasMore||page>=10000} onClick={()=>refresh(status,page+1)}>다음</Button></nav></>}
 </div>
 <details className="rounded-xl px-1 text-body-sm text-fg-muted"><summary className="flex w-fit cursor-pointer items-center gap-2 py-2"><Info size={16}/>알림 상태와 재처리 안내</summary><div className="mt-2 space-y-2 border-l-2 border-line pl-4 text-caption leading-relaxed"><p>처리 완료는 발송 요청의 완료예요. 실제 이메일 전달은 각 요청의 전달 결과를 확인해 주세요.</p><p>최종 실패는 생성 후 24시간 이내·일정 시작 전·최신 예약 상태일 때 최대 3회 재처리할 수 있어요. 각 재처리는 최대 5번 시도해요.</p><p>반송·스팸 신고로 차단된 고객은 재처리로 차단이 해제되지 않아요. 실제 발송 설정은 이 화면에서 제공하지 않아요.</p></div></details>
 </section>;
}
