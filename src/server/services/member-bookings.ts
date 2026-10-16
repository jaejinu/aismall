import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { AuthenticationRequired, requireSession, uuidPattern, type SessionProvider } from '../auth/session';
import { withTenant } from '../access/tenant';
import { BookingInputError, type BookingScope } from './bookings';
const ids=(...values:string[])=>{if(values.some(v=>!uuidPattern.test(v)))throw new BookingInputError('대상을 확인해 주세요.');};
const version=(v:number)=>{if(!Number.isSafeInteger(v)||v<1)throw new BookingInputError('새로고침 후 다시 시도해 주세요.');};
export type MemberConnection={notification?:{enabled:boolean;version:number};id:string;branch:string;organization:string;sessions:{id:string;program_id:string;confirmation_mode:'manual'|'automatic';name:string;starts_at:string;capacity:number;confirmed:number}[];requests:{id:string;session_id:string;confirmation_mode:'manual'|'automatic';version:number;status:string;decision_reason:string|null;name:string;starts_at:string}[];bookings:{id:string;session_id:string;program_id:string;reschedulable:boolean;version:number;cancellable:boolean;status:string;attendance:string;name:string;starts_at:string}[]};
export type CustomerLink={id:string;customer:string;email:string;status:string;expires_at:string};
export type PendingRequest={id:string;version:number;customer:string;program:string;starts_at:string};
async function memberTransaction<T>(pool:Pool,provider:SessionProvider,work:(c:PoolClient,s:Awaited<ReturnType<typeof requireSession>>)=>Promise<T>) {
 const session=await requireSession(provider),c=await pool.connect();let discard=false;
 try {
  await c.query('BEGIN');
  const safe=(await c.query("SELECT NOT rolsuper AND NOT rolbypassrls AND pg_has_role(current_user,'aismall_app','member') AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relowner=pg_roles.oid) AS safe FROM pg_roles WHERE rolname=current_user")).rows[0]?.safe;
  if(!safe)throw new Error('Restricted database role required');
  const result=await work(c,session);
  if(session.expiresAt<=Date.now())throw new AuthenticationRequired();
  await c.query('COMMIT');return result;
 }catch(e){try{await c.query('ROLLBACK');}catch{discard=true;}throw e;}finally{c.release(discard);}
}
export async function getMemberBookings(pool:Pool,provider:SessionProvider):Promise<MemberConnection[]> {
 return memberTransaction(pool,provider,async(c,s)=>{
  const connections:MemberConnection[]=(await c.query('SELECT app_private.member_snapshot($1) AS result',[s.userId])).rows[0].result;
  for(const link of connections)link.notification=(await c.query('SELECT app_private.member_notification_preference($1,$2) AS data',[s.userId,link.id])).rows[0].data;
  return connections;
 });
}
export async function inviteCustomer(pool:Pool,provider:SessionProvider,scope:BookingScope,customer:string,email:string) {
 ids(scope.branchId,customer);email=email.trim().toLowerCase();
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new BookingInputError('이메일을 확인해 주세요.');
 const code=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(code).digest('hex');
 await withTenant(pool,provider,scope.tenantId,c=>c.query('SELECT app_private.invite_customer($1,$2,$3,$4,$5)',[scope.tenantId,scope.branchId,customer,email,hash]));
 return code;
}
export async function acceptCustomer(pool:Pool,provider:SessionProvider,code:string) {
 if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw new BookingInputError('연결 코드를 확인해 주세요.');
 return memberTransaction(pool,provider,async(c,s)=>{
  if(!s.verifiedEmail)throw new AuthenticationRequired();
  await c.query('SELECT app_private.accept_customer($1,$2,$3)',[s.userId,s.verifiedEmail,createHash('sha256').update(code).digest('hex')]);
 });
}
export async function requestMemberBooking(pool:Pool,provider:SessionProvider,link:string,session:string,key:string,mode:'manual'|'automatic'='manual') {
 ids(link,session,key);if(!['manual','automatic'].includes(mode))throw new BookingInputError('확정 방식을 확인해 주세요.');
 return memberTransaction(pool,provider,async(c,s)=>(await c.query('SELECT app_private.request_booking($1,$2,$3,$4,$5) AS id',[s.userId,link,session,key,mode])).rows[0].id as string);
}
export async function withdrawMemberRequest(pool:Pool,provider:SessionProvider,link:string,request:string,expected:number) {
 ids(link,request);version(expected);
 return memberTransaction(pool,provider,async(c,s)=>{await c.query('SELECT app_private.withdraw_request($1,$2,$3,$4)',[s.userId,link,request,expected]);});
}
export async function getMemberAdministration(pool:Pool,provider:SessionProvider,scope:BookingScope):Promise<{links:CustomerLink[];requests:PendingRequest[]}> {
 ids(scope.branchId);
 return withTenant(pool,provider,scope.tenantId,async c=>{
  const links=(await c.query('SELECT app_private.customer_links_for_staff($1,$2) AS result',[scope.tenantId,scope.branchId])).rows[0].result;
  const requests=(await c.query(`SELECT r.id,r.version,c.name AS customer,p.name AS program,s.starts_at FROM app.member_requests r
   JOIN app.customers c ON c.id=r.customer_id JOIN app.sessions s ON s.id=r.session_id JOIN app.programs p ON p.id=s.program_id
   WHERE r.tenant_id=$1 AND r.branch_id=$2 AND r.status='pending' ORDER BY r.created_at,r.id LIMIT 100`,[scope.tenantId,scope.branchId])).rows.map(r=>({...r,starts_at:r.starts_at.toISOString()}));
  return {links,requests};
 });
}
export async function decideMemberRequest(pool:Pool,provider:SessionProvider,scope:BookingScope,request:string,expected:number,approve:boolean,reason:string) {
 ids(scope.branchId,request);version(expected);reason=reason.trim();
 if(!reason||[...reason].length>200||typeof approve!=='boolean')throw new BookingInputError('처리 사유를 1~200자로 입력해 주세요.');
 return withTenant(pool,provider,scope.tenantId,async c=>{await c.query('SELECT app_private.decide_request($1,$2,$3,$4,$5,$6)',[scope.tenantId,scope.branchId,request,expected,approve,reason]);});
}
export async function revokeCustomer(pool:Pool,provider:SessionProvider,scope:BookingScope,link:string) {
 ids(scope.branchId,link);
 return withTenant(pool,provider,scope.tenantId,async c=>{await c.query('SELECT app_private.revoke_customer($1,$2,$3)',[scope.tenantId,scope.branchId,link]);});
}
export async function setMemberPolicy(pool:Pool,provider:SessionProvider,scope:BookingScope,program:string,enabled:boolean,hours:number,mode:'manual'|'automatic'='manual') {
 ids(scope.branchId,program);if(typeof enabled!=='boolean'||![2,24].includes(hours)||!['manual','automatic'].includes(mode))throw new BookingInputError('신청 마감을 확인해 주세요.');
 return withTenant(pool,provider,scope.tenantId,async c=>{await c.query('SELECT app_private.set_member_policy($1,$2,$3,$4,$5,$6)',[scope.tenantId,scope.branchId,program,enabled,hours,mode]);});
}

