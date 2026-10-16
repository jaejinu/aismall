import {saveDeliveryEvent} from '../src/server/notifications/webhook';
import {inspectNotificationDatabase,previewNotificationScope} from '../scripts/lib/notification-config.mjs';
import {runNotificationBatch,bookingEmail} from '../src/server/notifications/worker';
import {supabaseRecipientVerifier,resendTransport} from '../src/server/notifications/adapters';
import {inviteCustomer,acceptCustomer,setNotificationPreference,getMemberBookings,revokeCustomer} from '../src/server/services/member-bookings';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {createFirstOrganization} from '../src/server/services/organizations';
import {listBranches} from '../src/server/services/branches';
import {createCustomer,createProgram,createSession,confirmBooking,cancelBooking,rescheduleBooking} from '../src/server/services/bookings';
import {redriveNotification,getNotificationMonitor} from '../src/server/services/notification-monitor';
import {recordNotificationReceipt,claimScopedBookingNotifications,recordNotificationResult,notificationAuthIdentity,authorizeBookingDelivery,prepareBookingNotification,claimBookingNotifications,finishBookingNotification} from '../src/server/notifications/outbox';
import type {SessionProvider} from '../src/server/auth/session';
const admin=new Pool({connectionString:process.env.TEST_DATABASE_ADMIN_URL});
const db=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const worker=new Pool({connectionString:process.env.TEST_DATABASE_ADMIN_URL,options:'-c role=aismall_notification_worker',max:4});
const user=randomUUID(),provider:SessionProvider={getVerifiedSession:async()=>({userId:user,expiresAt:Date.now()+60000})};
let scope:{tenantId:string;branchId:string},customer:string,program:string;
const code=(expected:string)=>(e:unknown)=>(e as {code?:string}).code===expected;
async function session(){const starts=Date.now()+5*86400000;return createSession(db,provider,scope,{programId:program,startsAt:new Date(starts).toISOString(),endsAt:new Date(starts+3600000).toISOString(),capacity:5});}
async function book(){return confirmBooking(db,provider,scope,{sessionId:await session(),customerId:customer,requestId:randomUUID()});}
async function isolate(){await admin.query("UPDATE app_private.booking_outbox SET status='delivered',lease_token=NULL,lease_until=NULL,finished_at=now() WHERE status IN ('pending','processing')");}
before(async()=>{
 await admin.query("INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1,'outbox-test',$2)",[user,user]);
 const tenantId=await createFirstOrganization(db,provider,'Outbox test','Branch');
 scope={tenantId,branchId:(await listBranches(db,provider,tenantId))[0].id};
 customer=await createCustomer(db,provider,scope,'Synthetic recipient');
 program=await createProgram(db,provider,scope,'Synthetic program');
 await isolate();
});
after(async()=>{await Promise.all([admin.end(),db.end(),worker.end()]);});
test('booking mutations enqueue immutable ordered intents, retry emits no duplicate, payload excludes names and reasons',async()=>{
 const s=await session(),key=randomUUID(),booking=await confirmBooking(db,provider,scope,{sessionId:s,customerId:customer,requestId:key});
 await confirmBooking(db,provider,scope,{sessionId:s,customerId:customer,requestId:key});
 await rescheduleBooking(db,provider,scope,booking,await session(),1,'Private reason');
 await cancelBooking(db,provider,scope,booking,2,'Private reason');
 const rows=(await admin.query('SELECT event,booking_version,payload FROM app_private.booking_outbox WHERE booking_id=$1 ORDER BY booking_version',[booking])).rows;
 assert.deepEqual(rows.map(r=>r.event),['booking.confirmed','booking.rescheduled','booking.cancelled']);
 assert.deepEqual(rows.map(r=>r.booking_version),[1,2,3]);
 assert.equal(rows[0].payload.session_id,s);assert.equal(rows[1].payload.previous_session_id,s);
 assert.ok(!JSON.stringify(rows).includes('Private reason'));assert.ok(!JSON.stringify(rows).includes('Synthetic recipient'));
});
test('outbox insert failure rolls booking and audit back; transaction rollback removes intents',async()=>{
 await isolate();
 const s=await session(),request=randomUUID();
 await admin.query("ALTER TABLE app_private.booking_outbox ADD CONSTRAINT fail_outbox CHECK(event<>'booking.confirmed') NOT VALID");
 try{await assert.rejects(confirmBooking(db,provider,scope,{sessionId:s,customerId:customer,requestId:request}),code('23514'));}
 finally{await admin.query('ALTER TABLE app_private.booking_outbox DROP CONSTRAINT fail_outbox');}
 assert.equal((await admin.query('SELECT id FROM app.bookings WHERE request_id=$1',[request])).rowCount,0);
 const c=await admin.connect();
 try{
  await c.query('BEGIN');
  await c.query("SELECT set_config('app.user_id',$1,true),set_config('app.tenant_id',$2,true)",[user,scope.tenantId]);
  await c.query('SELECT app_private.confirm_booking($1,$2,$3,$4,$5)',[scope.tenantId,scope.branchId,s,customer,request]);
  await c.query('ROLLBACK');
 }finally{c.release();}
 assert.equal((await admin.query('SELECT id FROM app_private.booking_outbox WHERE status=\'pending\'')).rowCount,0);
});
test('web runtime cannot inspect/claim/complete jobs and worker cannot read customer tables',async()=>{
 await assert.rejects(db.query('SELECT * FROM app_private.booking_outbox'),code('42501'));
 await assert.rejects(db.query('SELECT app_private.claim_booking_notifications(1)'),code('42501'));
 await assert.rejects(db.query("SELECT app_private.finish_booking_notification($1,$2,'delivered')",[randomUUID(),randomUUID()]),code('42501'));
 await assert.rejects(worker.query('SELECT * FROM app.customers'),code('42501'));
 await assert.rejects(claimBookingNotifications(db));
 await assert.rejects(claimBookingNotifications(admin));
 await assert.rejects(claimBookingNotifications(worker,51));
});
test('parallel workers never claim the same event and later booking events wait for predecessors',async()=>{
 await isolate();const b=await book();await cancelBooking(db,provider,scope,b,1,'Test');
 const results=await Promise.all([claimBookingNotifications(worker),claimBookingNotifications(worker)]);
 const jobs=results.flat();assert.equal(jobs.length,1);assert.equal(jobs[0].event,'booking.confirmed');
 await finishBookingNotification(worker,jobs[0].id,jobs[0].lease_token,'delivered');
 const next=await claimBookingNotifications(worker);assert.equal(next.length,1);assert.equal(next[0].event,'booking.cancelled');
 await finishBookingNotification(worker,next[0].id,next[0].lease_token,'delivered');
});
test('temporary failure backs off, stale tokens cannot acknowledge reclaimed work, permanent failure is terminal',async()=>{
 await isolate();await book();
 const first=(await claimBookingNotifications(worker))[0];
 await finishBookingNotification(worker,first.id,first.lease_token,'temporary');
 assert.equal((await claimBookingNotifications(worker)).length,0);
 const row=(await admin.query('SELECT status,available_at FROM app_private.booking_outbox WHERE id=$1',[first.id])).rows[0];
 assert.equal(row.status,'pending');assert.ok(row.available_at.getTime()>Date.now()+25000);
 await admin.query("UPDATE app_private.booking_outbox SET available_at=now()-interval '1 second' WHERE id=$1",[first.id]);
 const second=(await claimBookingNotifications(worker))[0];assert.equal(second.attempt,2);assert.notEqual(second.lease_token,first.lease_token);
 await assert.rejects(finishBookingNotification(worker,first.id,first.lease_token,'delivered'),code('40001'));
 await finishBookingNotification(worker,second.id,second.lease_token,'permanent');
 assert.equal((await admin.query('SELECT status FROM app_private.booking_outbox WHERE id=$1',[first.id])).rows[0].status,'dead');
});
test('expired leases retry up to five times, then become terminal without consuming later events out of order',async()=>{
 await isolate();await book();let job=(await claimBookingNotifications(worker))[0];
 for(let attempt=2;attempt<=5;attempt++){
  await admin.query("UPDATE app_private.booking_outbox SET lease_until=now()-interval '1 second' WHERE id=$1",[job.id]);
  await assert.rejects(finishBookingNotification(worker,job.id,job.lease_token,'delivered'),code('40001'));
  job=(await claimBookingNotifications(worker))[0];assert.equal(job.attempt,attempt);
 }
 await admin.query("UPDATE app_private.booking_outbox SET lease_until=now()-interval '1 second' WHERE id=$1",[job.id]);
 assert.equal((await claimBookingNotifications(worker)).length,0);
 assert.deepEqual((await admin.query('SELECT status,last_error,attempts FROM app_private.booking_outbox WHERE id=$1',[job.id])).rows[0],{status:'dead',last_error:'lease_expired',attempts:5});
});
test('suspended organizations and closed branches are not claimed',async()=>{
 await isolate();await book();
 await admin.query("UPDATE app.tenants SET status='suspended' WHERE id=$1",[scope.tenantId]);
 try{assert.equal((await claimBookingNotifications(worker)).length,0);}finally{await admin.query("UPDATE app.tenants SET status='active' WHERE id=$1",[scope.tenantId]);}
 await admin.query("UPDATE app.branches SET status='closed' WHERE id=$1",[scope.branchId]);
 try{assert.equal((await claimBookingNotifications(worker)).length,0);}finally{await admin.query("UPDATE app.branches SET status='active' WHERE id=$1",[scope.branchId]);}
 assert.equal((await claimBookingNotifications(worker)).length,1);
});

