import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { withTenant, AccessDenied } from '../src/server/access/tenant.ts';
import { listBranches, renameBranch } from '../src/server/services/branches.ts';

// Explicit opt-in for a disposable fixture in the selected DEVELOPMENT project.
process.loadEnvFile('.env.local');
const ref = process.argv[2];
if (!ref || process.env.SUPABASE_URL !== `https://${ref}.supabase.co`) throw new Error('Exact development project reference required');
const admin = new pg.Client({ connectionString:process.env.DATABASE_ADMIN_URL, connectionTimeoutMillis:5000 });
const pool = new pg.Pool({ connectionString:process.env.DATABASE_URL, max:1, connectionTimeoutMillis:5000 });
const [a,b,ba,bb,user,staff,ma,mb,ms] = Array.from({length:9},()=>randomUUID());
const provider = id=>({getVerifiedSession:async()=>({userId:id,expiresAt:Date.now()+60000})});
let stage = 'fixture setup';
let connected = false;
try {
  await admin.connect(); connected = true;
  await admin.query('BEGIN');
  await admin.query("INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1::uuid,'integration-check',$1::text),($2::uuid,'integration-check',$2::text)",[user,staff]);
  await admin.query('INSERT INTO app.tenants(id,slug,name) VALUES($1,$3,\'Integration A\'),($2,$4,\'Integration B\')',[a,b,`check-${a}`,`check-${b}`]);
  await admin.query("INSERT INTO app.staff_memberships(id,tenant_id,user_id,role) VALUES($1,$4,$6,'tenant_admin'),($2,$5,$6,'tenant_admin'),($3,$4,$7,'branch_staff')",[ma,mb,ms,a,b,user,staff]);
  await admin.query("INSERT INTO app.branches(id,tenant_id,slug,name) VALUES($1,$3,'test','Integration A'),($2,$4,'test','Integration B')",[ba,bb,a,b]);
  await admin.query("INSERT INTO app.branch_assignments(tenant_id,membership_id,branch_id,role) VALUES($1,$2,$3,'staff')",[a,ms,ba]);
  await admin.query('COMMIT');
  stage = 'tenant and branch isolation';
  assert.deepEqual((await listBranches(pool,provider(user),a)).map(r=>r.id),[ba]);
  assert.deepEqual((await listBranches(pool,provider(user),b)).map(r=>r.id),[bb]);
  await assert.rejects(listBranches(pool,provider(staff),b),AccessDenied);
  await withTenant(pool,provider(staff),a,async client=>{
    assert.deepEqual((await client.query('SELECT id FROM app.branches')).rows,[{id:ba}]);
  });
  stage = 'version and audit';
  assert.equal((await renameBranch(pool,provider(user),{tenantId:a,branchId:ba,name:'Verified',expectedVersion:1})).version,2);
  assert.equal((await admin.query('SELECT id FROM app.audit_events WHERE tenant_id=$1',[a])).rowCount,1);
  stage = 'pooled context reset';
  assert.equal((await pool.query('SELECT id FROM app.branches')).rowCount,0);
  stage = 'revocation';
  await admin.query("UPDATE app.staff_memberships SET status='revoked' WHERE id=$1",[ms]);
  await assert.rejects(listBranches(pool,provider(staff),a),AccessDenied);
  console.log('Hosted checks passed: tenant scope, cross-tenant denial, branch RLS, version/audit, pooled context reset, revocation.');
} catch (error) {
  console.error(`Hosted verification failed at ${stage} (${error.code || "CHECK_FAILED"}); credentials hidden.`);
  process.exitCode = 1;
} finally {
  if (connected) {
    try {
      await admin.query('ROLLBACK');
      await admin.query('BEGIN');
      for (const table of ['audit_events','branch_assignments','staff_memberships','branches'])
        await admin.query(`DELETE FROM app.${table} WHERE tenant_id=ANY($1::uuid[])`,[[a,b]]);
      await admin.query('DELETE FROM app.tenants WHERE id=ANY($1::uuid[])',[[a,b]]);
      await admin.query('DELETE FROM app.users WHERE id=ANY($1::uuid[])',[[user,staff]]);
      await admin.query('COMMIT');
      console.log('Only this run\'s temporary fixtures were removed.');
    } catch {
      console.error(`Fixture cleanup failed; inspect test tenant IDs ${a}, ${b}.`);
      process.exitCode = 1;
    }
  }
  await pool.end(); await admin.end();
}
