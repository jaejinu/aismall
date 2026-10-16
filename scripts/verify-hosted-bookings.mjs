import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
process.loadEnvFile('.env.local');
const ref=process.argv[2];
if(!ref||process.env.SUPABASE_URL!==`https://${ref}.supabase.co`) throw new Error('Exact development project reference required');
const c=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
let connected=false;
try {
 await c.connect();connected=true;await c.query('BEGIN');
 const owner=(await c.query('SELECT app_private.resolve_identity($1,$2) AS id',[`${process.env.SUPABASE_URL}/auth/v1`,randomUUID()])).rows[0].id;
 const tenant=(await c.query('SELECT app_private.create_first_organization($1,$2,$3) AS id',[owner,'Booking verification','Temporary branch'])).rows[0].id;
 await c.query("SELECT set_config('app.user_id',$1,true),set_config('app.tenant_id',$2,true)",[owner,tenant]);
 const branch=(await c.query('SELECT id FROM app.branches')).rows[0].id;
 const register=async(operation,payload)=>{
  const key=randomUUID(),args=[tenant,branch,key,operation,JSON.stringify(payload)];
  const first=(await c.query('SELECT app_private.register_booking_entity($1,$2,$3,$4,$5::jsonb) AS id',args)).rows[0].id;
  assert.equal((await c.query('SELECT app_private.register_booking_entity($1,$2,$3,$4,$5::jsonb) AS id',args)).rows[0].id,first);
  return first;
 };
 const customer=await register('customer',{name:'Synthetic customer'});
 const program=await register('program',{name:'Synthetic program'});
 const session=await register('session',{program,starts:new Date(Date.now()+3*86400000).toISOString(),ends:new Date(Date.now()+3*86400000+3600000).toISOString(),capacity:1});
 const request=randomUUID();
 const booking=(await c.query('SELECT app_private.confirm_booking($1,$2,$3,$4,$5) AS id',[tenant,branch,session,customer,request])).rows[0].id;
 assert.equal((await c.query('SELECT app_private.confirm_booking($1,$2,$3,$4,$5) AS id',[tenant,branch,session,customer,request])).rows[0].id,booking);
 const destination=(await c.query("SELECT app_private.create_session($1,$2,$3,now()+interval '4 days',now()+interval '4 days 1 hour',1) AS id",[tenant,branch,program])).rows[0].id;
 await c.query('SELECT app_private.reschedule_booking($1,$2,$3,$4,1,$5)',[tenant,branch,booking,destination,'Verification transfer']);
 assert.equal((await c.query('SELECT session_id FROM app.bookings WHERE id=$1',[booking])).rows[0].session_id,destination);
 assert.equal((await c.query('SELECT app_private.confirm_booking($1,$2,$3,$4,$5) AS id',[tenant,branch,session,customer,request])).rows[0].id,booking);
 await c.query('SELECT app_private.cancel_booking($1,$2,$3,2,$4)',[tenant,branch,booking,'Verification']);
 const result=(await c.query('SELECT status,version FROM app.bookings WHERE id=$1',[booking])).rows[0];
 assert.deepEqual(result,{status:'cancelled',version:3});
 // A short-lived synthetic session permits real attendance checks without editing past data.
 const shortSession=(await c.query("SELECT app_private.create_session($1,$2,$3,clock_timestamp()+interval '2 seconds',clock_timestamp()+interval '3 seconds',1) AS id",[tenant,branch,program])).rows[0].id;
 const shortBooking=(await c.query('SELECT app_private.confirm_booking($1,$2,$3,$4,$5) AS id',[tenant,branch,shortSession,customer,randomUUID()])).rows[0].id;
 await c.query('SELECT pg_sleep(3.5)');
 await c.query('SELECT app_private.record_attendance($1,$2,$3,1,$4,$5)',[tenant,branch,shortBooking,'no_show','Verification attendance']);
 await c.query('SELECT app_private.record_attendance($1,$2,$3,2,$4,$5)',[tenant,branch,shortBooking,'attended','Verification correction']);
 assert.deepEqual((await c.query('SELECT attendance,version FROM app.bookings WHERE id=$1',[shortBooking])).rows[0],{attendance:'attended',version:3});
 assert.equal((await c.query('SELECT id FROM app.audit_events')).rowCount,12);
 await c.query("SELECT set_config('app.tenant_id',$1,true)",[randomUUID()]);
 for(const table of ['customers','programs','sessions','bookings']) assert.equal((await c.query(`SELECT id FROM app.${table}`)).rowCount,0);
 console.log('Hosted registration replay, booking, transfer, cancellation, attendance/correction, idempotency, RLS and audit passed.');
} catch(error) {console.error('Hosted booking verification failed; code:',error?.code || 'validation');process.exitCode=1;}
finally {
 if(connected) try {await c.query('ROLLBACK');console.log('Rolled back: no verification data committed.');}catch{process.exitCode=1;}
 await c.end();
}