test('operator monitor is scoped to assigned branches and denies staff, outsiders and inactive branches',async()=>{
 const staff=randomUUID(),manager=randomUUID();
 for(const userId of [staff,manager]){
  await admin.query("INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1,'monitor-test',$2)",[userId,userId]);
  const membership=(await admin.query("INSERT INTO app.staff_memberships(tenant_id,user_id,role) VALUES($1,$2,'branch_staff') RETURNING id",[scope.tenantId,userId])).rows[0].id;
  await admin.query("INSERT INTO app.branch_assignments(tenant_id,membership_id,branch_id,role) VALUES($1,$2,$3,$4)",[scope.tenantId,membership,scope.branchId,userId===staff?'staff':'manager']);
 }
 const auth=(userId:string):SessionProvider=>({getVerifiedSession:async()=>({userId,expiresAt:Date.now()+60000})});
 await assert.rejects(getNotificationMonitor(db,auth(staff),scope),code('42501'));
 await assert.rejects(getNotificationMonitor(db,auth(randomUUID()),scope));
 assert.ok((await getNotificationMonitor(db,auth(manager),scope)).counts);
 const other={tenantId:scope.tenantId,branchId:randomUUID()};
 await admin.query("INSERT INTO app.branches(id,tenant_id,slug,name) VALUES($1,$2,'monitor-other','Other')",[other.branchId,other.tenantId]);
 assert.equal((await getNotificationMonitor(db,provider,other)).items.length,0);
 await assert.rejects(getNotificationMonitor(db,auth(manager),other),code('42501'));
 await assert.rejects(getNotificationMonitor(db,provider,{tenantId:randomUUID(),branchId:scope.branchId}));
 await admin.query("UPDATE app.branches SET status='closed' WHERE id=$1",[other.branchId]);
 await assert.rejects(getNotificationMonitor(db,provider,other),code('42501'));
});
test('monitor projection exposes errors and expiry without lease tokens or payload; invalid filters rejected',async()=>{
 await isolate();const booking=await book();const job=(await claimBookingNotifications(worker))[0];
 await admin.query("UPDATE app_private.booking_outbox SET lease_until=now()-interval '1 second' WHERE id=$1",[job.id]);
 const data=await getNotificationMonitor(db,provider,scope,'processing');
 const row=data.items.find(i=>i.booking_id===booking)!;
 assert.equal(row.expired,true);assert.equal(data.counts.expired,1);
 assert.ok(!JSON.stringify(data).includes(job.lease_token));assert.ok(!('payload' in row));assert.ok(!('lease_until' in row));
 const next=(await claimBookingNotifications(worker))[0];await finishBookingNotification(worker,next.id,next.lease_token,'permanent');
 const dead=await getNotificationMonitor(db,provider,scope,'dead');
 assert.equal(dead.items.find(i=>i.id===job.id)?.last_error,'permanent');
 await assert.rejects(getNotificationMonitor(db,provider,scope,'all',0));
 await assert.rejects(db.query('SELECT app_private.booking_notification_status($1,$2,NULL,1)',[scope.tenantId,scope.branchId]));
 await assert.rejects(worker.query("SELECT app_private.booking_notification_status($1,$2,'all',1)",[scope.tenantId,scope.branchId]),code('42501'));
});
test('monitor pagination returns bounded nonoverlapping pages and branch-wide summary counts',async()=>{
 await isolate();
 for(let i=0;i<53;i++)await book();
 const first=await getNotificationMonitor(db,provider,scope,'pending',1),second=await getNotificationMonitor(db,provider,scope,'pending',2);
 assert.equal(first.items.length,50);assert.equal(first.hasMore,true);assert.equal(second.items.length,3);assert.equal(second.hasMore,false);
 assert.equal(new Set([...first.items,...second.items].map(i=>i.id)).size,53);
 assert.equal(first.counts.pending,53);assert.deepEqual(first.counts,second.counts);
 const delivered=await getNotificationMonitor(db,provider,scope,'delivered');assert.equal(delivered.counts.pending,53);
});

