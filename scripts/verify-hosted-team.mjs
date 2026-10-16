import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
process.loadEnvFile('.env.local');
const ref=process.argv[2];
if(!ref||process.env.SUPABASE_URL!==`https://${ref}.supabase.co`)throw new Error('Exact development project reference required');
const c=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});let connected=false;
try{
  await c.connect();connected=true;await c.query('BEGIN');
  const identity=async()=>(await c.query('SELECT app_private.resolve_identity($1,$2) AS id',[`${process.env.SUPABASE_URL}/auth/v1`,randomUUID()])).rows[0].id;
  const owner=await identity(),staff=await identity();
  const tenant=(await c.query('SELECT app_private.create_first_organization($1,$2,$3) AS id',[owner,'Team verification','Temporary branch'])).rows[0].id;
  await c.query("SELECT set_config('app.user_id',$1,true),set_config('app.tenant_id',$2,true)",[owner,tenant]);
  const branch=(await c.query('SELECT id FROM app.branches')).rows[0].id;
  const hash=createHash('sha256').update(randomBytes(32)).digest('hex');
  await c.query('SELECT app_private.invite_staff($1,$2,$3,$4,$5,$6)',[owner,tenant,'hosted-check@example.invalid',branch,'staff',hash]);
  assert.equal((await c.query('SELECT app_private.accept_staff_invitation($1,$2,$3) AS id',[staff,'hosted-check@example.invalid',hash])).rows[0].id,tenant);
  let team=(await c.query('SELECT app_private.team_snapshot($1,$2) AS team',[owner,tenant])).rows[0].team;
  const member=team.members.find(m=>m.role==='branch_staff');assert.ok(member);
  await c.query('SELECT app_private.assign_staff($1,$2,$3,$4,$5,$6)',[owner,tenant,member.id,branch,'manager',1]);
  await c.query("SELECT set_config('app.user_id',$1,true)",[staff]);
  assert.equal((await c.query('SELECT id FROM app.branches')).rowCount,1);
  await c.query('SELECT app_private.revoke_staff($1,$2,$3,$4)',[owner,tenant,member.id,2]);
  assert.equal((await c.query('SELECT id FROM app.branches')).rowCount,0);
  team=(await c.query('SELECT app_private.team_snapshot($1,$2) AS team',[owner,tenant])).rows[0].team;
  assert.equal(team.members.find(m=>m.id===member.id).status,'revoked');
  await c.query("SELECT set_config('app.user_id',$1,true)",[owner]);
  assert.equal((await c.query('SELECT id FROM app.audit_events')).rowCount,5);
  console.log('Hosted invitation, acceptance, assignment, revocation, RLS and audit passed.');
}catch{console.error('Hosted team verification failed; credentials hidden.');process.exitCode=1;}
finally{
  if(connected)try{await c.query('ROLLBACK');console.log('Verification rolled back; no users, teams or invitations committed.');}catch{console.error('Rollback acknowledgement unavailable; closing connection.');process.exitCode=1;}
  await c.end();
}
