import { notFound,redirect } from 'next/navigation';
import Link from 'next/link';
import { currentSessionProvider } from '@/server/auth/current';
import { getDatabasePool } from '@/server/db/pool';
import { AuthenticationRequired } from '@/server/auth/session';
import { getTeam } from '@/server/services/team';
import { listBranches } from '@/server/services/branches';
import { TeamForm } from '@/components/auth/team-form';
import { createInvitation,cancelInvitation,changeAssignment,revokeMembership } from '../../team-actions';
const roleNames={branch_owner:'사업장 오너',manager:'매니저',staff:'직원'};
const statusNames:Record<string,string>={pending:'수락 대기',accepted:'수락 완료',cancelled:'취소됨',expired:'만료됨'};
const field='mt-2 block w-full rounded-md border border-line bg-surface p-3 text-body-md';
export default async function TeamPage({params}:{params:Promise<{tenantId:string}>}) {
  const {tenantId}=await params;let team,branches;
  try{const provider=await currentSessionProvider();team=await getTeam(getDatabasePool(),provider,tenantId);branches=await listBranches(getDatabasePool(),provider,tenantId);}
  catch(error){if(error instanceof AuthenticationRequired)redirect('/login');if((error as {code?:string}).code==='42501')notFound();return <p role="alert">직원 정보를 불러오지 못했어요.</p>;}
  const selectors=(branch?:string,role='staff')=><><label className="block text-label-md">배정 지점<select name="branch" className={field} defaultValue={branch} required>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="block text-label-md">지점 역할<select name="role" className={field} defaultValue={role}>{Object.entries(roleNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></>;
  return <div className="space-y-8"><Link href={`/workspace/${tenantId}`} className="text-label-sm underline">운영 지점으로</Link><h1 className="text-h1">직원 관리</h1>
    <section className="rounded-xl border border-line bg-surface p-6"><h2 className="mb-4 text-h2">직원 초대</h2><p className="mb-5 text-body-sm text-fg-secondary">초대받은 이메일로 로그인한 직원만 수락할 수 있어요. 배정된 지점에만 접근하며 최고관리자 권한은 부여하지 않아요.</p><TeamForm action={createInvitation.bind(null,tenantId)} label="초대 코드 만들기" primary><label className="block text-label-md">직원 이메일<input type="email" name="email" required maxLength={254} className={field}/></label>{selectors()}</TeamForm></section>
    <section><h2 className="mb-4 text-h2">조직 구성원</h2><ul className="space-y-4">{team.members.map(m=><li key={m.id} className="rounded-xl border border-line bg-surface p-6"><h3 className="break-all text-label-lg">{m.label}</h3><p className="my-3 text-body-sm">{m.role==='tenant_admin'?'최고관리자':m.status==='revoked'?'권한 회수됨':'직원'}{m.assignments.map(a=>` · ${a.branchName} (${roleNames[a.role]})`).join('')}</p>{m.role==='branch_staff'&&m.status==='active'&&<div className="space-y-6"><TeamForm key={`assign-${m.version}`} action={changeAssignment.bind(null,tenantId,m.id,m.version)} label="배정 변경하기">{selectors(m.assignments[0]?.branchId,m.assignments[0]?.role)}<label className="flex gap-2 text-body-sm"><input type="checkbox" name="confirm" value="yes" required/>기존 모든 지점 배정을 선택한 한 지점으로 교체해요.</label></TeamForm><TeamForm key={`revoke-${m.version}`} action={revokeMembership.bind(null,tenantId,m.id,m.version)} label="조직 접근 권한 회수" danger><label className="flex gap-2 text-body-sm"><input type="checkbox" name="confirm" value="yes" required/>이 직원의 조직 접근 권한을 회수해요. 다음 요청부터 차단되며 재가입은 현재 지원하지 않아요.</label></TeamForm></div>}</li>)}</ul></section>
    <section><h2 className="mb-4 text-h2">최근 초대</h2><ul className="space-y-3">{team.invitations.map(i=><li key={i.id} className="space-y-3 rounded-lg border border-line bg-surface p-4"><p className="break-all text-label-md">{i.email}</p><p className="text-body-sm">{i.branchName} · {roleNames[i.role]} · {statusNames[i.status]}</p>{i.status==='pending'&&<TeamForm action={cancelInvitation.bind(null,tenantId,i.id)} label="초대 취소"/>}</li>)}</ul>{!team.invitations.length&&<p className="text-body-md">아직 만든 초대가 없어요.</p>}</section>
  </div>;
}
