'use server';
import { revalidatePath } from 'next/cache';
import { currentSessionProvider } from '@/server/auth/current';
import { getDatabasePool } from '@/server/db/pool';
import { BookingInputError, searchBookingChoices, type BookingChoice, createCustomer, createProgram, createSession, confirmBooking, cancelBooking, rescheduleBooking, recordAttendance, type BookingScope } from '@/server/services/bookings';
export type BookingActionState = { message: string; ok?: boolean };
const value = (form: FormData, key: string) => { const v = form.get(key); return typeof v === 'string' ? v : ''; };
export async function saveBookingOperation(scope: BookingScope, operation: 'customer'|'program'|'session'|'confirm'|'cancel'|'reschedule'|'attendance', _state: BookingActionState, form: FormData): Promise<BookingActionState> {
  try {
    const pool = getDatabasePool(), provider = await currentSessionProvider();
    switch (operation) {
      case 'customer': await createCustomer(pool, provider, scope, value(form,'name'),value(form,'request')); break;
      case 'program': await createProgram(pool, provider, scope, value(form,'name'),value(form,'request')); break;
      case 'session':
        // This initial UI is explicitly Seoul time; do not interpret the browser's local timezone.
        await createSession(pool, provider, scope, { programId:value(form,'program'), startsAt:value(form,'starts')+'+09:00', endsAt:value(form,'ends')+'+09:00', capacity:Number(value(form,'capacity')) },value(form,'request')); break;
      case 'confirm':
        if(value(form,'confirm')!=='yes') return {message:'예약 확정을 확인해 주세요.'};
        await confirmBooking(pool, provider, scope, { sessionId:value(form,'session'), customerId:value(form,'customer'), requestId:value(form,'request') }); break;
      case 'cancel':
        if(value(form,'confirm')!=='yes') return {message:'예약 취소를 확인해 주세요.'};
        await cancelBooking(pool, provider, scope, value(form,'booking'), Number(value(form,'version')), value(form,'reason')); break;
      case 'reschedule':
        if(value(form,'confirm')!=='yes') return {message:'예약 변경을 확인해 주세요.'};
        await rescheduleBooking(pool, provider, scope, value(form,'booking'), value(form,'destination'), Number(value(form,'version')), value(form,'reason')); break;
      case 'attendance':
        if(value(form,'confirm')!=='yes') return {message:'출석 기록을 확인해 주세요.'};
        await recordAttendance(pool, provider, scope, value(form,'booking'), Number(value(form,'version')), value(form,'outcome'), value(form,'reason')); break;
      default: return { message:'지원하지 않는 작업이에요.' };
    }
    revalidatePath(`/workspace/${scope.tenantId}/branches/${scope.branchId}/bookings`);
    return {ok:true,message:operation==='cancel'?'예약을 취소했어요.':'저장했어요. 아래 목록에서 확인해 주세요.'};
  } catch(error) {
    if(error instanceof BookingInputError) return {message:error.message};
    const code=(error as {code?:string})?.code;
    return {message:code==='P0003'?'이미 저장된 등록 요청의 내용이 달라요. 목록을 확인하고 새 등록을 시작해 주세요.':code==='P0002'?'정원이 찼어요. 다른 회차를 선택해 주세요.':code==='23505'?'이미 예약했거나 같은 요청이 처리됐어요. 목록을 확인해 주세요.':code==='40001'?'다른 변경이 먼저 저장됐어요. 새로고침 후 확인해 주세요.':code==='22023'?(operation==='attendance'?'출석은 시작 후, 노쇼는 종료 후 기록할 수 있어요. 현재와 다른 결과를 선택해 주세요.':operation==='reschedule'?'같은 프로그램의 다른 회차를 선택해 주세요. 기존·새 회차 모두 시작 24시간 전까지만 변경할 수 있어요.':'시작된 회차는 예약할 수 없고, 취소는 시작 24시간 전까지만 가능해요. 입력 시간도 확인해 주세요.'):'저장하지 못했어요. 로그인·권한·입력 내용을 확인해 주세요.'};
  }
}

export async function findBookingChoices(scope:BookingScope,kind:'customer'|'program'|'session',query:string,programId?:string):Promise<{items:BookingChoice[];hasMore:boolean;error?:string}> {
 try{return await searchBookingChoices(getDatabasePool(),await currentSessionProvider(),scope,kind,query,programId);}
 catch{return {items:[],hasMore:false,error:'검색하지 못했어요. 로그인·권한·검색어를 확인해 주세요.'};}
}
