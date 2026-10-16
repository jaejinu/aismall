import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseSessionProvider } from '../src/server/auth/provider';
import { createFirstOrganization, listOrganizations } from '../src/server/services/organizations';
import { listBranches } from '../src/server/services/branches';
import { AuthenticationRequired, type SessionProvider } from '../src/server/auth/session';
const db = new Pool({connectionString:process.env.TEST_DATABASE_URL,max:3});
const admin = new Pool({connectionString:process.env.TEST_DATABASE_ADMIN_URL});
const issuer = 'https://testproject.supabase.co/auth/v1';
const subject = randomUUID();
const claims = {iss:issuer,sub:subject,exp:Math.floor(Date.now()/1000)+120};
function client(overrides: Record<string, unknown> = {}, userOverrides: Record<string, unknown> = {}, userError: unknown = null) {
  return {auth:{
    getUser:async()=>({data:{user:{id:subject,email_confirmed_at:'2026-10-14',...userOverrides}},error:userError}),
    getClaims:async()=>({data:{claims:{...claims,...overrides}},error:null}),
  }} as unknown as Pick<SupabaseClient,'auth'>;
}
const provider = supabaseSessionProvider(client(),db,issuer);
after(async()=>{await db.end();await admin.end();});
test('verified subject maps idempotently; distinct issuer does not merge identity',async()=>{
  const [a,b]=await Promise.all([provider.getVerifiedSession(),provider.getVerifiedSession()]);
  assert.ok(a);assert.equal(a.userId,b?.userId);
  assert.notEqual(a.userId,subject);
  const other=await supabaseSessionProvider(client({iss:'https://another.supabase.co/auth/v1'}),db,'https://another.supabase.co/auth/v1').getVerifiedSession();
  assert.notEqual(a.userId,other?.userId);
});
test('forged issuer/subject, expired claims, unconfirmed/anonymous and invalid server user are rejected before DB mapping',async()=>{
  for(const fake of [client({iss:'https://evil.example'}),client({sub:randomUUID()}),client({exp:0}),client({}, {email_confirmed_at:null}),client({}, {is_anonymous:true}),client({}, {},new Error('revoked'))])
    assert.equal(await supabaseSessionProvider(fake,db,issuer).getVerifiedSession(),null);
});
test('first organization is atomic and duplicate submissions create one tenant',async()=>{
  const actor=await provider.getVerifiedSession();assert.ok(actor);
  assert.deepEqual(await listOrganizations(db,provider),[]);
  const results=await Promise.all([createFirstOrganization(db,provider,'검증 조직','첫 지점'),createFirstOrganization(db,provider,'검증 조직','첫 지점')]);
  assert.equal(results[0],results[1]);
  const orgs=await listOrganizations(db,provider);assert.equal(orgs.length,1);assert.equal(orgs[0].role,'tenant_admin');
  assert.equal((await listBranches(db,provider,results[0]))[0].name,'첫 지점');
  assert.equal((await admin.query('SELECT id FROM app.audit_events WHERE tenant_id=$1 AND action=$2',[results[0],'organization.created'])).rowCount,1);
  const unrelated:SessionProvider={getVerifiedSession:async()=>({userId:randomUUID(),expiresAt:Date.now()+60000})};
  assert.deepEqual(await listOrganizations(db,unrelated),[]);
  await assert.rejects(createFirstOrganization(db,unrelated,'Other','Other'));
});
test('onboarding failure rolls back all records including membership and audit',async()=>{
  const otherSubject=randomUUID();
  const {rows}=await db.query('SELECT app_private.resolve_identity($1,$2) AS id',[issuer,otherSubject]);
  const actor=rows[0].id;
  const p:SessionProvider={getVerifiedSession:async()=>({userId:actor,expiresAt:Date.now()+60000})};
  await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT reject_onboarding CHECK (action <> 'organization.created') NOT VALID");
  try {await assert.rejects(createFirstOrganization(db,p,'rollback','rollback'));}
  finally {await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT reject_onboarding');}
  assert.deepEqual(await listOrganizations(db,p),[]);
  assert.equal((await admin.query('SELECT * FROM app_private.first_organizations WHERE user_id=$1',[actor])).rowCount,0);
});
test('suspended identity cannot resolve or onboard; revoked organization is not resurrected by retry',async()=>{
  const actor=await provider.getVerifiedSession();assert.ok(actor);
  await admin.query("UPDATE app.staff_memberships SET status='revoked' WHERE user_id=$1",[actor.userId]);
  assert.deepEqual(await listOrganizations(db,provider),[]);
  await assert.rejects(createFirstOrganization(db,provider,'again','again'));
  await admin.query("UPDATE app.users SET status='suspended' WHERE id=$1",[actor.userId]);
  await assert.rejects(provider.getVerifiedSession());
});
test('onboarding validates authentication and names without writing',async()=>{
  await assert.rejects(createFirstOrganization(db,{getVerifiedSession:async()=>null},'org','branch'),AuthenticationRequired);
  await assert.rejects(createFirstOrganization(db,provider,' ','branch'));
  await assert.rejects(createFirstOrganization(db,provider,'x'.repeat(121),'branch'));
});
test('runtime has function execution only, not direct identity or onboarding ledger writes',async()=>{
  for(const sql of ['INSERT INTO app.users(auth_issuer,auth_subject) VALUES(\'bad\',\'bad\')','SELECT * FROM app_private.first_organizations'])
    await assert.rejects(db.query(sql),(e:unknown)=>(e as {code:string}).code==='42501');
  const {rows}=await admin.query("SELECT p.proconfig, p.proacl::text AS acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app_private' AND p.proname IN ('resolve_identity','my_organizations','create_first_organization')");
  assert.equal(rows.length,3);
  for(const row of rows){assert.ok(row.proconfig.includes('search_path=pg_catalog'));assert.ok(!row.acl.includes('{=')&&!row.acl.includes(',='));}
});
