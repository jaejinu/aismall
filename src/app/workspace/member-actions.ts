'use server';
import { revalidatePath } from 'next/cache';
import { currentSessionProvider } from '@/server/auth/current';
import { getDatabasePool } from '@/server/db/pool';
import { BookingInputError, type BookingScope } from '@/server/services/bookings';
import { setNotificationPreference,getMemberBookings,rescheduleMemberBooking,cancelMemberBooking,acceptCustomer,inviteCustomer,requestMemberBooking,withdrawMemberRequest,decideMemberRequest,revokeCustomer,setMemberPolicy } from '@/server/services/member-bookings';
import type { TeamActionState } from './team-actions';
const mode=(f:FormData)=>{const value=v(f,'mode');if(value!=='manual'&&value!=='automatic')throw new BookingInputError('확정 방식을 확인해 주세요.');return value;};
const v=(f:FormData,k:string)=>{const x=f.get(k);return typeof x==='string'?x:'';};
const failed=(error:unknown):TeamActionState=>({message:error instanceof BookingInputError?error.message:(error as {code?:string})?.code==='P0002'?'정원이 찼어요. 다른 회차를 확인해 주세요.':(error as {code?:string})?.code==='40001'?'이미 처리됐거나 변경됐어요. 새로고침 후 확인해 주세요.':'처리하지 못했어요. 계정·권한·마감·중복 여부를 확인해 주세요.'});
export async function memberAction(operation:'accept'|'request'|'withdraw'|'cancel'|'reschedule',_state:TeamActionState,form:FormData):Promise<TeamActionState> {
 try {
  const db=getDatabasePool(),s=await currentSessionProvider();let requestMessage:string|undefined;
  if(operation==='accept')await acceptCustomer(db,s,v(form,'code').trim());
  else if(operation==='request'){
   const selectedMode=mode(form);
   if(selectedMode==='automatic'&&v(form,'confirm')!=='yes')return {message:'즉시 확정과 취소 마감을 확인해 주세요.'};
   const id=await requestMemberBooking(db,s,v(form,'link'),v(form,'session'),v(form,'key'),selectedMode);
   const request=(await getMemberBookings(db,s)).find(c=>c.id===v(form,'link'))?.requests.find(r=>r.id===id);
   requestMessage=request?.status==='pending'?'신청했어요. 관리자 확인 후 예약이 확정돼요.':request?.status==='approved'?'신청이 승인됐어요. 최신 예약 상태와 일정은 내 예약에서 확인해 주세요.':'이미 처리된 신청이에요. 내 예약과 신청 처리 내역을 확인해 주세요.';
  }
  else if(operation==='withdraw')await withdrawMemberRequest(db,s,v(form,'link'),v(form,'request'),Number(v(form,'version')));
  else if(operation==='cancel'){
   if(v(form,'confirm')!=='yes')return {message:'취소할 예약을 확인해 주세요.'};
   await cancelMemberBooking(db,s,v(form,'link'),v(form,'booking'),Number(v(form,'version')),v(form,'reason'));
  }
  else if(operation==='reschedule'){
   if(v(form,'confirm')!=='yes')return {message:'변경할 회차를 확인해 주세요.'};
   await rescheduleMemberBooking(db,s,v(form,'link'),v(form,'booking'),v(form,'destination'),Number(v(form,'version')),v(form,'reason'));
  }
  else throw new Error('Invalid operation');
  revalidatePath('/workspace','layout');return {ok:true,message:operation==='request'?requestMessage!:operation==='accept'?'회원 연결을 완료했어요.':operation==='reschedule'?'회차를 변경했어요. 내 예약에서 새 일정을 확인해 주세요.':operation==='cancel'?'예약을 취소했어요. 내 예약에서 결과를 확인해 주세요.':'신청을 철회했어요.'};
 }catch(e){return failed(e);}
}
export async function memberAdminAction(scope:BookingScope,operation:'invite'|'policy'|'approve'|'reject'|'revoke',_state:TeamActionState,form:FormData):Promise<TeamActionState> {
 try {
  if(v(form,'confirm')!=='yes')return {message:'선택한 작업을 확인해 주세요.'};
  const db=getDatabasePool(),s=await currentSessionProvider();let code:string|undefined;
  if(operation==='invite')code=await inviteCustomer(db,s,scope,v(form,'customer'),v(form,'email'));
  else if(operation==='policy')await setMemberPolicy(db,s,scope,v(form,'program'),v(form,'enabled')==='yes',Number(v(form,'hours')),mode(form));
  else if(operation==='revoke')await revokeCustomer(db,s,scope,v(form,'link'));
  else if(operation==='approve'||operation==='reject')await decideMemberRequest(db,s,scope,v(form,'request'),Number(v(form,'version')),operation==='approve',v(form,'reason'));
  else throw new Error('Invalid operation');
  revalidatePath('/workspace','layout');return {ok:true,code,message:code?'연결 코드는 지금만 표시돼요. 회원이 회원 예약 화면에서 입력하도록 전달해 주세요.':'처리했어요. 목록에서 결과를 확인해 주세요.'};
 }catch(e){return failed(e);}
}

export async function notificationPreferenceAction(_state:TeamActionState,form:FormData):Promise<TeamActionState> {
 try{
  const choice=v(form,'enabled');if(!['yes','no'].includes(choice))throw new BookingInputError('수신 여부를 선택해 주세요.');
  await setNotificationPreference(getDatabasePool(),await currentSessionProvider(),v(form,'link'),choice==='yes',Number(v(form,'version')));
  revalidatePath('/workspace/member');return {ok:true,message:'예약 이메일 수신 설정을 저장했어요. 실제 발송은 아직 시작되지 않았어요.'};
 }catch(e){return failed(e);}
}