export async function cancelMemberBooking(pool:Pool,provider:SessionProvider,link:string,booking:string,expected:number,reason:string) {
 ids(link,booking);version(expected);reason=reason.trim();
 if(!reason||[...reason].length>200)throw new BookingInputError('취소 사유를 1~200자로 입력해 주세요.');
 return memberTransaction(pool,provider,async(c,s)=>{await c.query('SELECT app_private.cancel_member_booking($1,$2,$3,$4,$5)',[s.userId,link,booking,expected,reason]);});
}

export async function rescheduleMemberBooking(pool:Pool,provider:SessionProvider,link:string,booking:string,destination:string,expected:number,reason:string) {
 ids(link,booking,destination);version(expected);reason=reason.trim();
 if(!reason||[...reason].length>200)throw new BookingInputError('변경 사유를 1~200자로 입력해 주세요.');
 return memberTransaction(pool,provider,async(c,s)=>{await c.query('SELECT app_private.reschedule_member_booking($1,$2,$3,$4,$5,$6)',[s.userId,link,booking,destination,expected,reason]);});
}

export async function setNotificationPreference(pool:Pool,provider:SessionProvider,link:string,enabled:boolean,expected:number) {
 ids(link);if(typeof enabled!=='boolean'||!Number.isSafeInteger(expected)||expected<0)throw new BookingInputError('알림 설정을 확인해 주세요.');
 return memberTransaction(pool,provider,async(c,s)=>{await c.query('SELECT app_private.set_notification_preference($1,$2,$3,$4,$5)',[s.userId,link,s.verifiedEmail??null,enabled,expected]);});
}
