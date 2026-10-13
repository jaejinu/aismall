import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
process.loadEnvFile('.env.local');
const ref = process.argv[2];
if (!ref || process.env.SUPABASE_URL !== `https://${ref}.supabase.co`) throw new Error('Exact development project reference required');
const client = new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
let connected = false;
try {
  await client.connect(); connected = true;
  await client.query('BEGIN');
  const subject=randomUUID();
  const resolve=()=>client.query('SELECT app_private.resolve_identity($1,$2) AS id',[`${process.env.SUPABASE_URL}/auth/v1`,subject]);
  const user=(await resolve()).rows[0].id;
  assert.equal((await resolve()).rows[0].id,user);
  const onboard=()=>client.query('SELECT app_private.create_first_organization($1,$2,$3) AS id',[user,'Hosted verification','Test branch']);
  const tenant=(await onboard()).rows[0].id;
  assert.equal((await onboard()).rows[0].id,tenant);
  assert.equal((await client.query('SELECT * FROM app_private.my_organizations($1)',[user])).rows[0].id,tenant);
  await client.query("SELECT set_config('app.user_id',$1,true),set_config('app.tenant_id',$2,true)",[user,tenant]);
  assert.equal((await client.query('SELECT id FROM app.branches')).rowCount,1);
  assert.equal((await client.query("SELECT id FROM app.audit_events WHERE action='organization.created'")).rowCount,1);
  console.log('Hosted identity mapping, idempotent onboarding, membership, branch and audit passed.');
} catch {
  console.error('Hosted onboarding check failed; credentials hidden.');process.exitCode=1;
} finally {
  if (connected) {
    try { await client.query('ROLLBACK'); console.log('Verification transaction rolled back; no test data committed.'); }
    catch { console.error('Rollback acknowledgement unavailable; connection will close.');process.exitCode=1; }
  }
  await client.end();
}