async function failedJob(){await isolate();await book();const job=(await claimBookingNotifications(worker))[0];await finishBookingNotification(worker,job.id,job.lease_token,'permanent');return job;}
test('manual redrive is atomic, concurrent replay is idempotent and preserves provider key and active lease',async()=>{
 const job=await failedJob();
 await Promise.all([redriveNotification(db,provider,scope,job.id,0),redriveNotification(db,provider,scope,job.id,0)]);
 const next=(await claimBookingNotifications(worker))[0];assert.equal(next.id,job.id);assert.equal(next.attempt,1);
 await redriveNotification(db,provider,scope,job.id,0);
 const row=(await admin.query('SELECT status,redrive_count,lease_token FROM app_private.booking_outbox WHERE id=$1',[job.id])).rows[0];
 assert.deepEqual(row,{status:'processing',redrive_count:1,lease_token:next.lease_token});
 const audit=(await admin.query('SELECT actor_user_id,previous_attempts,previous_error FROM app_private.notification_redrives WHERE outbox_id=$1',[job.id])).rows;
 assert.deepEqual(audit,[{actor_user_id:user,previous_attempts:1,previous_error:'permanent'}]);
 await assert.rejects(finishBookingNotification(worker,job.id,job.lease_token,'delivered'),code('40001'));
});
test('redrive stops after three generations and stale generations cannot reset later work',async()=>{
 const job=await failedJob();
 for(let i=0;i<3;i++){
  await redriveNotification(db,provider,scope,job.id,i);
  const next=(await claimBookingNotifications(worker))[0];await finishBookingNotification(worker,next.id,next.lease_token,'permanent');
 }
 await assert.rejects(redriveNotification(db,provider,scope,job.id,3));
 await assert.rejects(redriveNotification(db,provider,scope,job.id,0),code('40001'));
 const monitor=await getNotificationMonitor(db,provider,scope,'dead');assert.equal(monitor.items.find(x=>x.id===job.id)?.can_redrive,false);
});
test('redrive rejects superseded, aged, started and nonfailed events',async()=>{
 const job=await failedJob();
 await admin.query("UPDATE app_private.booking_outbox SET created_at=now()-interval '25 hours' WHERE id=$1",[job.id]);
 await assert.rejects(redriveNotification(db,provider,scope,job.id,0),code('40001'));
 await admin.query("UPDATE app_private.booking_outbox SET created_at=now(),payload=jsonb_set(payload,'{starts_at}',to_jsonb(now()-interval '1 hour')) WHERE id=$1",[job.id]);
 await assert.rejects(redriveNotification(db,provider,scope,job.id,0),code('40001'));
 await admin.query("UPDATE app_private.booking_outbox SET payload=jsonb_set(payload,'{starts_at}',to_jsonb(now()+interval '1 day')) WHERE id=$1",[job.id]);
 await cancelBooking(db,provider,scope,job.booking_id,1,'Test');
 await assert.rejects(redriveNotification(db,provider,scope,job.id,0),code('40001'));
 const newer=(await claimBookingNotifications(worker))[0];
 await assert.rejects(redriveNotification(db,provider,scope,newer.id,0),code('40001'));
});
test('redrive denies staff, cross-branch, revoked access and worker; audit failure rolls back reset',async()=>{
 const job=await failedJob();
 const staff=(await admin.query("SELECT user_id FROM app.staff_memberships WHERE tenant_id=$1 AND role='branch_staff' LIMIT 1",[scope.tenantId])).rows[0].user_id;
 const staffProvider:SessionProvider={getVerifiedSession:async()=>({userId:staff,expiresAt:Date.now()+60000})};
 await assert.rejects(redriveNotification(db,staffProvider,scope,job.id,0),code('42501'));
 await assert.rejects(redriveNotification(db,provider,{...scope,branchId:randomUUID()},job.id,0),code('42501'));
 await assert.rejects(redriveNotification(db,provider,{...scope,tenantId:randomUUID()},job.id,0));
 await assert.rejects(worker.query('SELECT app_private.redrive_booking_notification($1,$2,$3,0)',[scope.tenantId,scope.branchId,job.id]),code('42501'));
 await assert.rejects(db.query('SELECT * FROM app_private.notification_redrives'),code('42501'));
 await admin.query("UPDATE app.staff_memberships SET status='revoked' WHERE tenant_id=$1 AND user_id=$2",[scope.tenantId,user]);
 try{await assert.rejects(redriveNotification(db,provider,scope,job.id,0));}
 finally{await admin.query("UPDATE app.staff_memberships SET status='active' WHERE tenant_id=$1 AND user_id=$2",[scope.tenantId,user]);}
 await admin.query('ALTER TABLE app_private.notification_redrives ADD CONSTRAINT fail_redrive CHECK(generation<0) NOT VALID');
 try{await assert.rejects(redriveNotification(db,provider,scope,job.id,0),code('23514'));}
 finally{await admin.query('ALTER TABLE app_private.notification_redrives DROP CONSTRAINT fail_redrive');}
 assert.deepEqual((await admin.query('SELECT status,redrive_count FROM app_private.booking_outbox WHERE id=$1',[job.id])).rows[0],{status:'dead',redrive_count:0});
});

