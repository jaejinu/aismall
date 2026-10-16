import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {createFirstOrganization} from '../src/server/services/organizations';
import {listBranches} from '../src/server/services/branches';
import {confirmBooking,cancelBooking,rescheduleBooking,createCustomer,createProgram,createSession,getBookings} from '../src/server/services/bookings';
import {rescheduleMemberBooking,cancelMemberBooking,inviteCustomer,acceptCustomer,getMemberBookings,requestMemberBooking,withdrawMemberRequest,decideMemberRequest,setMemberPolicy,revokeCustomer,getMemberAdministration} from '../src/server/services/member-bookings';
import type {SessionProvider} from '../src/server/auth/session';
const db=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:6}),admin=new Pool({connectionString:process.env.TEST_DATABASE_ADMIN_URL});
const owner=randomUUID(),member=randomUUID(),other=randomUUID(),stranger=randomUUID(),staff=randomUUID();
const auth=(userId=owner,verifiedEmail='member@example.test'):SessionProvider=>({getVerifiedSession:async()=>({userId,verifiedEmail,expiresAt:Date.now()+60000})});
const denied=(e:unknown)=>(e as {code:string}).code==='42501';
let scope:{tenantId:string;branchId:string},otherScope:typeof scope,customer:string,customer2:string,program:string,link:string,link2:string;
async function session(capacity=1,hours=72){return createSession(db,auth(),scope,{programId:program,startsAt:new Date(Date.now()+hours*3600000).toISOString(),endsAt:new Date(Date.now()+(hours+1)*3600000).toISOString(),capacity});}
before(async()=>{
 for(const id of [owner,member,other,stranger,staff])await admin.query("INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1,'member-test',$2)",[id,id]);
 const tenantId=await createFirstOrganization(db,auth(),'Member tests','One');scope={tenantId,branchId:(await listBranches(db,auth(),tenantId))[0].id};
 otherScope={tenantId,branchId:randomUUID()};await admin.query("INSERT INTO app.branches(id,tenant_id,slug,name) VALUES($1,$2,'other','Other')",[otherScope.branchId,tenantId]);
 const m=(await admin.query("INSERT INTO app.staff_memberships(tenant_id,user_id,role) VALUES($1,$2,'branch_staff') RETURNING id",[tenantId,staff])).rows[0].id;
 await admin.query("INSERT INTO app.branch_assignments(tenant_id,membership_id,branch_id,role) VALUES($1,$2,$3,'staff')",[tenantId,m,scope.branchId]);
 customer=await createCustomer(db,auth(),scope,'Member one');customer2=await createCustomer(db,auth(),scope,'Member two');program=await createProgram(db,auth(),scope,'Manual approval');
});
after(async()=>{await db.end();await admin.end();});
test('customer linking requires matching verified email, one-use code, active inviter and hides tokens',async()=>{
 const token=await inviteCustomer(db,auth(),scope,customer,'member@example.test');
 await assert.rejects(acceptCustomer(db,auth(member,'wrong@example.test'),token),denied);
 await assert.rejects(acceptCustomer(db,{getVerifiedSession:async()=>({userId:member,expiresAt:Date.now()+60000})},token));
 const attempts=await Promise.allSettled([acceptCustomer(db,auth(member),token),acceptCustomer(db,auth(member),token)]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 link=(await getMemberBookings(db,auth(member)))[0].id;
 const snapshot=await getMemberAdministration(db,auth(),scope);
 assert.ok(!JSON.stringify(snapshot).includes(token));
 await assert.rejects(inviteCustomer(db,auth(staff),scope,customer2,'other@example.test'),denied);
 const token2=await inviteCustomer(db,auth(),scope,customer2,'other@example.test');await acceptCustomer(db,auth(other,'other@example.test'),token2);
 link2=(await getMemberBookings(db,auth(other)))[0].id;
 await assert.rejects(db.query('SELECT * FROM app_private.customer_links'),denied);
 await assert.rejects(db.query('SELECT app_private.require_customer($1,$2)',[member,link]),denied);
 await assert.rejects(getBookings(db,auth(member),scope));
});
test('only enabled future sessions are offered; member cannot impersonate another link or cross branches',async()=>{
 const s=await session();
 assert.equal((await getMemberBookings(db,auth(member)))[0].sessions.length,0);
 await assert.rejects(requestMemberBooking(db,auth(member),link,s,randomUUID()));
 await setMemberPolicy(db,auth(),scope,program,true,24);
 assert.ok((await getMemberBookings(db,auth(member)))[0].sessions.some(x=>x.id===s));
 await assert.rejects(requestMemberBooking(db,auth(other),link,s,randomUUID()),denied);
 await assert.rejects(requestMemberBooking(db,auth(member),link,randomUUID(),randomUUID()),denied);
 await assert.rejects(requestMemberBooking(db,auth(member),link,await session(1,12),randomUUID()));
 assert.equal((await getMemberBookings(db,auth(stranger))).length,0);
});
test('pending does not reserve a seat; retries idempotent; duplicate pending and foreign decisions denied',async()=>{
 const s=await session(),key=randomUUID();
 const first=await requestMemberBooking(db,auth(member),link,s,key);
 assert.equal(await requestMemberBooking(db,auth(member),link,s,key),first);
 await assert.rejects(requestMemberBooking(db,auth(member),link,s,randomUUID()));
 const second=await requestMemberBooking(db,auth(other),link2,s,randomUUID());
 assert.equal((await getBookings(db,auth(),scope)).sessions.find(x=>x.id===s)?.confirmed,0);
 await assert.rejects(decideMemberRequest(db,auth(staff),scope,first,1,true,'No'),denied);
 await assert.rejects(decideMemberRequest(db,auth(),otherScope,first,1,true,'No'),denied);
 const race=await Promise.allSettled([first,second].map(r=>decideMemberRequest(db,auth(),scope,r,1,true,'확인')));
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await getBookings(db,auth(),scope)).sessions.find(x=>x.id===s)?.confirmed,1);
 const rows=await admin.query('SELECT status FROM app.member_requests WHERE id=ANY($1::uuid[])',[[first,second]]);
 assert.deepEqual(rows.rows.map(r=>r.status).sort(),['approved','pending']);
 assert.equal((await getMemberBookings(db,auth(member)))[0].bookings.length+(await getMemberBookings(db,auth(other)))[0].bookings.length,1);
});
test('member snapshots only contain own records; approval and withdrawal race is atomic',async()=>{
 const s=await session(),r=await requestMemberBooking(db,auth(member),link,s,randomUUID());
 assert.ok(!(await getMemberBookings(db,auth(other)))[0].requests.some(x=>x.id===r));
 await assert.rejects(withdrawMemberRequest(db,auth(other),link,r,1),denied);
 const race=await Promise.allSettled([withdrawMemberRequest(db,auth(member),link,r,1),decideMemberRequest(db,auth(),scope,r,1,true,'확인')]);
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
 const row=(await admin.query('SELECT status,booking_id FROM app.member_requests WHERE id=$1',[r])).rows[0];
 assert.equal(row.status==='approved',Boolean(row.booking_id));
 await assert.rejects(decideMemberRequest(db,auth(),scope,r,1,false,'중복'));
});
test('audit failure rolls back both booking and request approval; rejection reason is visible only to linked member',async()=>{
 const s=await session(),r=await requestMemberBooking(db,auth(member),link,s,randomUUID());
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_member_audit CHECK(action<>'request.approved') NOT VALID");
 try{await assert.rejects(decideMemberRequest(db,auth(),scope,r,1,true,'확인'));}finally{await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_member_audit');}
 assert.equal((await getBookings(db,auth(),scope)).sessions.find(x=>x.id===s)?.confirmed,0);
 await decideMemberRequest(db,auth(),scope,r,1,false,'일정 확인 필요');
 assert.equal((await getMemberBookings(db,auth(member)))[0].requests.find(x=>x.id===r)?.decision_reason,'일정 확인 필요');
});
test('reissue invalidates old code; expired and revoked inviter cannot link',async()=>{
 const c=await createCustomer(db,auth(),scope,'Unlinked');
 const old=await inviteCustomer(db,auth(),scope,c,'stranger@example.test');const fresh=await inviteCustomer(db,auth(),scope,c,'stranger@example.test');
 await assert.rejects(acceptCustomer(db,auth(stranger,'stranger@example.test'),old),denied);
 await admin.query("UPDATE app_private.customer_links SET expires_at=now()-interval '1 second' WHERE customer_id=$1",[c]);
 await assert.rejects(acceptCustomer(db,auth(stranger,'stranger@example.test'),fresh),denied);
 const latest=await inviteCustomer(db,auth(),scope,c,'stranger@example.test');
 await admin.query("UPDATE app.staff_memberships SET status='revoked' WHERE user_id=$1",[owner]);
 try{await assert.rejects(acceptCustomer(db,auth(stranger,'stranger@example.test'),latest),denied);}finally{await admin.query("UPDATE app.staff_memberships SET status='active' WHERE user_id=$1",[owner]);}
});
test('member cancellation rejects foreign ownership, frees capacity and records the verified actor once',async()=>{
 const meeting=await session(),booking=await confirmBooking(db,auth(),scope,{sessionId:meeting,customerId:customer,requestId:randomUUID()});
 const snapshot=(await getMemberBookings(db,auth(member)))[0].bookings.find(b=>b.id===booking)!;
 assert.equal(snapshot.cancellable,true);assert.equal(snapshot.version,1);
 await assert.rejects(cancelMemberBooking(db,auth(other),link,booking,1,'Wrong link'),denied);
 await assert.rejects(cancelMemberBooking(db,auth(other),link2,booking,1,'Wrong customer'),denied);
 await assert.rejects(cancelMemberBooking(db,auth(member),link,randomUUID(),1,'Unknown'),denied);
 await cancelMemberBooking(db,auth(member),link,booking,1,'일정 변경');
 assert.equal((await getBookings(db,auth(),scope)).sessions.find(s=>s.id===meeting)?.confirmed,0);
 await assert.rejects(cancelMemberBooking(db,auth(member),link,booking,1,'Retry'));
 const audit=(await admin.query("SELECT actor_user_id,details FROM app.audit_events WHERE action='booking.cancelled' AND details->>'id'=$1",[booking])).rows;
 assert.equal(audit.length,1);assert.equal(audit[0].actor_user_id,member);assert.equal(audit[0].details.source,'member');
});
test('member cancellation enforces deadline, reason and audit rollback',async()=>{
 const closed=await session(1,12),late=await confirmBooking(db,auth(),scope,{sessionId:closed,customerId:customer,requestId:randomUUID()});
 assert.equal((await getMemberBookings(db,auth(member)))[0].bookings.find(b=>b.id===late)?.cancellable,false);
 await assert.rejects(cancelMemberBooking(db,auth(member),link,late,1,'Too late'),e=>(e as {code:string}).code==='22023');
 const meeting=await session(),booking=await confirmBooking(db,auth(),scope,{sessionId:meeting,customerId:customer,requestId:randomUUID()});
 await assert.rejects(cancelMemberBooking(db,auth(member),link,booking,1,' '));
 await assert.rejects(db.query("SELECT app_private.cancel_member_booking($1,$2,$3,1,NULL)",[member,link,booking]));
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_member_cancel CHECK(action<>'booking.cancelled') NOT VALID");
 try{await assert.rejects(cancelMemberBooking(db,auth(member),link,booking,1,'Rollback'));}finally{await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_member_cancel');}
 assert.deepEqual((await admin.query('SELECT status,version FROM app.bookings WHERE id=$1',[booking])).rows[0],{status:'confirmed',version:1});
});
test('member and administrator concurrent cancellation has one winner',async()=>{
 const meeting=await session(),booking=await confirmBooking(db,auth(),scope,{sessionId:meeting,customerId:customer,requestId:randomUUID()});
 const results=await Promise.allSettled([cancelMemberBooking(db,auth(member),link,booking,1,'Member'),cancelBooking(db,auth(),scope,booking,1,'Operator')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await admin.query('SELECT version FROM app.bookings WHERE id=$1',[booking])).rows[0].version,2);
});
test('member cancellation racing an operator transfer cannot cancel using the old version',async()=>{
 const meeting=await session(),destination=await session(),booking=await confirmBooking(db,auth(),scope,{sessionId:meeting,customerId:customer,requestId:randomUUID()});
 const results=await Promise.allSettled([cancelMemberBooking(db,auth(member),link,booking,1,'Member'),rescheduleBooking(db,auth(),scope,booking,destination,1,'Operator')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const row=(await admin.query('SELECT status,session_id,version FROM app.bookings WHERE id=$1',[booking])).rows[0];
 assert.equal(row.version,2);assert.ok(row.status==='cancelled'?row.session_id===meeting:row.session_id===destination);
});

test('member transfer preserves booking identity, frees original capacity and audits actor; foreign access denied',async()=>{
 const source=await session(),target=await session(),key=randomUUID();
 const booking=await confirmBooking(db,auth(),scope,{sessionId:source,customerId:customer,requestId:key});
 const move=(provider=auth(member),connection=link)=>rescheduleMemberBooking(db,provider,connection,booking,target,1,'일정 변경');
 await assert.rejects(move(auth(other),link),denied);
 await assert.rejects(move(auth(other),link2),denied);
 await assert.rejects(rescheduleMemberBooking(db,auth(member),link,booking,randomUUID(),1,'Unknown'),denied);
 await move();
 const snapshot=(await getMemberBookings(db,auth(member)))[0],row=snapshot.bookings.find(b=>b.id===booking)!;
 assert.equal(row.session_id,target);assert.equal(row.program_id,program);assert.equal(row.version,2);assert.equal(row.reschedulable,true);
 assert.equal(snapshot.sessions.find(s=>s.id===source)?.confirmed,0);assert.equal(snapshot.sessions.find(s=>s.id===target)?.confirmed,1);
 await assert.rejects(move(),e=>(e as {code:string}).code==='40001');
 assert.equal(await confirmBooking(db,auth(),scope,{sessionId:source,customerId:customer,requestId:key}),booking);
 const audit=(await admin.query("SELECT actor_user_id,details FROM app.audit_events WHERE action='booking.rescheduled' AND details->>'id'=$1",[booking])).rows;
 assert.equal(audit.length,1);assert.equal(audit[0].actor_user_id,member);assert.equal(audit[0].details.source,'member');
 assert.equal(audit[0].details.from_session_id,source);assert.equal(audit[0].details.to_session_id,target);
});
test('member transfer rejects closed, foreign, different program, duplicate, pending, invalid and full destinations without losing source',async()=>{
 const source=await session(),target=await session(),booking=await confirmBooking(db,auth(),scope,{sessionId:source,customerId:customer,requestId:randomUUID()});
 const move=(destination=target,reason='변경')=>rescheduleMemberBooking(db,auth(member),link,booking,destination,1,reason);
 await assert.rejects(move(source));await assert.rejects(move(target,' '));
 await assert.rejects(db.query('SELECT app_private.reschedule_member_booking($1,$2,$3,$4,1,NULL)',[member,link,booking,target]));
 await assert.rejects(move(await session(1,12)));
 const foreignProgram=await createProgram(db,auth(),otherScope,'Foreign');
 const foreign=await createSession(db,auth(),otherScope,{programId:foreignProgram,startsAt:new Date(Date.now()+96*3600000).toISOString(),endsAt:new Date(Date.now()+97*3600000).toISOString(),capacity:1});
 await assert.rejects(move(foreign),denied);
 const different=await createProgram(db,auth(),scope,'Different');
 const otherMeeting=await createSession(db,auth(),scope,{programId:different,startsAt:new Date(Date.now()+96*3600000).toISOString(),endsAt:new Date(Date.now()+97*3600000).toISOString(),capacity:1});
 await assert.rejects(move(otherMeeting));
 await setMemberPolicy(db,auth(),scope,program,false,24);
 try{assert.equal((await getMemberBookings(db,auth(member)))[0].bookings.find(b=>b.id===booking)?.reschedulable,false);await assert.rejects(move());}
 finally{await setMemberPolicy(db,auth(),scope,program,true,24);}
 const pending=await requestMemberBooking(db,auth(member),link,target,randomUUID());await assert.rejects(move());await withdrawMemberRequest(db,auth(member),link,pending,1);
 await confirmBooking(db,auth(),scope,{sessionId:target,customerId:customer2,requestId:randomUUID()});
 await assert.rejects(move(),e=>(e as {code:string}).code==='P0002');
 const duplicate=await session(2);await confirmBooking(db,auth(),scope,{sessionId:duplicate,customerId:customer,requestId:randomUUID()});await assert.rejects(move(duplicate));
 assert.deepEqual((await admin.query('SELECT session_id,version FROM app.bookings WHERE id=$1',[booking])).rows[0],{session_id:source,version:1});
 const late=await confirmBooking(db,auth(),scope,{sessionId:await session(1,12),customerId:customer,requestId:randomUUID()});
 await assert.rejects(rescheduleMemberBooking(db,auth(member),link,late,await session(),1,'Too late'));
});
test('member transfer rolls back on audit failure',async()=>{
 const source=await session(),target=await session(),booking=await confirmBooking(db,auth(),scope,{sessionId:source,customerId:customer,requestId:randomUUID()});
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_member_transfer CHECK(action<>'booking.rescheduled') NOT VALID");
 try{await assert.rejects(rescheduleMemberBooking(db,auth(member),link,booking,target,1,'Rollback'));}
 finally{await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_member_transfer');}
 assert.deepEqual((await admin.query('SELECT session_id,version FROM app.bookings WHERE id=$1',[booking])).rows[0],{session_id:source,version:1});
});
test('two members transferring to the last seat have one winner and retain the losing source',async()=>{
 const source1=await session(),source2=await session(),target=await session();
 const b1=await confirmBooking(db,auth(),scope,{sessionId:source1,customerId:customer,requestId:randomUUID()}),b2=await confirmBooking(db,auth(),scope,{sessionId:source2,customerId:customer2,requestId:randomUUID()});
 const results=await Promise.allSettled([rescheduleMemberBooking(db,auth(member),link,b1,target,1,'First'),rescheduleMemberBooking(db,auth(other),link2,b2,target,1,'Second')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const rows=(await admin.query('SELECT id,session_id,version FROM app.bookings WHERE id=ANY($1::uuid[])',[[b1,b2]])).rows;
 assert.equal(rows.filter(r=>r.session_id===target&&r.version===2).length,1);
 assert.equal(rows.filter(r=>r.version===1&&r.session_id===(r.id===b1?source1:source2)).length,1);
});
test('member transfer racing operator cancellation or transfer has one winner',async()=>{
 for(const cancel of [true,false]){
  const source=await session(),target=await session(),another=await session(),booking=await confirmBooking(db,auth(),scope,{sessionId:source,customerId:customer,requestId:randomUUID()});
  const results=await Promise.allSettled([rescheduleMemberBooking(db,auth(member),link,booking,target,1,'Member'),cancel?cancelBooking(db,auth(),scope,booking,1,'Operator'):rescheduleBooking(db,auth(),scope,booking,another,1,'Operator')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const row=(await admin.query('SELECT status,session_id,version FROM app.bookings WHERE id=$1',[booking])).rows[0];
  assert.equal(row.version,2);assert.ok(row.status==='cancelled'?row.session_id===source:[target,another].includes(row.session_id));
 }
});


test('automatic confirmation reserves exactly once, audits member and retry never restores a cancelled booking',async()=>{
 await setMemberPolicy(db,auth(),scope,program,true,24,'automatic');
 try{
  const meeting=await session(),key=randomUUID();
  assert.equal((await getMemberBookings(db,auth(member)))[0].sessions.find(s=>s.id===meeting)?.confirmation_mode,'automatic');
  const results=await Promise.all([1,2].map(()=>requestMemberBooking(db,auth(member),link,meeting,key,'automatic')));
  assert.equal(results[0],results[1]);
  const request=(await admin.query('SELECT status,booking_id,confirmation_mode FROM app.member_requests WHERE id=$1',[results[0]])).rows[0];
  assert.equal(request.status,'approved');assert.equal(request.confirmation_mode,'automatic');
  const booking=(await admin.query('SELECT id,version,requested_session_id FROM app.bookings WHERE id=$1',[request.booking_id])).rows[0];
  assert.equal(booking.requested_session_id,meeting);
  assert.equal((await getMemberAdministration(db,auth(),scope)).requests.some(r=>r.id===results[0]),false);
  const audit=(await admin.query("SELECT actor_user_id,details FROM app.audit_events WHERE action='booking.confirmed' AND details->>'id'=$1",[booking.id])).rows;
  assert.equal(audit.length,1);assert.equal(audit[0].actor_user_id,member);assert.equal(audit[0].details.mode,'automatic');
  await cancelMemberBooking(db,auth(member),link,booking.id,1,'검증');
  await setMemberPolicy(db,auth(),scope,program,false,24,'manual');
  assert.equal(await requestMemberBooking(db,auth(member),link,meeting,key,'automatic'),results[0]);
  assert.equal((await admin.query('SELECT status FROM app.bookings WHERE id=$1',[booking.id])).rows[0].status,'cancelled');
  await assert.rejects(requestMemberBooking(db,auth(member),link,meeting,key,'manual'));
 }finally{await setMemberPolicy(db,auth(),scope,program,true,24,'manual');}
});
test('automatic policy does not convert pending or accept stale mode and respects staff permissions and deadlines',async()=>{
 const pendingSession=await session(),pending=await requestMemberBooking(db,auth(member),link,pendingSession,randomUUID());
 await assert.rejects(setMemberPolicy(db,auth(staff),scope,program,true,24,'automatic'),denied);
 await assert.rejects(setMemberPolicy(db,auth(),otherScope,program,true,24,'automatic'),denied);
 await assert.rejects(db.query('SELECT app_private.request_booking($1,$2,$3,$4,NULL)',[member,link,pendingSession,randomUUID()]));
 await setMemberPolicy(db,auth(),scope,program,true,24,'automatic');
 try{
  const meeting=await session();
  await assert.rejects(requestMemberBooking(db,auth(member),link,meeting,randomUUID(),'manual'),e=>(e as {code:string}).code==='40001');
  await assert.rejects(requestMemberBooking(db,auth(other),link,meeting,randomUUID(),'automatic'),denied);
  await assert.rejects(requestMemberBooking(db,auth(member),link,pendingSession,randomUUID(),'automatic'));
  assert.equal((await admin.query('SELECT status FROM app.member_requests WHERE id=$1',[pending])).rows[0].status,'pending');
  await assert.rejects(requestMemberBooking(db,auth(member),link,await session(1,12),randomUUID(),'automatic'));
  await setMemberPolicy(db,auth(),scope,program,true,2,'automatic');
  const near=await session(1,12),request=await requestMemberBooking(db,auth(member),link,near,randomUUID(),'automatic');
  const booking=(await admin.query('SELECT booking_id FROM app.member_requests WHERE id=$1',[request])).rows[0].booking_id;
  assert.equal((await getMemberBookings(db,auth(member)))[0].bookings.find(b=>b.id===booking)?.cancellable,false);
  await assert.rejects(requestMemberBooking(db,auth(member),link,await session(1,1),randomUUID(),'automatic'));
 }finally{await setMemberPolicy(db,auth(),scope,program,true,24,'manual');}
 const manual=await requestMemberBooking(db,auth(member),link,await session(),randomUUID());
 assert.equal((await admin.query('SELECT status FROM app.member_requests WHERE id=$1',[manual])).rows[0].status,'pending');
});
test('automatic last-seat race creates one request and booking; full and duplicate failures leave no requests',async()=>{
 await setMemberPolicy(db,auth(),scope,program,true,24,'automatic');
 try{
  const meeting=await session(),keys=[randomUUID(),randomUUID()];
  const results=await Promise.allSettled([requestMemberBooking(db,auth(member),link,meeting,keys[0],'automatic'),requestMemberBooking(db,auth(other),link2,meeting,keys[1],'automatic')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await admin.query('SELECT id FROM app.member_requests WHERE request_key=ANY($1::uuid[])',[keys])).rowCount,1);
  assert.equal((await admin.query("SELECT id FROM app.bookings WHERE session_id=$1 AND status='confirmed'",[meeting])).rowCount,1);
  const duplicateMeeting=await session(2);await requestMemberBooking(db,auth(member),link,duplicateMeeting,randomUUID(),'automatic');
  await assert.rejects(requestMemberBooking(db,auth(member),link,duplicateMeeting,randomUUID(),'automatic'));
  assert.equal((await admin.query('SELECT id FROM app.member_requests WHERE session_id=$1',[duplicateMeeting])).rowCount,1);
 }finally{await setMemberPolicy(db,auth(),scope,program,true,24,'manual');}
});
test('automatic confirmation rolls request, booking and audits back if approval audit fails',async()=>{
 await setMemberPolicy(db,auth(),scope,program,true,24,'automatic');
 const meeting=await session(),key=randomUUID();
 await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT fail_auto_audit CHECK(action<>'request.approved') NOT VALID");
 try{await assert.rejects(requestMemberBooking(db,auth(member),link,meeting,key,'automatic'));}
 finally{await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT fail_auto_audit');await setMemberPolicy(db,auth(),scope,program,true,24,'manual');}
 assert.equal((await admin.query('SELECT id FROM app.member_requests WHERE request_key=$1',[key])).rowCount,0);
 assert.equal((await admin.query('SELECT id FROM app.bookings WHERE session_id=$1',[meeting])).rowCount,0);
});
test('policy switch racing automatic request either rejects stale intent or commits one fully automatic result',async()=>{
 await setMemberPolicy(db,auth(),scope,program,true,24,'automatic');
 const meeting=await session(),key=randomUUID();
 const result=await Promise.allSettled([requestMemberBooking(db,auth(member),link,meeting,key,'automatic'),setMemberPolicy(db,auth(),scope,program,true,24,'manual')]);
 assert.equal(result[1].status,'fulfilled');
 const rows=(await admin.query('SELECT status,confirmation_mode,booking_id FROM app.member_requests WHERE request_key=$1',[key])).rows;
 if(result[0].status==='fulfilled'){assert.equal(rows.length,1);assert.equal(rows[0].status,'approved');assert.equal(rows[0].confirmation_mode,'automatic');assert.ok(rows[0].booking_id);}
 else{assert.equal((result[0].reason as {code:string}).code,'40001');assert.equal(rows.length,0);}
});

test('revoked links and suspended users cannot view/apply; existing pending cannot be approved after revocation',async()=>{
 const s=await session(),r=await requestMemberBooking(db,auth(member),link,s,randomUUID());
 await admin.query("UPDATE app.users SET status='suspended' WHERE id=$1",[member]);
 try{await assert.rejects(getMemberBookings(db,auth(member)),denied);}finally{await admin.query("UPDATE app.users SET status='active' WHERE id=$1",[member]);}
 const retained=await confirmBooking(db,auth(),scope,{sessionId:await session(),customerId:customer,requestId:randomUUID()});
 const moveTarget=await session();
 await revokeCustomer(db,auth(),scope,link);
 await assert.rejects(rescheduleMemberBooking(db,auth(member),link,retained,moveTarget,1,'Revoked'),denied);
 await assert.rejects(cancelMemberBooking(db,auth(member),link,retained,1,'Revoked'),denied);
 assert.equal((await getMemberBookings(db,auth(member))).length,0);
 await assert.rejects(requestMemberBooking(db,auth(member),link,s,randomUUID()),denied);
 await assert.rejects(requestMemberBooking(db,auth(member),link,s,randomUUID(),'automatic'),denied);
 await assert.rejects(decideMemberRequest(db,auth(),scope,r,1,true,'불가'),denied);
 await decideMemberRequest(db,auth(),scope,r,1,false,'연결 회수');
});
