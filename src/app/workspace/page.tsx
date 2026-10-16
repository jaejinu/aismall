import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSessionProvider } from '@/server/auth/current';
import { getDatabasePool } from '@/server/db/pool';
import { listOrganizations } from '@/server/services/organizations';
import { getMemberBookings } from '@/server/services/member-bookings';
import { Calendar, Building2, ArrowRight } from 'lucide-react';
import { AuthenticationRequired } from '@/server/auth/session';
import { TeamForm } from '@/components/auth/team-form';
import { acceptInvitation } from './team-actions';
import { OnboardingForm } from '@/components/auth/onboarding-form';
export default async function WorkspacePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const explicitManagement=(await searchParams).mode==='manage';
  let organizations; let hasMemberConnection=false;
  try {
    const pool=getDatabasePool(),provider=await currentSessionProvider();
    organizations=await listOrganizations(pool,provider);
    if(!organizations.length&&!explicitManagement)hasMemberConnection=(await getMemberBookings(pool,provider)).length>0;
  }
  catch (error) {
    if (error instanceof AuthenticationRequired) redirect('/login');
    return <p role="alert">조직 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>;
  }
  if(hasMemberConnection)redirect('/workspace/member');
  return <section className="rounded-xl border border-line bg-surface p-6 sm:p-8">
    <h1 className="text-h1">{organizations.length ? '조직을 선택해요' : '어떻게 이용하시겠어요?'}</h1>
    {organizations.length ? <ul className="mt-6 space-y-3">{organizations.map(org => <li key={org.id}><Link href={`/workspace/${org.id}`} className="block rounded-lg border border-line p-4 hover:bg-subtle"><span className="text-label-lg">{org.name}</span><span className="ml-3 text-body-sm text-fg-secondary">{org.role === 'tenant_admin' ? '최고관리자' : '직원'}</span></Link></li>)}</ul> : <div className="mt-6 space-y-5">
      <Link href="/workspace/member" className="flex items-center gap-4 rounded-lg border border-line p-5 hover:bg-subtle"><Calendar size={24} className="shrink-0 text-fg-secondary"/><span className="min-w-0 flex-1"><span className="block text-label-lg">회원으로 수업 예약하기</span><span className="mt-1 block text-body-sm text-fg-secondary">사업장에서 받은 코드로 연결하고 내 예약을 확인해요.</span></span><ArrowRight size={18} className="shrink-0"/></Link>
      <details className="rounded-lg border border-line p-5"><summary className="cursor-pointer text-label-lg">사업장을 새로 운영하시나요?</summary><div className="mt-4"><p className="flex gap-2 text-body-sm text-fg-secondary"><Building2 size={18} className="shrink-0"/>조직과 첫 지점을 만들면 이 계정이 최고관리자가 돼요. 기존 사업장의 직원이라면 아래 초대를 수락해 주세요.</p><OnboardingForm /></div></details>
    </div>}
    <section className="mt-8 border-t border-line pt-6"><h2 className="mb-3 text-h2">직원 초대 수락</h2><p className="mb-4 text-body-sm text-fg-secondary">초대받은 이메일 계정으로 로그인한 뒤 전달받은 코드를 입력해요.</p><TeamForm action={acceptInvitation} label="초대 수락하기"><label className="block text-label-md">초대 코드<input name="code" required minLength={43} maxLength={43} autoComplete="off" spellCheck={false} className="mt-2 block w-full rounded-md border border-line bg-surface p-3"/></label></TeamForm></section>
  </section>;
}
