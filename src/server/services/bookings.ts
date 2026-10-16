import 'server-only';
import {randomUUID} from 'node:crypto';
import type { Pool } from 'pg';
import { AccessDenied, withTenant } from '../access/tenant';
import { uuidPattern, type SessionProvider } from '../auth/session';

export type BookingScope = { tenantId: string; branchId: string };
export class BookingInputError extends Error {}
function id(value: string) { if (!uuidPattern.test(value)) throw new BookingInputError('대상을 다시 선택해 주세요.'); return value; }
function label(value: string, max = 120) {
  const result = value.trim();
  if (!result || [...result].length > max) throw new BookingInputError(`1~${max}자로 입력해 주세요.`);
  return result;
}
function timestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new BookingInputError('날짜와 시간을 확인해 주세요.');
  }
  return value;
}
export type BookingFilters = { query?: string; status?: string; attendance?: string; from?: string; to?: string; page?: number };
export function normalizeBookingFilters(input: BookingFilters = {}) {
  const query = (input.query ?? '').trim();
  const status = input.status || 'all', attendance = input.attendance || 'all';
  const page = input.page ?? 1;
  if (query.length > 120 || !['all','confirmed','cancelled'].includes(status) || !['all','unrecorded','attended','no_show'].includes(attendance) || !Number.isSafeInteger(page) || page < 1 || page > 10000) throw new BookingInputError('검색 조건을 확인해 주세요.');
  for (const date of [input.from, input.to]) {
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) throw new BookingInputError('검색 날짜를 확인해 주세요.');
  }
  if (input.from && input.to && input.from > input.to) throw new BookingInputError('검색 종료일은 시작일 이후여야 해요.');
  return { query, status, attendance, from:input.from || '', to:input.to || '', page };
}
export type BookingOverview = {
  filters: ReturnType<typeof normalizeBookingFilters>; hasNext: boolean;
  branch: { name: string; timezone: string }; canManage: boolean;
  customers: { id: string; name: string }[];
  programs: { id: string; name: string; member_booking_enabled: boolean; confirmation_mode: 'manual'|'automatic'; application_deadline_hours: number }[];
  sessions: { id: string; program_id: string; name: string; starts_at: string; ends_at: string; capacity: number; confirmed: number; movable: boolean }[];
  bookings: { id: string; session_id: string; program_id: string; attendance: 'unrecorded'|'attended'|'no_show'; attendance_reason: string|null; canAttend: boolean; canNoShow: boolean; customer: string; program: string; starts_at: string; status: 'confirmed'|'cancelled'; version: number; cancellable: boolean; cancellation_reason: string|null }[];
};
export async function getBookings(pool: Pool, provider: SessionProvider, scope: BookingScope, input: BookingFilters = {}): Promise<BookingOverview> {
  id(scope.branchId);
  const filters = normalizeBookingFilters(input);
  return withTenant(pool, provider, scope.tenantId, async (db, context) => {
    const branch = (await db.query('SELECT name,timezone FROM app.branches WHERE tenant_id=$1 AND id=$2', [scope.tenantId, scope.branchId])).rows[0];
    if (!branch) throw new AccessDenied();
    const canManage = context.role === 'tenant_admin' || (await db.query("SELECT 1 FROM app.branch_assignments WHERE tenant_id=$1 AND branch_id=$2 AND role IN ('branch_owner','manager')", [scope.tenantId, scope.branchId])).rowCount === 1;
    const customers = (await db.query('SELECT id,name FROM app.customers WHERE tenant_id=$1 AND branch_id=$2 ORDER BY name,id LIMIT 201', [scope.tenantId, scope.branchId])).rows;
    const programs = (await db.query('SELECT id,name,member_booking_enabled,confirmation_mode,application_deadline_hours FROM app.programs WHERE tenant_id=$1 AND branch_id=$2 ORDER BY name,id LIMIT 201', [scope.tenantId, scope.branchId])).rows;
    const sessions = (await db.query(`SELECT s.id,s.program_id,p.name,s.starts_at,s.ends_at,s.capacity,(s.starts_at>now()+interval '24 hours') AS movable,
      (SELECT count(*)::int FROM app.bookings b WHERE b.tenant_id=s.tenant_id AND b.branch_id=s.branch_id AND b.session_id=s.id AND b.status='confirmed') AS confirmed
      FROM app.sessions s JOIN app.programs p ON p.tenant_id=s.tenant_id AND p.branch_id=s.branch_id AND p.id=s.program_id
      WHERE s.tenant_id=$1 AND s.branch_id=$2 AND s.starts_at>now() ORDER BY s.starts_at,s.id LIMIT 201`, [scope.tenantId, scope.branchId])).rows.map(r => ({...r, starts_at:r.starts_at.toISOString(), ends_at:r.ends_at.toISOString()}));
    const bookings = (await db.query(`SELECT b.id,b.session_id,s.program_id,b.attendance,b.attendance_reason,(s.starts_at<=now()) AS \"canAttend\",(s.ends_at<=now()) AS \"canNoShow\",c.name AS customer,p.name AS program,s.starts_at,b.status,b.version,b.cancellation_reason,(s.starts_at>now()+interval '24 hours') AS cancellable
      FROM app.bookings b JOIN app.customers c ON c.tenant_id=b.tenant_id AND c.branch_id=b.branch_id AND c.id=b.customer_id
      JOIN app.sessions s ON s.tenant_id=b.tenant_id AND s.branch_id=b.branch_id AND s.id=b.session_id
      JOIN app.programs p ON p.tenant_id=s.tenant_id AND p.branch_id=s.branch_id AND p.id=s.program_id
      WHERE b.tenant_id=$1 AND b.branch_id=$2
      AND ($3='' OR strpos(lower(c.name),lower($3))>0 OR strpos(lower(p.name),lower($3))>0)
      AND ($4='all' OR b.status=$4) AND ($5='all' OR b.attendance=$5)
      AND ($6::date IS NULL OR s.starts_at >= ($6::date::timestamp AT TIME ZONE 'Asia/Seoul'))
      AND ($7::date IS NULL OR s.starts_at < (($7::date+1)::timestamp AT TIME ZONE 'Asia/Seoul'))
      ORDER BY b.created_at DESC,b.id LIMIT 51 OFFSET $8`, [scope.tenantId, scope.branchId, filters.query, filters.status, filters.attendance, filters.from || null, filters.to || null, (filters.page-1)*50])).rows.map(r => ({...r, starts_at:r.starts_at.toISOString()}));
    return { branch, canManage, customers, programs, sessions, bookings:bookings.slice(0,50), filters, hasNext:bookings.length>50 };
  });
}
async function registerEntity(pool:Pool,provider:SessionProvider,scope:BookingScope,operation:string,payload:Record<string,unknown>,request:string) {
 const values=[scope.tenantId,id(scope.branchId),id(request),operation,JSON.stringify(payload)];
 return withTenant(pool,provider,scope.tenantId,async db=>(await db.query('SELECT app_private.register_booking_entity($1,$2,$3,$4,$5::jsonb) AS id',values)).rows[0].id as string);
}
export async function createCustomer(pool:Pool,provider:SessionProvider,scope:BookingScope,name:string,request:string=randomUUID()) {
 return registerEntity(pool,provider,scope,'customer',{name:label(name)},request);
}
export async function createProgram(pool:Pool,provider:SessionProvider,scope:BookingScope,name:string,request:string=randomUUID()) {
 return registerEntity(pool,provider,scope,'program',{name:label(name)},request);
}
export async function createSession(pool:Pool,provider:SessionProvider,scope:BookingScope,input:{programId:string;startsAt:string;endsAt:string;capacity:number},request:string=randomUUID()) {
 if(!Number.isInteger(input.capacity)||input.capacity<1||input.capacity>1000||Date.parse(input.endsAt)<=Date.parse(input.startsAt))throw new BookingInputError('종료 시간과 정원(1~1000명)을 확인해 주세요.');
 return registerEntity(pool,provider,scope,'session',{program:id(input.programId),starts:new Date(timestamp(input.startsAt)).toISOString(),ends:new Date(timestamp(input.endsAt)).toISOString(),capacity:input.capacity},request);
}
export async function confirmBooking(pool: Pool, provider: SessionProvider, scope: BookingScope, input: { sessionId: string; customerId: string; requestId: string }) {
  const values = [scope.tenantId, id(scope.branchId), id(input.sessionId), id(input.customerId), id(input.requestId)];
  return withTenant(pool, provider, scope.tenantId, async db => (await db.query('SELECT app_private.confirm_booking($1,$2,$3,$4,$5) AS id', values)).rows[0].id as string);
}
export async function cancelBooking(pool: Pool, provider: SessionProvider, scope: BookingScope, bookingId: string, version: number, reason: string) {
  if (!Number.isSafeInteger(version) || version < 1) throw new BookingInputError('새로고침 후 다시 확인해 주세요.');
  const values = [scope.tenantId, id(scope.branchId), id(bookingId), version, label(reason, 200)];
  return withTenant(pool, provider, scope.tenantId, async db => { await db.query('SELECT app_private.cancel_booking($1,$2,$3,$4,$5)', values); });
}

