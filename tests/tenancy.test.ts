import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { inspectRuntimeDatabase } from '../scripts/lib/provider-config.mjs';
import { withTenant, AccessDenied } from '../src/server/access/tenant';
import { AuthenticationRequired, type SessionProvider } from '../src/server/auth/session';
import { listBranches, renameBranch, VersionConflict } from '../src/server/services/branches';
const db = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 1 });
const admin = new Pool({ connectionString: process.env.TEST_DATABASE_ADMIN_URL });
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const A = id(1), B = id(2), a1 = id(11), a2 = id(12), b1 = id(13);
const session = (n: number): SessionProvider => ({ getVerifiedSession: async () => ({ userId: id(n), expiresAt: Date.now() + 60000 }) });
before(async () => {
  await admin.query(`INSERT INTO app.tenants(id,slug,name) VALUES ($1,'a','A'),($2,'b','B')`, [A,B]);
  for (const n of [21,22,23,24]) await admin.query(`INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1,'test',$2)`, [id(n),String(n)]);
  for (const [n,t,u,r] of [[31,A,21,'tenant_admin'],[32,B,21,'tenant_admin'],[33,A,22,'branch_staff'],[34,A,23,'branch_staff'],[35,A,24,'branch_staff']] as const)
    await admin.query('INSERT INTO app.staff_memberships(id,tenant_id,user_id,role) VALUES($1,$2,$3,$4)', [id(n),t,id(u),r]);
  for (const [b,t,slug] of [[a1,A,'one'],[a2,A,'two'],[b1,B,'one']]) await admin.query('INSERT INTO app.branches(id,tenant_id,slug,name) VALUES($1,$2,$3,$3)',[b,t,slug]);
  for (const [m,r] of [[33,'branch_owner'],[34,'staff'],[35,'manager']] as const) await admin.query('INSERT INTO app.branch_assignments(tenant_id,membership_id,branch_id,role) VALUES($1,$2,$3,$4)',[A,id(m),a1,r]);
});
after(async () => { await db.end(); await admin.end(); });
test('missing and expired sessions are rejected', async () => {
  await assert.rejects(listBranches(db,{getVerifiedSession:async()=>null},A),AuthenticationRequired);
  await assert.rejects(listBranches(db,{getVerifiedSession:async()=>({userId:id(21),expiresAt:0})},A),AuthenticationRequired);
});
test('RLS defaults to no data without context', async () => {
  assert.equal((await db.query('SELECT * FROM app.branches')).rowCount,0);
});
test('same account can switch tenants with no pooled context leakage', async () => {
  assert.deepEqual((await listBranches(db,session(21),A)).map(x=>x.id).sort(),[a1,a2]);
  assert.deepEqual((await listBranches(db,session(21),B)).map(x=>x.id),[b1]);
  assert.equal((await db.query('SELECT * FROM app.branches')).rowCount,0);
});
test('raw query without WHERE still enforces branch scope', async () => {
  await withTenant(db,session(23),A,async c=>assert.deepEqual((await c.query('SELECT id FROM app.branches')).rows,[{id:a1}]));
  await assert.rejects(listBranches(db,session(23),B),AccessDenied);
});
test('staff and manager cannot rename; owner cannot rename other branches', async () => {
  for(const [u,b] of [[23,a1],[24,a1],[22,a2],[22,b1]] as const) await assert.rejects(renameBranch(db,session(u),{tenantId:A,branchId:b,name:'Denied',expectedVersion:1}),AccessDenied);
});
test('owner rename increments version and writes audit atomically', async () => {
  const updated=await renameBranch(db,session(22),{tenantId:A,branchId:a1,name:'Updated',expectedVersion:1});
  assert.equal(updated.version,2);
  const {rows}=await admin.query('SELECT * FROM app.audit_events WHERE branch_id=$1',[a1]);
  assert.equal(rows.length,1); assert.equal(rows[0].actor_user_id,id(22)); assert.equal(rows[0].details.after,'Updated');
});
test('concurrent stale writes have exactly one winner', async () => {
  const concurrent = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 });
  const results=await Promise.allSettled(['X','Y'].map(name=>renameBranch(concurrent,session(21),{tenantId:A,branchId:a1,name,expectedVersion:2})));
  await concurrent.end();
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  const failure=results.find(x=>x.status==='rejected'); assert.ok(failure?.status==='rejected' && failure.reason instanceof VersionConflict);
});
test('failed transaction rolls back changes and clears context', async () => {
  const before=(await listBranches(db,session(21),A)).find(x=>x.id===a1);
  await assert.rejects(withTenant(db,session(21),A,async c=>{await c.query("UPDATE app.branches SET name='rollback' WHERE id=$1",[a1]);throw new Error('rollback');}),/rollback/);
  assert.deepEqual((await listBranches(db,session(21),A)).find(x=>x.id===a1),before);
  assert.equal((await db.query('SELECT * FROM app.branches')).rowCount,0);
});
test('runtime cannot change tenancy, identities, grants, or audit history', async () => {
  for(const sql of ["UPDATE app.branches SET tenant_id=tenant_id", "UPDATE app.staff_memberships SET role='tenant_admin'",'DELETE FROM app.audit_events','TRUNCATE app.branches','ALTER TABLE app.branches DISABLE ROW LEVEL SECURITY'])
    await assert.rejects(withTenant(db,session(21),A,async c=>{await c.query(sql);}), (e: unknown)=>(e as {code:string}).code==='42501');
});
test('cross-tenant assignment fails composite foreign key even for migration owner', async () => {
  await assert.rejects(admin.query("INSERT INTO app.branch_assignments(tenant_id,membership_id,branch_id,role) VALUES($1,$2,$3,'staff')",[A,id(33),b1]),(e:unknown)=>(e as {code:string}).code==='23503');
});
test('revoked memberships, users, assignments and suspended tenants deny subsequent access', async () => {
  for(const [table,key,value,subject] of [['staff_memberships','id',id(34),'revoked'],['users','id',id(23),'suspended'],['tenants','id',A,'suspended']] as const) {
    await admin.query(`UPDATE app.${table} SET status=$1 WHERE ${key}=$2`,[subject,value]);
    try {await assert.rejects(listBranches(db,session(23),A),AccessDenied);}
    finally {await admin.query(`UPDATE app.${table} SET status='active' WHERE ${key}=$1`,[value]);}
  }
  await admin.query("UPDATE app.branch_assignments SET status='revoked' WHERE membership_id=$1",[id(34)]);
  assert.deepEqual(await listBranches(db,session(23),A),[]);
});
test('privileged connection is rejected by server boundary', async () => {
  await assert.rejects(listBranches(admin,session(21),A),/최소 권한/);
});