let recipient:string,recipientLink:string,recipientProvider:SessionProvider;
async function setupRecipient(){
 recipient=randomUUID();const email='recipient-'+recipient+'@example.test';
 await admin.query("INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1,'eligibility',$2)",[recipient,recipient]);
 recipientProvider={getVerifiedSession:async()=>({userId:recipient,verifiedEmail:email,expiresAt:Date.now()+60000})};
 const code=await inviteCustomer(db,provider,scope,customer,email);await acceptCustomer(db,recipientProvider,code);
 recipientLink=(await getMemberBookings(db,recipientProvider))[0].id;
}
test('consent defaults off, requires own link and verified address, and records only real transitions',async()=>{
 await setupRecipient();
 assert.deepEqual((await getMemberBookings(db,recipientProvider))[0].notification,{enabled:false,version:0});
 await assert.rejects(setNotificationPreference(db,provider,recipientLink,true,0),code('42501'));
 const changedEmail:SessionProvider={getVerifiedSession:async()=>({userId:recipient,verifiedEmail:'changed@example.test',expiresAt:Date.now()+60000})};
 await assert.rejects(setNotificationPreference(db,changedEmail,recipientLink,true,0),code('42501'));
 await Promise.all([setNotificationPreference(db,recipientProvider,recipientLink,true,0),setNotificationPreference(db,recipientProvider,recipientLink,true,0)]);
 assert.equal((await admin.query('SELECT count(*)::int AS n FROM app_private.notification_preference_events WHERE link_id=$1',[recipientLink])).rows[0].n,1);
 await setNotificationPreference(db,changedEmail,recipientLink,false,1);
 await assert.rejects(setNotificationPreference(db,recipientProvider,recipientLink,true,0),code('40001'));
 await setNotificationPreference(db,recipientProvider,recipientLink,true,2);
});
test('preflight defaults channel off and releases address only for a valid leased eligible job',async()=>{
 await isolate();await book();const job=(await claimBookingNotifications(worker))[0];
 assert.deepEqual(await prepareBookingNotification(worker,job.id,job.lease_token),{allowed:false,reason:'channel_disabled'});
 await admin.query('INSERT INTO app_private.notification_channels(tenant_id,branch_id,email_enabled) VALUES($1,$2,true)',[scope.tenantId,scope.branchId]);
 const result=await prepareBookingNotification(worker,job.id,job.lease_token);assert.equal(result.allowed,true);
 if(result.allowed){assert.equal(result.idempotency_key,job.id);assert.equal(result.recipient_user_id,recipient);assert.match(result.recipient,/@example.test$/);}
 await assert.rejects(prepareBookingNotification(worker,job.id,randomUUID()),code('40001'));
 await assert.rejects(db.query('SELECT app_private.prepare_booking_notification($1,$2)',[job.id,job.lease_token]),code('42501'));
 for(const table of ['notification_preferences','notification_preference_events','notification_channels'])await assert.rejects(worker.query('SELECT * FROM app_private.'+table),code('42501'));
 await finishBookingNotification(worker,job.id,job.lease_token,'delivered');
 await assert.rejects(prepareBookingNotification(worker,job.id,job.lease_token),code('40001'));
});
test('preflight rechecks opt-out and excludes pre-consent events after re-enabling',async()=>{
 await isolate();await book();const job=(await claimBookingNotifications(worker))[0];
 await setNotificationPreference(db,recipientProvider,recipientLink,false,3);
 assert.deepEqual(await prepareBookingNotification(worker,job.id,job.lease_token),{allowed:false,reason:'consent_missing'});
 await setNotificationPreference(db,recipientProvider,recipientLink,true,4);
 assert.deepEqual(await prepareBookingNotification(worker,job.id,job.lease_token),{allowed:false,reason:'before_consent'});
});
test('preflight rejects scope/user suspension, obsolete or expired events and expired leases',async()=>{
 await isolate();const booking=await book();const job=(await claimBookingNotifications(worker))[0];
 for(const [table,id,status] of [['tenants',scope.tenantId,'suspended'],['branches',scope.branchId,'closed'],['users',recipient,'suspended']]){
  await admin.query('UPDATE app.'+table+' SET status=$1 WHERE id=$2',[status,id]);
  const result=await prepareBookingNotification(worker,job.id,job.lease_token);
  assert.deepEqual(result,{allowed:false,reason:table==='users'?'recipient_unavailable':'inactive_scope'});
  await admin.query("UPDATE app."+table+" SET status='active' WHERE id=$1",[id]);
 }
 await admin.query("UPDATE app_private.booking_outbox SET created_at=now()-interval '25 hours' WHERE id=$1",[job.id]);
 assert.deepEqual(await prepareBookingNotification(worker,job.id,job.lease_token),{allowed:false,reason:'expired_event'});
 await admin.query("UPDATE app_private.booking_outbox SET created_at=now(),payload=jsonb_set(payload,'{starts_at}',to_jsonb(now()-interval '1 hour')) WHERE id=$1",[job.id]);
 assert.deepEqual(await prepareBookingNotification(worker,job.id,job.lease_token),{allowed:false,reason:'expired_event'});
 await cancelBooking(db,provider,scope,booking,1,'Test');
 assert.deepEqual(await prepareBookingNotification(worker,job.id,job.lease_token),{allowed:false,reason:'superseded'});
 await admin.query("UPDATE app_private.booking_outbox SET lease_until=now()-interval '1 second' WHERE id=$1",[job.id]);
 await assert.rejects(prepareBookingNotification(worker,job.id,job.lease_token),code('40001'));
});
test('final gate requires fresh verified Auth email and rechecks channel after slow identity lookup',async()=>{
 await isolate();await book();const job=(await claimBookingNotifications(worker))[0];
 const expected={allowed:false,reason:'identity_unverified'};
 assert.deepEqual(await authorizeBookingDelivery(worker,job.id,job.lease_token,async()=>null),expected);
 assert.deepEqual(await authorizeBookingDelivery(worker,job.id,job.lease_token,async()=>{throw new Error('Auth unavailable');}),{allowed:false,reason:'identity_unavailable'});
 assert.deepEqual(await authorizeBookingDelivery(worker,job.id,job.lease_token,async()=>({verifiedEmail:'changed@example.test'})),expected);
 const email=(await recipientProvider.getVerifiedSession())!.verifiedEmail!;
 assert.equal((await authorizeBookingDelivery(worker,job.id,job.lease_token,async id=>{assert.equal(id,recipient);return {verifiedEmail:email};})).allowed,true);
 assert.deepEqual(await authorizeBookingDelivery(worker,job.id,job.lease_token,async()=>{
  await admin.query('UPDATE app_private.notification_channels SET email_enabled=false WHERE tenant_id=$1 AND branch_id=$2',[scope.tenantId,scope.branchId]);
  return {verifiedEmail:email};
 }),{allowed:false,reason:'channel_disabled'});
 await admin.query('UPDATE app_private.notification_channels SET email_enabled=true WHERE tenant_id=$1 AND branch_id=$2',[scope.tenantId,scope.branchId]);
});
test('consent audit failures roll back and link revocation blocks an already claimed notification',async()=>{
 await admin.query('ALTER TABLE app_private.notification_preference_events ADD CONSTRAINT fail_consent CHECK(version<0) NOT VALID');
 try{await assert.rejects(setNotificationPreference(db,recipientProvider,recipientLink,false,5),code('23514'));}
 finally{await admin.query('ALTER TABLE app_private.notification_preference_events DROP CONSTRAINT fail_consent');}
 assert.deepEqual((await getMemberBookings(db,recipientProvider))[0].notification,{enabled:true,version:5});
 await isolate();await book();const job=(await claimBookingNotifications(worker))[0];
 await revokeCustomer(db,provider,scope,recipientLink);
 assert.deepEqual(await prepareBookingNotification(worker,job.id,job.lease_token),{allowed:false,reason:'recipient_unavailable'});
 await assert.rejects(setNotificationPreference(db,recipientProvider,recipientLink,false,5),code('42501'));
});