export async function rescheduleBooking(pool: Pool, provider: SessionProvider, scope: BookingScope, bookingId: string, destination: string, version: number, reason: string) {
  if (!Number.isSafeInteger(version) || version < 1) throw new BookingInputError('새로고침 후 다시 확인해 주세요.');
  const values = [scope.tenantId, id(scope.branchId), id(bookingId), id(destination), version, label(reason,200)];
  return withTenant(pool, provider, scope.tenantId, async db => { await db.query('SELECT app_private.reschedule_booking($1,$2,$3,$4,$5,$6)',values); });
}
export async function recordAttendance(pool: Pool, provider: SessionProvider, scope: BookingScope, bookingId: string, version: number, outcome: string, reason: string) {
  if (!Number.isSafeInteger(version) || version < 1 || !['unrecorded','attended','no_show'].includes(outcome)) throw new BookingInputError('출석 결과와 수정 버전을 확인해 주세요.');
  const values = [scope.tenantId, id(scope.branchId), id(bookingId), version, outcome, label(reason,200)];
  return withTenant(pool, provider, scope.tenantId, async db => { await db.query('SELECT app_private.record_attendance($1,$2,$3,$4,$5,$6)',values); });
}

export type BookingChoice={id:string;label:string;disabled?:boolean};
export async function searchBookingChoices(pool:Pool,provider:SessionProvider,scope:BookingScope,kind:'customer'|'program'|'session',query:string,programId?:string):Promise<{items:BookingChoice[];hasMore:boolean}> {
 id(scope.branchId);query=query.trim();
 if(query.length>120||!['customer','program','session'].includes(kind))throw new BookingInputError('검색어를 120자 이내로 입력해 주세요.');
 if(programId)id(programId);
 return withTenant(pool,provider,scope.tenantId,async db=>{
  if(!(await db.query("SELECT 1 FROM app.branches WHERE tenant_id=$1 AND id=$2 AND status='active'",[scope.tenantId,scope.branchId])).rowCount)throw new AccessDenied();
  let items:BookingChoice[];
  if(kind==='session'){
   const rows=(await db.query(`SELECT s.id,p.name,s.starts_at,s.capacity,
    (SELECT count(*)::int FROM app.bookings b WHERE b.tenant_id=s.tenant_id AND b.branch_id=s.branch_id AND b.session_id=s.id AND b.status='confirmed') AS confirmed
    FROM app.sessions s JOIN app.programs p ON p.tenant_id=s.tenant_id AND p.branch_id=s.branch_id AND p.id=s.program_id
    WHERE s.tenant_id=$1 AND s.branch_id=$2 AND s.starts_at>clock_timestamp()
    AND ($4::uuid IS NULL OR (s.program_id=$4 AND s.starts_at>clock_timestamp()+interval '24 hours'))
    AND ($3='' OR strpos(lower(p.name),lower($3))>0 OR strpos(to_char(s.starts_at AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD HH24:MI'),$3)>0)
    ORDER BY s.starts_at,s.id LIMIT 51`,[scope.tenantId,scope.branchId,query,programId??null])).rows;
   items=rows.map(r=>({id:r.id,label:`${r.name} · ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(r.starts_at)} · ${r.confirmed}/${r.capacity}명`,disabled:r.confirmed>=r.capacity}));
  }else{
   // Table identifier is chosen only from this fixed enum; search terms are bound parameters.
   const table=kind==='customer'?'customers':'programs';
   const rows=(await db.query(`SELECT id,name FROM app.${table} WHERE tenant_id=$1 AND branch_id=$2 AND ($3='' OR strpos(lower(name),lower($3))>0 OR strpos(id::text,lower($3))>0) ORDER BY name,id LIMIT 51`,[scope.tenantId,scope.branchId,query])).rows;
   items=rows.map(r=>({id:r.id,label:`${r.name} · ${r.id.slice(0,8)}`}));
  }
  return {items:items.slice(0,50),hasMore:items.length>50};
 });
}