test('audit failure rolls back the branch write', async () => {
  const before=(await listBranches(db,session(21),A)).find(x=>x.id===a1)!;
  await admin.query("CREATE FUNCTION app_private.fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END $$; CREATE TRIGGER fail_audit BEFORE INSERT ON app.audit_events FOR EACH ROW EXECUTE FUNCTION app_private.fail_audit()");
  try {
    await assert.rejects(renameBranch(db,session(21),{tenantId:A,branchId:a1,name:'Must rollback',expectedVersion:before.version}),/audit unavailable/);
    assert.deepEqual((await listBranches(db,session(21),A)).find(x=>x.id===a1),before);
  } finally { await admin.query('DROP TRIGGER fail_audit ON app.audit_events; DROP FUNCTION app_private.fail_audit()'); }
});
test('session expiry during work rolls back the transaction', async () => {
  const before=(await listBranches(db,session(21),A)).find(x=>x.id===a1)!;
  const shortSession: SessionProvider={getVerifiedSession:async()=>({userId:id(21),expiresAt:Date.now()+100})};
  await assert.rejects(withTenant(db,shortSession,A,async c=>{
    await c.query("UPDATE app.branches SET name='expired' WHERE id=$1",[a1]);
    await c.query('SELECT pg_sleep(0.15)');
  }),AuthenticationRequired);
  assert.deepEqual((await listBranches(db,session(21),A)).find(x=>x.id===a1),before);
});

test('provider readiness accepts the restricted runtime database', async () => {
  const client=await db.connect();
  try { await inspectRuntimeDatabase(client); } finally { client.release(); }
});
test('provider readiness rejects a migration owner', async () => {
  const client=await admin.connect();
  try { await assert.rejects(inspectRuntimeDatabase(client),/restricted/); } finally { client.release(); }
});
