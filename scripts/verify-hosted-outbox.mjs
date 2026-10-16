import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
process.loadEnvFile('.env.local');
const ref=process.argv[2];
if(!ref||process.env.SUPABASE_URL!==`https://${ref}.supabase.co`)throw new Error('Exact development project reference required');
const c=new pg.Client({connectionString:process.env.DATABASE_ADMIN_URL,connectionTimeoutMillis:5000});
let connected=false;let stage='connect';
try{
 await c.connect();connected=true;await c.query('BEGIN');
 // Migration owner checks storage in one rollback-only transaction; role grants are checked explicitly.
 stage='check idle queue';
 assert.equal((await c.query("SELECT count(*)::int AS count FROM app_private.booking_outbox WHERE status IN ('pending','processing')")).rows[0].count,0,'Use an idle development queue for rollback verification');
 stage='check role privileges';
 const grants=(await c.query("SELECT has_function_privilege('aismall_notification_worker','app_private.claim_booking_notifications(integer)','EXECUTE') AS worker,has_function_privilege('aismall_app','app_private.claim_booking_notifications(integer)','EXECUTE') AS web")).rows[0];
 assert.equal(grants.worker,true);assert.equal(grants.web,false);
 stage='create synthetic booking';
 const actor=(await c.query('SELECT app_private.resolve_identity($1,$2) AS id',[process.env.SUPABASE_URL+'/auth/v1',randomUUID()])).rows[0].id;
 const tenant=(await c.query('SELECT app_private.create_first_organization($1,$2,$3) AS id',[actor,'Outbox verification','Temporary branch'])).rows[0].id;
 await c.query("SELECT set_config('app.user_id',$1,true),set_config('app.tenant_id',$2,true)",[actor,tenant]);
 const branch=(await c.query('SELECT id FROM app.branches WHERE tenant_id=$1',[tenant])).rows[0].id;
 const customer=(await c.query('SELECT app_private.create_customer($1,$2,$3) AS id',[tenant,branch,'Synthetic customer'])).rows[0].id;
 const program=(await c.query('SELECT app_private.create_program($1,$2,$3) AS id',[tenant,branch,'Synthetic program'])).rows[0].id;
 const session=(await c.query("SELECT app_private.create_session($1,$2,$3,now()+interval '4 days',now()+interval '4 days 1 hour',1) AS id",[tenant,branch,program])).rows[0].id;
 const key=randomUUID();
 const booking=(await c.query('SELECT app_private.confirm_booking($1,$2,$3,$4,$5) AS id',[tenant,branch,session,customer,key])).rows[0].id;
 assert.equal((await c.query('SELECT app_private.confirm_booking($1,$2,$3,$4,$5) AS id',[tenant,branch,session,customer,key])).rows[0].id,booking);
 await c.query('SELECT app_private.cancel_booking($1,$2,$3,1,$4)',[tenant,branch,booking,'Verification']);
 const rows=(await c.query('SELECT event,booking_version FROM app_private.booking_outbox WHERE booking_id=$1 ORDER BY booking_version',[booking])).rows;
 assert.deepEqual(rows,[{event:'booking.confirmed',booking_version:1},{event:'booking.cancelled',booking_version:2}]);
 const monitor=(await c.query("SELECT app_private.booking_notification_status($1,$2,'all',1) AS data",[tenant,branch])).rows[0].data;
 assert.equal(monitor.items.length,2);assert.equal(monitor.counts.pending,2);
 assert.equal(monitor.hasMore,false);
 assert.ok(monitor.items.every(row=>!('payload' in row)&&!('lease_token' in row)));
 // The queue was verified idle before creating these synthetic events. No provider is invoked.
 stage='preview synthetic scope';
 const preview=(await c.query('SELECT app_private.preview_booking_notifications($1,$2) AS data',[tenant,branch])).rows[0].data;
 assert.equal(preview.pending,2);assert.equal(preview.processing,0);assert.equal(preview.email_enabled,false);
 for(const signature of ['claim_scoped_booking_notifications(uuid,uuid,integer)','preview_booking_notifications(uuid,uuid)']){
  assert.deepEqual((await c.query("SELECT has_function_privilege('aismall_app',$1,'EXECUTE') AS web,has_function_privilege('aismall_notification_worker',$1,'EXECUTE') AS worker",['app_private.'+signature])).rows[0],{web:false,worker:true});
 }
 stage='claim synthetic event';
 const claimed=(await c.query('SELECT app_private.claim_scoped_booking_notifications($1,$2,50) AS job',[tenant,branch])).rows.map(r=>r.job).find(j=>j.booking_id===booking);
 assert.ok(claimed);assert.equal(claimed.event,'booking.confirmed');
 await c.query("SELECT app_private.finish_booking_notification($1,$2,'temporary')",[claimed.id,claimed.lease_token]);
 const retry=(await c.query('SELECT status,attempts,last_error FROM app_private.booking_outbox WHERE id=$1',[claimed.id])).rows[0];
 assert.deepEqual(retry,{status:'pending',attempts:1,last_error:'temporary'});
  const filtered=(await c.query("SELECT app_private.booking_notification_status($1,$2,'pending',1) AS data",[tenant,branch])).rows[0].data;
 assert.equal(filtered.items.find(i=>i.id===claimed.id).last_error,'temporary');
 assert.ok(!JSON.stringify(filtered).includes(claimed.lease_token));
 stage='manual redrive';
 await c.query("UPDATE app_private.booking_outbox SET status='delivered',finished_at=now() WHERE id=$1",[claimed.id]);
 const latest=(await c.query('SELECT app_private.claim_scoped_booking_notifications($1,$2,50) AS job',[tenant,branch])).rows.map(r=>r.job).find(j=>j.booking_id===booking);
 assert.equal(latest.event,'booking.cancelled');
 await c.query("SELECT app_private.finish_booking_notification($1,$2,'permanent')",[latest.id,latest.lease_token]);
 for(let i=0;i<2;i++)await c.query('SELECT app_private.redrive_booking_notification($1,$2,$3,0)',[tenant,branch,latest.id]);
 assert.deepEqual((await c.query('SELECT status,redrive_count,attempts FROM app_private.booking_outbox WHERE id=$1',[latest.id])).rows[0],{status:'pending',redrive_count:1,attempts:0});
 assert.equal((await c.query('SELECT count(*)::int AS n FROM app_private.notification_redrives WHERE outbox_id=$1',[latest.id])).rows[0].n,1);
 const permission=(await c.query("SELECT has_function_privilege('aismall_app','app_private.redrive_booking_notification(uuid,uuid,uuid,integer)','EXECUTE') AS web,has_function_privilege('aismall_notification_worker','app_private.redrive_booking_notification(uuid,uuid,uuid,integer)','EXECUTE') AS worker")).rows[0];
 assert.deepEqual(permission,{web:true,worker:false});
 stage='recipient and consent gate';
 const recipient=(await c.query('SELECT app_private.resolve_identity($1,$2) AS id',[process.env.SUPABASE_URL+'/auth/v1',randomUUID()])).rows[0].id;
 const hash=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');
 const link=(await c.query('SELECT app_private.invite_customer($1,$2,$3,$4,$5) AS id',[tenant,branch,customer,'synthetic@example.test',hash])).rows[0].id;
 await c.query('SELECT app_private.accept_customer($1,$2,$3)',[recipient,'synthetic@example.test',hash]);
 const leased=(await c.query('SELECT app_private.claim_scoped_booking_notifications($1,$2,50) AS job',[tenant,branch])).rows.map(r=>r.job).find(j=>j.id===latest.id);
 const preflight=async()=>(await c.query('SELECT app_private.prepare_booking_notification($1,$2) AS data',[leased.id,leased.lease_token])).rows[0].data;
 assert.deepEqual(await preflight(),{allowed:false,reason:'consent_missing'});
 await c.query('SELECT app_private.set_notification_preference($1,$2,$3,true,0)',[recipient,link,'synthetic@example.test']);
 assert.deepEqual(await preflight(),{allowed:false,reason:'before_consent'});
 await c.query('SELECT app_private.set_notification_preference($1,$2,NULL,false,1)',[recipient,link]);
 assert.deepEqual(await preflight(),{allowed:false,reason:'consent_missing'});
 assert.equal((await c.query('SELECT count(*)::int AS n FROM app_private.notification_preference_events WHERE link_id=$1',[link])).rows[0].n,2);
 assert.deepEqual((await c.query("SELECT has_function_privilege('aismall_app','app_private.prepare_booking_notification(uuid,uuid)','EXECUTE') AS web,has_function_privilege('aismall_notification_worker','app_private.prepare_booking_notification(uuid,uuid)','EXECUTE') AS worker")).rows[0],{web:false,worker:true});
 stage='worker result audit';
 assert.equal((await c.query('SELECT app_private.notification_auth_identity($1,$2) AS data',[leased.id,leased.lease_token])).rows[0].data,null);
 assert.equal((await c.query("SELECT app_private.record_notification_result($1,$2,'consent_missing') AS status",[leased.id,leased.lease_token])).rows[0].status,'dead');
 assert.equal((await c.query('SELECT reason FROM app_private.notification_attempt_results WHERE outbox_id=$1',[leased.id])).rows[0].reason,'consent_missing');
 assert.deepEqual((await c.query("SELECT has_function_privilege('aismall_app','app_private.record_notification_result(uuid,uuid,text)','EXECUTE') AS web,has_function_privilege('aismall_notification_worker','app_private.record_notification_result(uuid,uuid,text)','EXECUTE') AS worker")).rows[0],{web:false,worker:true});
 const finalMonitor=(await c.query("SELECT app_private.booking_notification_status($1,$2,'dead',1) AS data",[tenant,branch])).rows[0].data;
 const latestResult=finalMonitor.items.find(i=>i.id===leased.id).last_result;
 assert.equal(latestResult.reason,'consent_missing');assert.equal(latestResult.generation,1);assert.equal(latestResult.attempt,1);
 assert.deepEqual(Object.keys(latestResult).sort(),['attempt','created_at','generation','reason']);
 assert.ok(!JSON.stringify(finalMonitor).includes(leased.lease_token));
 stage='delivery webhook grants and receipt';
 for(const [role,signature] of [['aismall_notification_worker','record_notification_receipt(uuid,uuid,uuid)'],['aismall_notification_webhook','ingest_notification_delivery(text,uuid,text,timestamptz)']]){
  assert.equal((await c.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",[role,'app_private.'+signature])).rows[0].allowed,true);
  assert.equal((await c.query("SELECT has_function_privilege('aismall_app',$1,'EXECUTE') AS allowed",['app_private.'+signature])).rows[0].allowed,false);
 }
 const receiptEmail=randomUUID(),receiptToken=randomUUID(),receiptEvent='msg_'+randomUUID();
 // Synthetic job only, inside this rollback transaction.
 await c.query("UPDATE app_private.booking_outbox SET status='processing',attempts=attempts+1,lease_token=$2,lease_until=now()+interval '1 minute',finished_at=NULL WHERE id=$1",[leased.id,receiptToken]);
 await c.query("SELECT app_private.ingest_notification_delivery($1,$2,'email.delivered',now())",[receiptEvent,receiptEmail]);
 await c.query('SELECT app_private.record_notification_receipt($1,$2,$3)',[leased.id,receiptToken,receiptEmail]);
 const delivery=(await c.query('SELECT app_private.notification_delivery_status($1,$2,$3) AS data',[tenant,branch,leased.id])).rows[0].data;
 assert.equal(delivery.receipt_recorded,true);assert.equal(delivery.events[0].type,'email.delivered');
 assert.ok(!JSON.stringify(delivery).includes(receiptEmail));
 const deliveryMonitor=(await c.query("SELECT app_private.booking_notification_status($1,$2,'delivered',1) AS data",[tenant,branch])).rows[0].data;
 assert.deepEqual(deliveryMonitor.items.find(i=>i.id===leased.id).delivery,delivery);
 assert.ok(delivery.last_received_at);
 assert.ok(!JSON.stringify(deliveryMonitor).includes(receiptEmail));
 stage='suppression gate';
 await c.query("SELECT app_private.ingest_notification_delivery($1,$2,'email.bounced',now())",['msg_'+randomUUID(),receiptEmail]);
 assert.equal((await c.query('SELECT app_private.notification_recipient_suppressed($1,$2,$3) AS blocked',[tenant,branch,customer])).rows[0].blocked,true);
 assert.equal((await c.query('SELECT app_private.notification_recipient_suppressed($1,$2,$3) AS blocked',[tenant,randomUUID(),customer])).rows[0].blocked,false);
 const suppressionToken=randomUUID();
 await c.query("UPDATE app_private.booking_outbox SET status='processing',lease_token=$2,lease_until=now()+interval '1 minute',finished_at=NULL WHERE id=$1",[leased.id,suppressionToken]);
 assert.deepEqual((await c.query('SELECT app_private.prepare_booking_notification($1,$2) AS data',[leased.id,suppressionToken])).rows[0].data,{allowed:false,reason:'recipient_suppressed'});
 console.log('Hosted outbox, consent gates, result audit and safe monitor projection and scoped pilot and delivery webhook storage passed.');
}catch(e){console.error('Hosted outbox verification failed at',stage,'code:',e?.code||'validation');process.exitCode=1;}
finally{
 if(connected)try{await c.query('ROLLBACK');console.log('Rolled back. No messages sent and no verification data committed.');}catch{process.exitCode=1;}
 await c.end();
}