async function readyWorkerBooking(){
 await isolate();
 await admin.query("UPDATE app_private.customer_links SET status='active' WHERE id=$1",[recipientLink]);
 await admin.query('UPDATE app_private.notification_channels SET email_enabled=true WHERE tenant_id=$1 AND branch_id=$2',[scope.tenantId,scope.branchId]);
 await book();
}
const validVerifier=()=>async()=>({verifiedEmail:'recipient-'+recipient+'@example.test'});
test('worker is inert by default, then records accepted provider result without exposing addresses',async()=>{
 await readyWorkerBooking();let sends=0;
 const options={scope,limit:1,verifier:validVerifier,transport:{send:async()=>{sends++;return 'accepted' as const;}}};
 assert.equal((await runNotificationBatch(worker,options)).claimed,0);assert.equal(sends,0);
 assert.deepEqual(await runNotificationBatch(worker,{...options,enabled:true}),{claimed:1,accepted:1,blocked:0,retrying:0,failed:0});
 assert.equal(sends,1);
 const row=(await admin.query("SELECT o.status,r.reason FROM app_private.notification_attempt_results r JOIN app_private.booking_outbox o ON o.id=r.outbox_id ORDER BY r.created_at DESC LIMIT 1")).rows[0];
 assert.deepEqual(row,{status:'delivered',reason:'provider_accepted'});
});
test('worker retries Auth outages and provider failures but never calls transport for revoked consent',async()=>{
 await readyWorkerBooking();let sends=0;
 const transport={send:async()=>{sends++;throw new Error('private provider response');}};
 const first=await runNotificationBatch(worker,{scope,enabled:true,limit:1,verifier:()=>async()=>{throw new Error('Auth timeout');},transport});
 assert.equal(first.retrying,1);assert.equal(sends,0);
 await readyWorkerBooking();assert.equal((await runNotificationBatch(worker,{scope,enabled:true,limit:1,verifier:validVerifier,transport})).retrying,1);assert.equal(sends,1);
 await readyWorkerBooking();await admin.query('UPDATE app_private.notification_preferences SET enabled=false WHERE link_id=$1',[recipientLink]);
 try{assert.equal((await runNotificationBatch(worker,{scope,enabled:true,limit:1,verifier:validVerifier,transport})).blocked,1);assert.equal(sends,1);}
 finally{await admin.query('UPDATE app_private.notification_preferences SET enabled=true WHERE link_id=$1',[recipientLink]);}
 assert.ok(!(await admin.query('SELECT reason FROM app_private.notification_attempt_results')).rows.some(r=>r.reason.includes('private')));
});
test('result audit and completion roll back together; stale tokens and web role are denied',async()=>{
 await readyWorkerBooking();const job=(await claimBookingNotifications(worker))[0];
 await assert.rejects(db.query('SELECT app_private.notification_auth_identity($1,$2)',[job.id,job.lease_token]),code('42501'));
 await assert.rejects(db.query("SELECT app_private.record_notification_result($1,$2,'provider_accepted')",[job.id,job.lease_token]),code('42501'));
 await admin.query('ALTER TABLE app_private.notification_attempt_results ADD CONSTRAINT fail_result CHECK(attempt<0) NOT VALID');
 try{await assert.rejects(recordNotificationResult(worker,job.id,job.lease_token,'provider_accepted'),code('23514'));}
 finally{await admin.query('ALTER TABLE app_private.notification_attempt_results DROP CONSTRAINT fail_result');}
 assert.equal((await admin.query('SELECT status FROM app_private.booking_outbox WHERE id=$1',[job.id])).rows[0].status,'processing');
 await recordNotificationResult(worker,job.id,job.lease_token,'superseded');
 await assert.rejects(recordNotificationResult(worker,job.id,job.lease_token,'provider_accepted'),code('40001'));
 await assert.rejects(notificationAuthIdentity(worker,job.id,job.lease_token),code('40001'));
});
test('Supabase adapter resolves Auth subject rather than internal user ID and validates fresh response',async()=>{
 await readyWorkerBooking();const job=(await claimBookingNotifications(worker))[0],subject=randomUUID();
 const config={url:'https://workertest.supabase.co',secretKey:'sb_secret_synthetic'};
 await admin.query('UPDATE app.users SET auth_issuer=$1,auth_subject=$2 WHERE id=$3',[config.url+'/auth/v1',subject,recipient]);
 const user={id:subject,email:'recipient-'+recipient+'@example.test',email_confirmed_at:new Date().toISOString()};
 const http:typeof fetch=async(url,init)=>{assert.equal(url,config.url+'/auth/v1/admin/users/'+subject);assert.equal(new Headers(init?.headers).get('apikey'),config.secretKey);assert.equal(init?.redirect,'error');assert.ok(init?.signal);return Response.json(user);};
 assert.deepEqual(await supabaseRecipientVerifier(worker,config,http)(job)(recipient),{verifiedEmail:user.email});
 for(const invalid of [{...user,id:randomUUID()},{...user,email_confirmed_at:null},{...user,banned_until:'2999-01-01T00:00:00Z'},{...user,deleted_at:new Date().toISOString()}]){
  assert.equal(await supabaseRecipientVerifier(worker,config,async()=>Response.json(invalid))(job)(recipient),null);
 }
 await assert.rejects(supabaseRecipientVerifier(worker,config,async()=>new Response('',{status:503}))(job)(recipient));
 assert.equal(await supabaseRecipientVerifier(worker,config,async()=>new Response('',{status:404}))(job)(recipient),null);
 const other=supabaseRecipientVerifier(worker,{...config,url:'https://other.supabase.co'},async()=>{throw new Error('must not request');});
 assert.equal(await other(job)(recipient),null);
});
test('Resend adapter enforces allowlist and stable idempotency key, validates receipt and classifies failures',async()=>{
 const config={apiKey:'re_synthetic',from:'sender@example.test',allowedRecipients:['member@example.test']};
 const mail={to:'member@example.test',subject:'예약 안내',text:'합성 검증',idempotencyKey:randomUUID()};let calls=0;
 const http:typeof fetch=async(url,init)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(new Headers(init?.headers).get('Idempotency-Key'),mail.idempotencyKey);assert.ok(init?.signal);assert.equal(init?.redirect,'error');return Response.json({id:randomUUID()});};
 const transport=resendTransport(config,http);assert.equal(await transport.send({...mail,to:'outside@example.test'}),'permanent');assert.equal(calls,0);
 assert.equal((await transport.send(mail) as {status:string}).status,'accepted');assert.equal(calls,1);
 for(const status of [408,429,500])assert.equal(await resendTransport(config,async()=>new Response('',{status})).send(mail),'temporary');
 for(const status of [401,403,409,422])assert.equal(await resendTransport(config,async()=>new Response('',{status})).send(mail),'permanent');
 assert.equal(await resendTransport(config,async()=>Response.json({})).send(mail),'temporary');
 assert.equal(await resendTransport(config,async()=>{throw new Error('network');}).send(mail),'temporary');
 assert.throws(()=>resendTransport({...config,allowedRecipients:[]}));
});
test('booking email is deterministic across retries and contains no internal customer or tenant IDs',async()=>{
 await readyWorkerBooking();const job=(await claimBookingNotifications(worker))[0];
 const first=bookingEmail(job,'member@example.test');assert.deepEqual(bookingEmail({...job,attempt:4},'member@example.test'),first);
 assert.ok(!first.text.includes(job.tenant_id));assert.ok(!first.text.includes(job.payload.customer_id));assert.equal(first.idempotencyKey,job.id);
});

