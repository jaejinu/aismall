'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentSessionProvider } from '@/server/auth/current';
import { getDatabasePool } from '@/server/db/pool';
import { inviteStaff,acceptStaffInvitation,cancelStaffInvitation,assignStaff,revokeStaff } from '@/server/services/team';
export type TeamActionState = {message:string;code?:string;ok?:boolean};
const value=(form:FormData,key:string)=>{const v=form.get(key);return typeof v==='string'?v:'';};
function failure(error: unknown): TeamActionState {
  const code=(error as {code?:string})?.code;
  return {message:code==='40001'?'다른 변경이 먼저 저장됐어요. 새로고침 후 다시 확인해 주세요.':code==='23505'?'같은 이메일의 대기 중인 초대가 있어요. 취소하거나 기존 코드를 사용해 주세요.':'처리하지 못했어요. 로그인·권한·입력 내용을 확인해 주세요.'};
}
export async function createInvitation(tenantId:string,_state:TeamActionState,form:FormData):Promise<TeamActionState> {
  try {
    const result=await inviteStaff(getDatabasePool(),await currentSessionProvider(),{tenantId,email:value(form,'email'),branchId:value(form,'branch'),role:value(form,'role')});
    revalidatePath(`/workspace/${tenantId}/team`);
    return {ok:true,message:'초대를 만들었어요. 코드는 지금만 표시돼요. 해당 직원에게 직접 전달해 주세요.',code:result.code};
  }catch(error){return failure(error);}
}
export async function acceptInvitation(_state:TeamActionState,form:FormData):Promise<TeamActionState> {
  let tenant:string;
  try{tenant=await acceptStaffInvitation(getDatabasePool(),await currentSessionProvider(),value(form,'code').trim());}
  catch{return {message:'초대를 수락하지 못했어요. 초대받은 이메일 계정인지, 코드가 만료·취소·사용되지 않았는지 확인해 주세요.'};}
  revalidatePath('/workspace');redirect(`/workspace/${tenant}`);
}
export async function cancelInvitation(tenantId:string,invitationId:string,_state:TeamActionState):Promise<TeamActionState> {
  void _state;
  try {await cancelStaffInvitation(getDatabasePool(),await currentSessionProvider(),tenantId,invitationId);revalidatePath(`/workspace/${tenantId}/team`);return {ok:true,message:'초대를 취소했어요.'};}
  catch(error){return failure(error);}
}
export async function changeAssignment(tenantId:string,membershipId:string,expectedVersion:number,_state:TeamActionState,form:FormData):Promise<TeamActionState> {
  if(value(form,'confirm')!=='yes') return {message:'기존 배정을 교체하는 데 동의해 주세요.'};
  try{await assignStaff(getDatabasePool(),await currentSessionProvider(),{tenantId,membershipId,version:expectedVersion,branchId:value(form,'branch'),role:value(form,'role')});revalidatePath(`/workspace/${tenantId}`,'layout');return {ok:true,message:'배정 지점과 역할을 변경했어요.'};}
  catch(error){return failure(error);}
}
export async function revokeMembership(tenantId:string,membershipId:string,expectedVersion:number,_state:TeamActionState,form:FormData):Promise<TeamActionState> {
  if(value(form,'confirm')!=='yes') return {message:'조직 접근 권한 회수를 확인해 주세요.'};
  try{await revokeStaff(getDatabasePool(),await currentSessionProvider(),tenantId,membershipId,expectedVersion);revalidatePath(`/workspace/${tenantId}`,'layout');return {ok:true,message:'조직 접근 권한을 회수했어요.'};}
  catch(error){return failure(error);}
}
