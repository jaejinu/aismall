import Link from 'next/link';
import { listOrganizations } from '@/server/services/organizations';
import { notFound, redirect } from 'next/navigation';
import { currentSessionProvider } from '@/server/auth/current';
import { getDatabasePool } from '@/server/db/pool';
import { listBranches } from '@/server/services/branches';
import { AccessDenied } from '@/server/access/tenant';
import { AuthenticationRequired } from '@/server/auth/session';
export default async function OrganizationPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let branches; let isAdmin=false;
  try { const provider=await currentSessionProvider(); branches = await listBranches(getDatabasePool(), provider, tenantId); isAdmin=(await listOrganizations(getDatabasePool(),provider)).some(o=>o.id===tenantId && o.role==='tenant_admin'); }
  catch (error) {
    if (error instanceof AuthenticationRequired) redirect('/login');
    if (error instanceof AccessDenied) notFound();
    return <p role="alert">지점 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>;
  }
  return <section className="rounded-xl border border-line bg-surface p-6 sm:p-8">
    <h1 className="text-h1">운영 지점</h1><p className="mt-3 text-body-md text-fg-secondary">현재 접근할 수 있는 지점이에요. 예약 관리는 준비 중이에요.</p>
    {isAdmin && <Link href={`/workspace/${tenantId}/team`} className="mt-5 inline-block text-label-md underline">직원 초대·권한 관리</Link>}
    <ul className="mt-6 space-y-3">{branches.map(branch => <li className="rounded-lg border border-line p-4 text-label-lg" key={branch.id}>{branch.name}</li>)}</ul>
    {!branches.length && <p className="mt-6 text-body-md">배정된 운영 지점이 없어요. 조직 관리자에게 확인해 주세요.</p>}
  </section>;
}
