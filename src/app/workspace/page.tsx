import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSessionProvider } from '@/server/auth/current';
import { getDatabasePool } from '@/server/db/pool';
import { listOrganizations } from '@/server/services/organizations';
import { AuthenticationRequired } from '@/server/auth/session';
import { TeamForm } from '@/components/auth/team-form';
import { acceptInvitation } from './team-actions';
import { OnboardingForm } from '@/components/auth/onboarding-form';
export default async function WorkspacePage() {
  let organizations;
  try { organizations = await listOrganizations(getDatabasePool(), await currentSessionProvider()); }
  catch (error) {
    if (error instanceof AuthenticationRequired) redirect('/login');
    return <p role="alert">조직 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>;
  }
  return <section className="rounded-xl border border-line bg-surface p-6 sm:p-8">
    <h1 className="text-h1">{organizations.length ? '조직을 선택해요' : '첫 사업장을 준비해요'}</h1>
    {organizations.length ? <ul className="mt-6 space-y-3">{organizations.map(org => <li key={org.id}><Link href={`/workspace/${org.id}`} className="block rounded-lg border border-line p-4 hover:bg-subtle"><span className="text-label-lg">{org.name}</span><span className="ml-3 text-body-sm text-fg-secondary">{org.role === 'tenant_admin' ? '최고관리자' : '직원'}</span></Link></li>)}</ul> : <><p className="mt-3 text-body-md text-fg-secondary">조직과 첫 지점을 만들어요. 이 계정이 조직의 최고관리자가 돼요.</p><OnboardingForm /></>}
    <section className="mt-8 border-t border-line pt-6"><h2 className="mb-3 text-h2">직원 초대 수락</h2><p className="mb-4 text-body-sm text-fg-secondary">초대받은 이메일 계정으로 로그인한 뒤 전달받은 코드를 입력해요.</p><TeamForm action={acceptInvitation} label="초대 수락하기"><label className="block text-label-md">초대 코드<input name="code" required minLength={43} maxLength={43} autoComplete="off" spellCheck={false} className="mt-2 block w-full rounded-md border border-line bg-surface p-3"/></label></TeamForm></section>
  </section>;
}