test('worker counts exhausted transient failures as terminal and does not re-send after completion failure',async()=>{
 await readyWorkerBooking();await admin.query("UPDATE app_private.booking_outbox SET attempts=4 WHERE status='pending'");
 const options={scope,enabled:true,limit:1,verifier:validVerifier,transport:{send:async()=> 'temporary' as const}};
 assert.deepEqual(await runNotificationBatch(worker,options),{claimed:1,accepted:0,retrying:0,blocked:1,failed:0});
 await readyWorkerBooking();let sends=0;
 await admin.query('ALTER TABLE app_private.notification_attempt_results ADD CONSTRAINT fail_ack CHECK(attempt<0) NOT VALID');
 try{assert.equal((await runNotificationBatch(worker,{...options,transport:{send:async()=>{sends++;return 'accepted';}}})).failed,1);}
 finally{await admin.query('ALTER TABLE app_private.notification_attempt_results DROP CONSTRAINT fail_ack');}
 assert.equal(sends,1);assert.equal((await admin.query("SELECT count(*)::int AS n FROM app_private.booking_outbox WHERE status='processing'")).rows[0].n,1);
});

test('monitor projects only latest sanitized result and identifies older redrive generations',async()=>{
 await readyWorkerBooking();let job=(await claimBookingNotifications(worker))[0];
 await recordNotificationResult(worker,job.id,job.lease_token,'channel_disabled');
 let item=(await getNotificationMonitor(db,provider,scope)).items.find(i=>i.id===job.id)!;
 assert.equal(item.last_result?.reason,'channel_disabled');assert.equal(item.last_result?.attempt,1);assert.equal(item.last_result?.generation,0);
 await admin.query("UPDATE app_private.booking_outbox SET available_at=now()-interval '1 second' WHERE id=$1",[job.id]);
 job=(await claimBookingNotifications(worker))[0];await recordNotificationResult(worker,job.id,job.lease_token,'identity_unverified');
 await redriveNotification(db,provider,scope,job.id,0);
 item=(await getNotificationMonitor(db,provider,scope)).items.find(i=>i.id===job.id)!;
 assert.equal(item.redrive_count,1);assert.equal(item.last_result?.generation,0);assert.equal(item.last_result?.attempt,2);assert.equal(item.last_result?.reason,'identity_unverified');
 assert.deepEqual(Object.keys(item.last_result!).sort(),['attempt','created_at','generation','reason']);
 assert.ok(!JSON.stringify(item).includes(job.lease_token));
 const other=(await admin.query("SELECT id FROM app.branches WHERE tenant_id=$1 AND id<>$2 LIMIT 1",[scope.tenantId,scope.branchId])).rows[0].id;
 await admin.query("UPDATE app.branches SET status='active' WHERE id=$1",[other]);
 assert.ok(!(await getNotificationMonitor(db,provider,{...scope,branchId:other})).items.some(i=>i.id===job.id));
});
test('read-only pilot inspector accepts worker but denies runtime, admin and direct table grants',async()=>{
 const c=await worker.connect();try{await inspectNotificationDatabase(c);}finally{c.release();}
 for(const pool of [db,admin]){const c=await pool.connect();try{await assert.rejects(inspectNotificationDatabase(c));}finally{c.release();}}
 await admin.query('GRANT SELECT ON app.customers TO aismall_notification_worker');
 const unsafe=await worker.connect();try{await assert.rejects(inspectNotificationDatabase(unsafe));}finally{unsafe.release();await admin.query('REVOKE SELECT ON app.customers FROM aismall_notification_worker');}
});

