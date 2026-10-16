'use client';
import {Bell,Building2,Mail,ShieldCheck} from 'lucide-react';
import {TeamForm} from '@/components/auth/team-form';
import {notificationPreferenceAction} from '@/app/workspace/member-actions';
import type {MemberConnection} from '@/server/services/member-bookings';
export function MemberNotificationCard({connection:c}:{connection:MemberConnection}) {
 const enabled=c.notification?.enabled??false;
 return <section className="overflow-hidden rounded-2xl border border-line bg-surface">
 <div className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-fg-secondary"><Building2 size={20}/></span><div className="min-w-0"><h2 className="break-words text-label-md">{c.organization}</h2><p className="mt-0.5 text-caption text-fg-muted">{c.branch} · 연결 완료</p></div></div>
 <div className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-label-md"><Bell size={17}/>예약 이메일 알림</h3><p className="mt-2 text-body-sm text-fg-secondary">예약 확정·변경·취소 소식을 받아보세요.</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-caption ${enabled?'bg-success-bg text-success-fg':'bg-subtle text-fg-muted'}`}>{enabled?'수신 동의':'수신 안 함'}</span></div>
 <div className="flex gap-2 rounded-xl bg-subtle p-3 text-caption text-fg-secondary"><Mail size={16} className="mt-0.5 shrink-0"/><p>회원 연결에 사용한 인증 이메일로 안내해요.<br/><span className="text-fg-muted">실제 이메일 발송은 아직 준비 중이에요.</span></p></div>
 <TeamForm key={`${c.id}-${c.notification?.version??0}`} action={notificationPreferenceAction} label="알림 설정 저장"><input type="hidden" name="link" value={c.id}/><input type="hidden" name="version" value={c.notification?.version??0}/><fieldset className="grid grid-cols-2 gap-2"><legend className="mb-2 text-label-sm">예약 이메일 수신</legend>{[{value:'no',label:'받지 않기'},{value:'yes',label:'받기',hint:'선택 동의'}].map(choice=><label key={choice.value} className="flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border border-line p-3 text-label-sm has-[:checked]:border-primary has-[:checked]:bg-subtle"><input type="radio" name="enabled" value={choice.value} defaultChecked={enabled?choice.value==='yes':choice.value==='no'} className="size-4 accent-primary"/><span>{choice.label}{choice.hint&&<span className="mt-0.5 block text-caption font-normal text-fg-muted">{choice.hint}</span>}</span></label>)}</fieldset><p className="flex gap-2 text-caption leading-relaxed text-fg-muted"><ShieldCheck size={15} className="mt-0.5 shrink-0"/>언제든 끌 수 있으며 예약 이용에는 영향이 없어요. 광고와 동의 전에 생성된 알림은 보내지 않아요.</p></TeamForm>
 </div></section>;
}
