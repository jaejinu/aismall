import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { searchBookingChoices, createCustomer, createProgram, createSession, confirmBooking, cancelBooking, getBookings, rescheduleBooking, recordAttendance } from '../src/server/services/bookings';
import { createFirstOrganization } from '../src/server/services/organizations';
import { listBranches } from '../src/server/services/branches';
import { withTenant } from '../src/server/access/tenant';
import type { SessionProvider } from '../src/server/auth/session';
const db=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:8});
const admin=new Pool({connectionString:process.env.TEST_DATABASE_ADMIN_URL});
const owner=randomUUID(), staff=randomUUID(), manager=randomUUID(), stranger=randomUUID();
const provider=(userId=owner):SessionProvider=>({getVerifiedSession:async()=>({userId,expiresAt:Date.now()+60000})});
let scope:{tenantId:string;branchId:string}, other:typeof scope, foreign:typeof scope, program:string, customer:string, secondCustomer:string;
const future=(hours:number)=>new Date(Date.now()+hours*3600000).toISOString();
const code=(expected:string)=>(e:unknown)=>(e as {code?:string}).code===expected;
async function session(capacity=1,hours=72){return createSession(db,provider(),scope,{programId:program,startsAt:future(hours),endsAt:future(hours+1),capacity});}
const book=(sessionId:string,customerId=customer,requestId=randomUUID())=>confirmBooking(db,provider(),scope,{sessionId,customerId,requestId});
before(async()=>{
 for(const id of [owner,staff,manager,stranger])await admin.query("INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1,'booking-test',$2)",[id,id]);
 const tenantId=await createFirstOrganization(db,provider(),'Booking test','Seoul');
 scope={tenantId,branchId:(await listBranches(db,provider(),tenantId))[0].id};
 other={tenantId,branchId:randomUUID()};
 await admin.query("INSERT INTO app.branches(id,tenant_id,slug,name) VALUES($1,$2,'other','Other')",[other.branchId,tenantId]);
 const foreignTenant=await createFirstOrganization(db,provider(stranger),'Foreign','Foreign');
 foreign={tenantId:foreignTenant,branchId:(await listBranches(db,provider(stranger),foreignTenant))[0].id};
 for(const [id,role] of [[staff,'staff'],[manager,'manager']]){
  const m=(await admin.query("INSERT INTO app.staff_memberships(tenant_id,user_id,role) VALUES($1,$2,'branch_staff') RETURNING id",[tenantId,id])).rows[0].id;
  await admin.query('INSERT INTO app.branch_assignments(tenant_id,membership_id,branch_id,role) VALUES($1,$2,$3,$4)',[tenantId,m,scope.branchId,role]);
 }
 program=await createProgram(db,provider(),scope,'기구'); customer=await createCustomer(db,provider(),scope,'테스트 고객'); secondCustomer=await createCustomer(db,provider(),scope,'다른 고객');
});
after(async()=>{await db.end();await admin.end();});
test('branch reads and management roles are isolated; runtime cannot write tables or call helpers',async()=>{
 assert.equal((await getBookings(db,provider(staff),scope)).canManage,false);
 assert.equal((await getBookings(db,provider(manager),scope)).canManage,true);
 await createCustomer(db,provider(manager),scope,'매니저 등록');
 await assert.rejects(createCustomer(db,provider(staff),scope,'불가'),code('42501'));
 await assert.rejects(getBookings(db,provider(manager),other));
 await assert.rejects(createCustomer(db,provider(manager),other,'불가'),code('42501'));
 await assert.rejects(getBookings(db,provider(),foreign));
 await assert.rejects(createProgram(db,provider(),{...scope,branchId:foreign.branchId},'불가'),code('42501'));
 for(const table of ['customers','programs','sessions','bookings']) {
  await assert.rejects(db.query(`DELETE FROM app.${table}`),code('42501'));
  assert.equal((await db.query(`SELECT * FROM app.${table}`)).rowCount,0);
 }
 await assert.rejects(db.query('SELECT app_private.require_booking_operator($1,$2)',[scope.tenantId,scope.branchId]),code('42501'));
 await assert.rejects(db.query("SELECT app_private.booking_audit($1,$2,'booking.confirmed',$3)",[scope.tenantId,scope.branchId,randomUUID()]),code('42501'));
 await withTenant(db,provider(manager),scope.tenantId,async client=>{
  const rows=await client.query('SELECT * FROM app.customers WHERE branch_id=$1',[other.branchId]); assert.equal(rows.rowCount,0);
 });
});
test('composite foreign keys reject cross-branch program and customer links',async()=>{
 const otherProgram=await createProgram(db,provider(),other,'타 지점');
 const otherCustomer=await createCustomer(db,provider(),other,'타 지점 고객');
 await assert.rejects(createSession(db,provider(),scope,{programId:otherProgram,startsAt:future(72),endsAt:future(73),capacity:2}),code('23503'));
 const s=await session(2);
 await assert.rejects(book(s,otherCustomer),code('23503'));
 const foreignCustomer=await createCustomer(db,provider(stranger),foreign,'타 조직 고객');
 await assert.rejects(book(s,foreignCustomer),code('23503'));
});
test('last seat race admits exactly one booking and no extra audit',async()=>{
 const s=await session();
 const results=await Promise.allSettled([book(s),book(s,secondCustomer)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected'&&code('P0002')(r.reason)).length,1);
 assert.equal((await getBookings(db,provider(),scope)).sessions.find(x=>x.id===s)?.confirmed,1);
});
test('same request is idempotent, duplicate customer rejected and conflicting reuse rejected',async()=>{
 const s=await session(3),request=randomUUID();
 const results=await Promise.all([book(s,customer,request),book(s,customer,request)]);
 assert.equal(results[0],results[1]);
 await assert.rejects(book(s),code('23505'));
 await assert.rejects(book(s,secondCustomer,request),code('22023'));
 const audit=await admin.query("SELECT count(*)::int AS n FROM app.audit_events WHERE action='booking.confirmed' AND details->>'id'=$1",[results[0]]);
 assert.equal(audit.rows[0].n,1);
});
test('cancellation frees capacity, version rejects stale writes, retry never resurrects cancelled booking',async()=>{
 const s=await session(),request=randomUUID(),b=await book(s,customer,request);
 await assert.rejects(withTenant(db,provider(),scope.tenantId,c=>c.query('SELECT app_private.cancel_booking($1,$2,$3,NULL,$4)',[scope.tenantId,scope.branchId,b,'불가'])),code('40001'));
 await cancelBooking(db,provider(),scope,b,1,'고객 요청');
 await assert.rejects(cancelBooking(db,provider(),scope,b,1,'오래된 요청'),code('40001'));
 assert.equal(await book(s,customer,request),b);
 const cancelled=(await getBookings(db,provider(),scope)).bookings.find(x=>x.id===b)!;
 assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.version,2);
 assert.equal((await getBookings(db,provider(),scope)).sessions.find(x=>x.id===s)?.confirmed,0);
 await book(s,secondCustomer);
 await assert.rejects(book(s),code('P0002'));
});
test('time limits and input validation are enforced, including direct routine calls',async()=>{
 await assert.rejects(createCustomer(db,provider(),scope,' '));
 await assert.rejects(createSession(db,provider(),scope,{programId:program,startsAt:future(-1),endsAt:future(1),capacity:1}),code('22023'));
 await assert.rejects(createSession(db,provider(),scope,{programId:program,startsAt:future(72),endsAt:future(71),capacity:1}));
 await assert.rejects(createSession(db,provider(),scope,{programId:program,startsAt:future(72),endsAt:future(73),capacity:0}));
 const s=await session(1,12),b=await book(s);
 await assert.rejects(cancelBooking(db,provider(),scope,b,1,'마감 후'),code('22023'));
 await admin.query("UPDATE app.sessions SET starts_at=now()-interval '1 hour' WHERE id=$1",[s]);
 await assert.rejects(book(s,secondCustomer),code('22023'));
 await assert.rejects(withTenant(db,provider(),scope.tenantId,async c=>c.query("SELECT app_private.create_session($1,$2,$3,'infinity','infinity',1)",[scope.tenantId,scope.branchId,program])),code('23514'));
});
test('audit failure rolls back booking and cancellation atomically',async()=>{
 const s=await session(2);
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_booking_audit CHECK(action<>'booking.confirmed') NOT VALID");
 try {await assert.rejects(book(s));} finally {await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_booking_audit');}
 assert.equal((await getBookings(db,provider(),scope)).sessions.find(x=>x.id===s)?.confirmed,0);
 const b=await book(s);
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_booking_audit CHECK(action<>'booking.cancelled') NOT VALID");
 try {await assert.rejects(cancelBooking(db,provider(),scope,b,1,'검사'));} finally {await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_booking_audit');}
 assert.equal((await getBookings(db,provider(),scope)).bookings.find(x=>x.id===b)?.status,'confirmed');
});
test('closed branch, suspended user, revoked membership deny subsequent operations and reads',async()=>{
 await admin.query("UPDATE app.branches SET status='closed' WHERE id=$1",[scope.branchId]);
 try {await assert.rejects(getBookings(db,provider(),scope));await assert.rejects(createCustomer(db,provider(),scope,'불가'),code('42501'));}
 finally {await admin.query("UPDATE app.branches SET status='active' WHERE id=$1",[scope.branchId]);}
 await admin.query("UPDATE app.users SET status='suspended' WHERE id=$1",[manager]);
 try {await assert.rejects(createCustomer(db,provider(manager),scope,'불가'));}
 finally {await admin.query("UPDATE app.users SET status='active' WHERE id=$1",[manager]);}
 await admin.query("UPDATE app.staff_memberships SET status='revoked' WHERE user_id=$1",[manager]);
 await assert.rejects(getBookings(db,provider(manager),scope));
 await assert.rejects(createCustomer(db,provider(manager),scope,'불가'));
});

test('reschedule moves capacity atomically, rejects full/cross-branch/program/stale targets',async()=>{
 const a=await session(2),b=await session(1),request=randomUUID(),booking=await book(a,customer,request);
 await rescheduleBooking(db,provider(),scope,booking,b,1,'시간 변경');
 assert.equal(await book(a,customer,request),booking);
 await assert.rejects(book(b,customer,request),code('22023'));
 const rows=(await getBookings(db,provider(),scope)).sessions;
 assert.equal(rows.find(s=>s.id===a)?.confirmed,0);assert.equal(rows.find(s=>s.id===b)?.confirmed,1);
 await assert.rejects(rescheduleBooking(db,provider(),scope,booking,a,1,'오래된 화면'),code('40001'));
 const another=await book(a,secondCustomer);
 await assert.rejects(rescheduleBooking(db,provider(),scope,another,b,1,'만석'),code('P0002'));
 const otherProgram=await createProgram(db,provider(),other,'다른 지점');
 const foreignSession=await createSession(db,provider(),other,{programId:otherProgram,startsAt:future(72),endsAt:future(73),capacity:5});
 await assert.rejects(rescheduleBooking(db,provider(),scope,booking,foreignSession,2,'불가'),code('42501'));
 const differentProgram=await createProgram(db,provider(),scope,'다른 프로그램');
 const different=await createSession(db,provider(),scope,{programId:differentProgram,startsAt:future(72),endsAt:future(73),capacity:5});
 await assert.rejects(rescheduleBooking(db,provider(),scope,booking,different,2,'불가'),code('22023'));
 await assert.rejects(rescheduleBooking(db,provider(staff),scope,booking,a,2,'불가'),code('42501'));
 await assert.rejects(rescheduleBooking(db,provider(),scope,booking,await session(1,12),2,'마감'),code('22023'));
 const audit=(await admin.query("SELECT details FROM app.audit_events WHERE action='booking.rescheduled' AND details->>'id'=$1",[booking])).rows;
 assert.equal(audit.length,1);assert.equal(audit[0].details.from_session_id,a);assert.equal(audit[0].details.to_session_id,b);
});
test('reschedule competing with a new booking for last seat has exactly one winner',async()=>{
 const a=await session(2),b=await session(1),booking=await book(a);
 const attempts=await Promise.allSettled([rescheduleBooking(db,provider(),scope,booking,b,1,'동시 이동'),book(b,secondCustomer)]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(attempts.filter(r=>r.status==='rejected'&&code('P0002')(r.reason)).length,1);
 assert.equal((await getBookings(db,provider(),scope)).sessions.find(s=>s.id===b)?.confirmed,1);
});
test('opposite transfers do not deadlock; audit failure rolls back movement',async()=>{
 const a=await session(3),b=await session(3),one=await book(a),two=await book(b,secondCustomer);
 await Promise.all([rescheduleBooking(db,provider(),scope,one,b,1,'이동'),rescheduleBooking(db,provider(),scope,two,a,1,'이동')]);
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_booking_audit CHECK(action<>'booking.rescheduled') NOT VALID");
 try{await assert.rejects(rescheduleBooking(db,provider(),scope,one,a,2,'롤백'));}finally{await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_booking_audit');}
 const row=(await admin.query('SELECT session_id,version FROM app.bookings WHERE id=$1',[one])).rows[0];
 assert.equal(row.session_id,b);assert.equal(row.version,2);
});
test('attendance is explicit, starts after session start, no-show only after end, corrections versioned',async()=>{
 const s=await session(3),booking=await book(s);
 await assert.rejects(recordAttendance(db,provider(),scope,booking,1,'attended','조기'),code('22023'));
 await admin.query("UPDATE app.sessions SET starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' WHERE id=$1",[s]);
 assert.equal((await getBookings(db,provider(),scope)).bookings.find(b=>b.id===booking)?.attendance,'unrecorded');
 await assert.rejects(recordAttendance(db,provider(),scope,booking,1,'no_show','조기'),code('22023'));
 await assert.rejects(recordAttendance(db,provider(staff),scope,booking,1,'attended','불가'),code('42501'));
 await recordAttendance(db,provider(),scope,booking,1,'attended','현장 확인');
 await assert.rejects(recordAttendance(db,provider(),scope,booking,1,'unrecorded','오래된 화면'),code('40001'));
 await admin.query("UPDATE app.sessions SET ends_at=now()-interval '1 minute' WHERE id=$1",[s]);
 await recordAttendance(db,provider(),scope,booking,2,'no_show','입력 정정');
 await recordAttendance(db,provider(),scope,booking,3,'unrecorded','재확인 필요');
 const row=(await admin.query('SELECT status,attendance,version FROM app.bookings WHERE id=$1',[booking])).rows[0];
 assert.deepEqual(row,{status:'confirmed',attendance:'unrecorded',version:4});
 const audit=await admin.query("SELECT details FROM app.audit_events WHERE action='booking.attendance_recorded' AND details->>'id'=$1 ORDER BY created_at",[booking]);
 assert.equal(audit.rowCount,3);assert.equal(audit.rows[1].details.before,'attended');assert.equal(audit.rows[1].details.after,'no_show');
});
test('attendance refuses cancelled or foreign bookings, rolls back on audit failure and has one concurrent winner',async()=>{
 const s=await session(3),booking=await book(s),cancelled=await book(s,secondCustomer);
 await cancelBooking(db,provider(),scope,cancelled,1,'취소');
 await admin.query("UPDATE app.sessions SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' WHERE id=$1",[s]);
 await assert.rejects(recordAttendance(db,provider(),scope,cancelled,2,'attended','불가'),code('40001'));
 await assert.rejects(recordAttendance(db,provider(),other,booking,1,'attended','불가'),code('42501'));
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_booking_audit CHECK(action<>'booking.attendance_recorded') NOT VALID");
 try{await assert.rejects(recordAttendance(db,provider(),scope,booking,1,'attended','롤백'));}finally{await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_booking_audit');}
 const attempts=await Promise.allSettled(['attended','no_show'].map(outcome=>recordAttendance(db,provider(),scope,booking,1,outcome,'현장 확인')));
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(attempts.filter(r=>r.status==='rejected'&&code('40001')(r.reason)).length,1);
});
test('search uses literal names, Korean date boundaries, status/attendance and stable 50-row pagination',async()=>{
 const p=await createProgram(db,provider(),scope,'검색 전용 %_');
 const s=await createSession(db,provider(),scope,{programId:p,startsAt:future(100),endsAt:future(101),capacity:100});
 // Controlled fixture time for exact KST date boundary tests (not production writes).
 await admin.query("UPDATE app.sessions SET starts_at='2030-01-01T15:30:00Z',ends_at='2030-01-01T16:30:00Z' WHERE id=$1",[s]);
 await admin.query(`WITH customers AS (
 INSERT INTO app.customers(tenant_id,branch_id,name) SELECT $1,$2,'검색 고객 '||i FROM generate_series(1,51) i RETURNING id)
 INSERT INTO app.bookings(tenant_id,branch_id,session_id,customer_id,request_id,requested_session_id)
 SELECT $1,$2,$3,id,gen_random_uuid(),$3 FROM customers`,[scope.tenantId,scope.branchId,s]);
 const first=await getBookings(db,provider(),scope,{query:'%_',from:'2030-01-02',to:'2030-01-02'});
 const second=await getBookings(db,provider(),scope,{query:'%_',page:2});
 assert.equal(first.bookings.length,50);assert.equal(first.hasNext,true);
 assert.equal(second.bookings.length,1);assert.equal(second.hasNext,false);
 assert.ok(!first.bookings.some(b=>b.id===second.bookings[0].id));
 assert.equal((await getBookings(db,provider(),scope,{query:'%_',to:'2030-01-01'})).bookings.length,0);
 assert.equal((await getBookings(db,provider(),scope,{query:'%_',status:'cancelled'})).bookings.length,0);
 assert.equal((await getBookings(db,provider(),scope,{query:'%_',attendance:'attended'})).bookings.length,0);
 assert.equal((await getBookings(db,provider(),other,{query:'%_'})).bookings.length,0);
 for(const filters of [{from:'2030-02-30'},{page:-1},{page:NaN},{status:'injected'},{query:'x'.repeat(121)}]) await assert.rejects(getBookings(db,provider(),scope,filters));
});

test('registration request replay and concurrent retries create one entity and audit for all entity types',async()=>{
 for(const kind of ['customer','program','session'] as const){
  const request=randomUUID(),input={programId:program,startsAt:future(180),endsAt:future(181),capacity:2};
  const run=()=>kind==='customer'?createCustomer(db,provider(),scope,'Retry customer',request):kind==='program'?createProgram(db,provider(),scope,'Retry program',request):createSession(db,provider(),scope,input,request);
  const results=await Promise.all([run(),run(),run()]);
  assert.equal(new Set(results).size,1);assert.equal(await run(),results[0]);
  assert.equal((await admin.query("SELECT id FROM app.audit_events WHERE action=$1 AND details->>'id'=$2",[kind+'.created',results[0]])).rowCount,1);
  await assert.rejects(createCustomer(db,provider(),scope,'Different input',request),code('P0003'));
  await assert.rejects(createCustomer(db,provider(staff),scope,'Retry customer',request),code('42501'));
 }
 await assert.rejects(db.query('SELECT * FROM app_private.registration_requests'),code('42501'));
});
test('failed registration leaves no ledger; same names with different requests remain valid',async()=>{
 const request=randomUUID();
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_registration CHECK(action<>'customer.created') NOT VALID");
 try{await assert.rejects(createCustomer(db,provider(),scope,'Audit retry',request));}
 finally{await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_registration');}
 assert.equal((await admin.query('SELECT result_id FROM app_private.registration_requests WHERE request_id=$1',[request])).rowCount,0);
 const first=await createCustomer(db,provider(),scope,'Audit retry',request);
 assert.equal(await createCustomer(db,provider(),scope,'  Audit retry  ',request),first);
 assert.notEqual(await createCustomer(db,provider(),scope,'Audit retry',randomUUID()),first);
 const branchCopy=await createCustomer(db,provider(),other,'Audit retry',request);assert.notEqual(branchCopy,first);
});
test('selection search reaches beyond initial 200 rows, bounds results and treats wildcard text literally',async()=>{
 await admin.query("INSERT INTO app.customers(tenant_id,branch_id,name) SELECT $1,$2,'Search customer '||lpad(n::text,3,'0') FROM generate_series(1,210) n",[scope.tenantId,scope.branchId]);
 const target=await createCustomer(db,provider(),scope,'Search customer Z-last');
 const limited=await searchBookingChoices(db,provider(),scope,'customer','Search customer');
 assert.equal(limited.items.length,50);assert.equal(limited.hasMore,true);
 const exact=await searchBookingChoices(db,provider(),scope,'customer','Z-last');assert.equal(exact.items[0].id,target);assert.equal(exact.hasMore,false);
 assert.equal((await searchBookingChoices(db,provider(),scope,'customer','%')).items.length,0);
 assert.equal((await searchBookingChoices(db,provider(),scope,'customer',target.slice(0,8))).items[0].id,target);
 await assert.rejects(searchBookingChoices(db,provider(),scope,'customer','x'.repeat(121)));
});
test('choice search enforces tenant/branch RLS and supports session date, program and full-capacity flags',async()=>{
 const foreignCustomer=await createCustomer(db,provider(stranger),foreign,'Isolated search');
 assert.equal((await searchBookingChoices(db,provider(staff),scope,'customer','Isolated search')).items.length,0);
 await assert.rejects(searchBookingChoices(db,provider(staff),other,'customer',''));
 await assert.rejects(searchBookingChoices(db,provider(),foreign,'customer',''));
 assert.equal((await searchBookingChoices(db,provider(stranger),foreign,'customer','Isolated search')).items[0].id,foreignCustomer);
 assert.ok((await searchBookingChoices(db,provider(),scope,'program','기구')).items.some(p=>p.id===program));
 const meeting=await session(1,200);await book(meeting);
 const rows=await searchBookingChoices(db,provider(),scope,'session','기구',program);
 assert.equal(rows.items.find(s=>s.id===meeting)?.disabled,true);
 const near=await session(1,12);
 assert.ok(!(await searchBookingChoices(db,provider(),scope,'session','',program)).items.some(s=>s.id===near));
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(future(200)));
 assert.ok((await searchBookingChoices(db,provider(),scope,'session',day)).items.some(s=>s.id===meeting));
});