test('pilot preview is read-only and scoped claims preserve other tenants and branches including exhausted leases',async()=>{
 await isolate();await book();
 const otherUser=randomUUID();
 await admin.query("INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1,'pilot-test',$2)",[otherUser,otherUser]);
 const otherProvider:SessionProvider={getVerifiedSession:async()=>({userId:otherUser,expiresAt:Date.now()+60000})};
 const tenantId=await createFirstOrganization(db,otherProvider,'Other pilot tenant','Other branch');
 const otherScope={tenantId,branchId:(await listBranches(db,otherProvider,tenantId))[0].id};
 const siblingId=(await admin.query("SELECT id FROM app.branches WHERE tenant_id=$1 AND id<>$2 LIMIT 1",[scope.tenantId,scope.branchId])).rows[0].id;
 for(const [target,identity] of [[otherScope,otherProvider],[{...scope,branchId:siblingId},provider]] as const){
  const customerId=await createCustomer(db,identity,target,'Pilot fixture');
  const programId=await createProgram(db,identity,target,'Pilot fixture');
  const sessionId=await createSession(db,identity,target,{programId,startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),capacity:2});
  const bookingId=await confirmBooking(db,identity,target,{sessionId,customerId,requestId:randomUUID()});
  await admin.query("UPDATE app_private.booking_outbox SET status='processing',attempts=5,lease_token=gen_random_uuid(),lease_until=now()-interval '1 minute' WHERE booking_id=$1",[bookingId]);
 }
 const before=(await admin.query('SELECT * FROM app_private.booking_outbox ORDER BY id')).rows;
 const client=await worker.connect();
 try{
  const preview=await previewNotificationScope(client,scope.tenantId,scope.branchId);
  assert.equal(preview.pending,1);assert.equal(preview.expired_leases,0);
  assert.deepEqual(Object.keys(preview).sort(),['active','branch_id','email_enabled','expired_leases','pending','processing','tenant_id']);
  await assert.rejects(previewNotificationScope(client,otherScope.tenantId,scope.branchId),code('22023'));
 }finally{client.release();}
 assert.deepEqual((await admin.query('SELECT * FROM app_private.booking_outbox ORDER BY id')).rows,before);
 const results=await Promise.all([claimScopedBookingNotifications(worker,scope),claimScopedBookingNotifications(worker,scope)]);
 assert.equal(results.flat().length,1);assert.equal(results.flat()[0].branch_id,scope.branchId);
 const outside=(rows:typeof before)=>rows.filter(r=>r.tenant_id!==scope.tenantId||r.branch_id!==scope.branchId);
 assert.deepEqual(outside((await admin.query('SELECT * FROM app_private.booking_outbox ORDER BY id')).rows),outside(before));
 await assert.rejects(db.query('SELECT app_private.preview_booking_notifications($1,$2)',[scope.tenantId,scope.branchId]),code('42501'));
 await assert.rejects(claimScopedBookingNotifications(worker,{...scope,tenantId:otherScope.tenantId}),code('22023'));
 await assert.rejects(claimScopedBookingNotifications(worker,undefined as never));
 await assert.rejects(claimScopedBookingNotifications(db,scope));
});

