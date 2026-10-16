'use client';
import {useState,useTransition} from 'react';
import {Bell,Info,RefreshCw,Clock,CheckCircle2,AlertCircle,LoaderCircle,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {NotificationMonitor as Monitor,NotificationStatus} from '@/server/services/notification-monitor';
const statusStyle={pending:'bg-subtle text-fg-secondary',processing:'bg-info-bg text-info-fg',delivered:'bg-success-bg text-success-fg',dead:'bg-danger-bg text-danger-fg'};
const statusIcon={pending:Clock,processing:LoaderCircle,delivered:CheckCircle2,dead:AlertCircle};
const labels={all:'전체',pending:'대기',processing:'처리 중',delivered:'처리 완료',dead:'최종 실패'};
const events:Record<string,string>={'booking.confirmed':'예약 확정','booking.rescheduled':'회차 변경','booking.cancelled':'예약 취소'};
const resultLabels:Record<string,string>={
 provider_accepted:'발송 서비스가 요청을 접수했어요. 실제 수신함 도착 여부는 아직 확인하지 않아요.',
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
  try{const result=await retry(item.id,item.redrive_count);const latest=await load(status,page);setData(latest.data??null);setError(result.error??latest.error??'');if(!result.error)setNotice('다시 처리하도록 대기열에 넣었어요. 실제 발송은 아직 연결되지 않았어요.');}
  catch{setData(null);setError('결과를 확인하지 못했어요. 새로고침해 주세요.');}
 });}

 function refresh(nextStatus=status,nextPage=page){start(async()=>{try{const result=await load(nextStatus,nextPage);setData(result.data??null);setError(result.error??'');if(result.data){setStatus(nextStatus);setPage(nextPage);}}catch{setData(null);setError('잠시 후 다시 시도해 주세요.');}});}
 return <section className="space-y-6 rounded-2xl border border-line bg-surface p-4 sm:p-6" aria-busy={pending}>
 <div className="flex items-center justify-between gap-3"><div><p className="mb-1 text-caption text-fg-muted">예약 변경에 따른 알림 요청</p><h2 className="text-h3">알림 처리 현황</h2></div><Button disabled={pending} onClick={()=>refresh()} variant="secondary"><RefreshCw size={16}/>새로고침</Button></div>
 <div className="flex gap-3 rounded-xl border border-line bg-subtle p-4 text-body-sm text-fg-secondary"><Info size={18} className="shrink-0"/><div><p className="text-label-sm text-fg">실제 발송은 준비 중이에요</p><p className="mt-1 text-body-sm">예약 변경으로 생성된 요청을 확인할 수 있어요. 대기 중인 요청은 아직 문자·메일로 발송되지 않아요.</p></div></div>
 {notice&&<p role="status" className="text-body-sm">{notice}</p>}
 {error&&<p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
 {data&&<><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{(['pending','processing','delivered','dead'] as const).map(s=>{const Icon=statusIcon[s];return <button type="button" key={s} disabled={pending} onClick={()=>refresh(s,1)} aria-pressed={status===s} className={`rounded-xl border p-4 text-left transition-colors hover:bg-subtle disabled:opacity-60 ${status===s?'border-primary bg-subtle':'border-line bg-surface'}`}><div className="flex items-center justify-between gap-2"><p className="text-label-sm text-fg-secondary">{labels[s]}</p><span className={`rounded-lg p-2 ${statusStyle[s]}`}><Icon size={16}/></span></div><p className="mt-3 text-h1 tabular-nums">{data.counts[s]}<span className="ml-1 text-caption font-normal text-fg-muted">건</span></p></button>;})}</div>
 {data.counts.expired>0&&<p className="rounded-lg bg-risk-medium-bg p-3 text-body-sm">응답 기한이 지난 요청 {data.counts.expired}건이 있어요. 워커가 실행되면 다시 처리하거나 최종 실패로 분류해요.</p>}</>}
 <div className="flex flex-wrap items-end gap-3"><label className="text-label-sm">처리 상태<select className="mt-1 block rounded-lg border border-line bg-surface px-3 py-2" value={status} disabled={pending} onChange={e=>refresh(e.target.value as NotificationStatus,1)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p className="pb-2 text-caption text-fg-muted">최근 생성 순 · 50건씩 · 한국 시간</p></div>
 {pending&&<p role="status" className="text-body-sm">현황을 불러오고 있어요.</p>}
 {data&&<><ul className="divide-y divide-line overflow-hidden rounded-xl border border-line empty:hidden">{data.items.map(item=><li key={item.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-label-md">{item.customer} · {events[item.event]??'예약 알림'}</h3><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm ${statusStyle[item.status]}`}><span className="size-1.5 rounded-full bg-current"/>{labels[item.status]}</span></div><p className="mt-2 text-body-sm">{item.program} · {date(item.starts_at)}</p><p className="mt-1 text-caption text-fg-muted">생성 {date(item.created_at)} · 시도 {item.attempts}/5회</p>{!item.last_result&&item.last_error&&<p className={`mt-3 rounded-lg px-3 py-2 text-body-sm ${statusStyle[item.status]}`}>{errors[item.last_error]}</p>}{item.last_result&&<div className="mt-3 rounded-xl bg-subtle p-3"><p className="text-label-sm">최근 처리 결과</p><p className="mt-1 text-body-sm text-fg-secondary">{resultLabels[item.last_result.reason]??'처리 결과를 확인해 주세요.'}</p><p className="mt-2 text-caption text-fg-muted">{date(item.last_result.created_at)} · {item.last_result.generation===0?'최초 처리':`재처리 ${item.last_result.generation}회차`} · 시도 {item.last_result.attempt}회</p>{item.last_result.generation!==item.redrive_count&&<p className="mt-1 text-caption text-fg-muted">이전 재처리 회차의 기록이에요.</p>}</div>}{item.expired&&<p className="mt-2 text-body-sm">처리 응답 기한이 지났어요.</p>}{item.status==='pending'&&item.attempts>0&&<p className="mt-2 text-caption text-fg-muted">다음 처리 가능 시각 {date(item.available_at)}</p>}{item.finished_at&&<p className="mt-2 text-caption text-fg-muted">처리 종료 {date(item.finished_at)}</p>}{item.can_redrive&&<Button className="mt-3" variant="secondary" disabled={pending} onClick={()=>redrive(item)}>다시 처리 요청<ArrowRight size={14}/></Button>}{item.status==='dead'&&!item.can_redrive&&<p className="mt-2 text-caption text-fg-muted">재처리 조건에 맞지 않아요. 최신 예약 상태와 요청 생성 시간을 확인해 주세요.</p>}<p className="mt-2 text-caption text-fg-muted">수동 재처리 {item.redrive_count}/3회</p><details className="mt-3 text-caption text-fg-muted"><summary className="cursor-pointer">요청 식별 정보</summary><p className="mt-2 break-all">예약 {item.booking_id} · 버전 {item.booking_version}</p><p className="break-all">요청 {item.id}</p></details></li>)}</ul>
 {!data.items.length&&<div className="rounded-lg border border-dashed border-line p-8 text-center"><Bell size={28} className="mx-auto mb-3 text-fg-muted"/><p className="text-label-md">조건에 맞는 알림 요청이 없어요</p><p className="mt-2 text-body-sm text-fg-muted">대기열 적용 이후의 예약 확정·변경·취소부터 기록돼요.</p></div>}
 <nav aria-label="알림 현황 페이지" className="flex items-center gap-3"><Button variant="secondary" disabled={pending||page<=1} onClick={()=>refresh(status,page-1)}>이전</Button><span className="text-body-sm">{page}페이지</span><Button variant="secondary" disabled={pending||!data.hasMore||page>=10000} onClick={()=>refresh(status,page+1)}>다음</Button></nav></>}
 <p className="border-t border-line pt-4 text-caption leading-relaxed text-fg-muted">최종 실패는 생성 후 24시간 이내·일정 시작 전·최신 예약 상태일 때 최대 3회 재처리할 수 있어요. 각 재처리는 최대 5번 시도해요. 실제 발송 설정은 아직 제공하지 않아요.</p>
 </section>;
}