test('webhook facts arriving before receipts attach later, deduplicate concurrently and preserve out-of-order facts',async()=>{
 await readyWorkerBooking();const job=(await claimScopedBookingNotifications(worker,scope))[0];
 const hook=new Pool({connectionString:process.env.TEST_DATABASE_ADMIN_URL,options:'-c role=aismall_notification_webhook'});
 const emailId=randomUUID(),occurredAt=new Date().toISOString();
 const event={id:'msg_'+randomUUID(),emailId,type:'email.delivered',occurredAt};
 try{
  await Promise.all([saveDeliveryEvent(hook,event),saveDeliveryEvent(hook,event)]);
  await saveDeliveryEvent(hook,{...event,id:'msg_'+randomUUID(),type:'email.delivery_delayed',occurredAt:new Date(Date.now()-10000).toISOString()});
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM app_private.notification_delivery_events WHERE email_id=$1',[emailId])).rows[0].n,2);
  await recordNotificationReceipt(worker,job.id,job.lease_token,emailId);
  const c=await db.connect();
  try{
   await c.query('BEGIN');await c.query("SELECT set_config('app.user_id',$1,true),set_config('app.tenant_id',$2,true)",[user,scope.tenantId]);
   const result=(await c.query('SELECT app_private.notification_delivery_status($1,$2,$3) AS data',[scope.tenantId,scope.branchId,job.id])).rows[0].data;
   assert.equal(result.receipt_recorded,true);assert.deepEqual(result.events.map((e:{type:string})=>e.type),['email.delivered','email.delivery_delayed']);
   assert.ok(!JSON.stringify(result).includes(emailId));
   await assert.rejects(c.query('SELECT app_private.notification_delivery_status($1,$2,$3)',[scope.tenantId,randomUUID(),job.id]),code('42501'));
  }finally{await c.query('ROLLBACK');c.release();}
  await assert.rejects(saveDeliveryEvent(hook,{...event,type:'email.bounced'}),code('40001'));
  assert.equal((await admin.query('SELECT status FROM app_private.booking_outbox WHERE id=$1',[job.id])).rows[0].status,'delivered');
 }finally{await hook.end();}
});
test('receipt recording is atomic with completion, rejects stale leases and cross-job provider ID reuse',async()=>{
 await readyWorkerBooking();const job=(await claimScopedBookingNotifications(worker,scope))[0],emailId=randomUUID();
 await assert.rejects(recordNotificationReceipt(worker,job.id,randomUUID(),emailId),code('40001'));
 assert.equal((await admin.query('SELECT 1 FROM app_private.notification_receipts WHERE outbox_id=$1',[job.id])).rowCount,0);
 await recordNotificationReceipt(worker,job.id,job.lease_token,emailId);
 await readyWorkerBooking();const next=(await claimScopedBookingNotifications(worker,scope))[0];
 await assert.rejects(recordNotificationReceipt(worker,next.id,next.lease_token,emailId),code('23505'));
 assert.equal((await admin.query('SELECT status FROM app_private.booking_outbox WHERE id=$1',[next.id])).rows[0].status,'processing');
 assert.equal((await admin.query('SELECT 1 FROM app_private.notification_attempt_results WHERE outbox_id=$1',[next.id])).rowCount,0);
});
test('webhook role cannot read tables or claim mail; app and worker cannot ingest callbacks',async()=>{
 const hook=new Pool({connectionString:process.env.TEST_DATABASE_ADMIN_URL,options:'-c role=aismall_notification_webhook'});
 const event={id:'msg_'+randomUUID(),emailId:randomUUID(),type:'email.bounced',occurredAt:new Date().toISOString()};
 try{
  for(const pool of [admin,db,worker])await assert.rejects(saveDeliveryEvent(pool,event));
  for(const pool of [db,worker])await assert.rejects(pool.query('SELECT app_private.ingest_notification_delivery($1,$2,$3,$4)',[event.id,event.emailId,event.type,event.occurredAt]),code('42501'));
  await assert.rejects(hook.query('SELECT * FROM app_private.notification_delivery_events'),code('42501'));
  await assert.rejects(hook.query('SELECT app_private.claim_scoped_booking_notifications($1,$2,1)',[scope.tenantId,scope.branchId]),code('42501'));
 }finally{await hook.end();}
});
test('worker persists real adapter receipt together with accepted outcome',async()=>{
 await readyWorkerBooking();const emailId=randomUUID();
 const transport=resendTransport({apiKey:'re_synthetic',from:'sender@example.test',allowedRecipients:['recipient-'+recipient+'@example.test']},async()=>Response.json({id:emailId}));
 const result=await runNotificationBatch(worker,{enabled:true,scope,limit:1,verifier:validVerifier,transport});
 assert.equal(result.accepted,1);
 assert.equal((await admin.query('SELECT 1 FROM app_private.notification_receipts WHERE email_id=$1',[emailId])).rowCount,1);
});
