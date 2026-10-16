import { before,after,test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { inviteStaff,acceptStaffInvitation,getTeam,assignStaff,revokeStaff,cancelStaffInvitation } from '../src/server/services/team';
import { listBranches,renameBranch } from '../src/server/services/branches';
import { createFirstOrganization } from '../src/server/services/organizations';
import type { SessionProvider } from '../src/server/auth/session';
const db=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:4});
const admin=new Pool({connectionString:process.env.TEST_DATABASE_ADMIN_URL});
const owner=randomUUID(),employee=randomUUID(),other=randomUUID(),stranger=randomUUID();
const email='staff@example.test';
const session=(id:string,verifiedEmail=email):SessionProvider=>({getVerifiedSession:async()=>({userId:id,verifiedEmail,expiresAt:Date.now()+60000})});
let tenant:string,foreignTenant:string,branch:string,secondBranch:string,foreignBranch:string,member:string;
before(async()=>{
  for(const id of [owner,employee,other,stranger]) await admin.query("INSERT INTO app.users(id,auth_issuer,auth_subject) VALUES($1,'team-test',$2)",[id,id]);
  tenant=await createFirstOrganization(db,session(owner),'Team A','One');
  foreignTenant=await createFirstOrganization(db,session(other),'Team B','Other');
  branch=(await listBranches(db,session(owner),tenant))[0].id;
  foreignBranch=(await listBranches(db,session(other),foreignTenant))[0].id;
  secondBranch=randomUUID();await admin.query("INSERT INTO app.branches(id,tenant_id,slug,name) VALUES($1,$2,'second','Two')",[secondBranch,tenant]);
});
after(async()=>{await db.end();await admin.end();});
const denied=(e:unknown)=>(e as {code:string}).code==='42501';
test('only active tenant admin can list or invite; cross-tenant branch and elevated role rejected',async()=>{
  await assert.rejects(getTeam(db,session(other),tenant),denied);
  await assert.rejects(inviteStaff(db,session(other),{tenantId:tenant,branchId:branch,email,role:'staff'}),denied);
  await assert.rejects(inviteStaff(db,session(owner),{tenantId:tenant,branchId:foreignBranch,email,role:'staff'}));
  await assert.rejects(inviteStaff(db,session(owner),{tenantId:tenant,branchId:branch,email,role:'tenant_admin'}));
  await assert.rejects(db.query('SELECT * FROM app_private.staff_invitations'),denied);
  await assert.rejects(db.query('SELECT app_private.require_team_admin($1,$2)',[owner,tenant]),denied);
});
test('token hash only is stored; pending duplicate rejected; incorrect verified email cannot redeem',async()=>{
  const invitation=await inviteStaff(db,session(owner),{tenantId:tenant,branchId:branch,email:'STAFF@example.test',role:'staff'});
  assert.match(invitation.code,/^[A-Za-z0-9_-]{43}$/);
  const row=(await admin.query('SELECT * FROM app_private.staff_invitations WHERE id=$1',[invitation.id])).rows[0];
  assert.equal(row.email,email);assert.equal(row.token_hash.length,64);assert.ok(!JSON.stringify(row).includes(invitation.code));
  assert.ok(!JSON.stringify(await getTeam(db,session(owner),tenant)).includes(row.token_hash));
  await assert.rejects(inviteStaff(db,session(owner),{tenantId:tenant,branchId:branch,email,role:'staff'}));
  await assert.rejects(acceptStaffInvitation(db,session(employee,'wrong@example.test'),invitation.code),denied);
  await assert.rejects(acceptStaffInvitation(db,{getVerifiedSession:async()=>({userId:employee,expiresAt:Date.now()+60000})},invitation.code));
  const attempts=await Promise.allSettled([acceptStaffInvitation(db,session(employee),invitation.code),acceptStaffInvitation(db,session(employee),invitation.code)]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(attempts.filter(r=>r.status==='rejected').length,1);
  member=(await admin.query('SELECT id FROM app.staff_memberships WHERE tenant_id=$1 AND user_id=$2',[tenant,employee])).rows[0].id;
  assert.deepEqual((await listBranches(db,session(employee),tenant)).map(b=>b.id),[branch]);
  await assert.rejects(listBranches(db,session(employee),foreignTenant));
  await assert.rejects(getTeam(db,session(employee),tenant),denied);
  await assert.rejects(renameBranch(db,session(employee),{tenantId:tenant,branchId:branch,name:'No',expectedVersion:1}));
});
test('assignment replacement changes branch access, versioned concurrent changes have one winner',async()=>{
  await assert.rejects(assignStaff(db,session(owner),{tenantId:tenant,membershipId:member,branchId:foreignBranch,role:'manager',version:1}));
  const changes=await Promise.allSettled(['manager','branch_owner'].map(role=>assignStaff(db,session(owner),{tenantId:tenant,membershipId:member,branchId:secondBranch,role,version:1})));
  assert.equal(changes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(changes.filter(r=>r.status==='rejected'&&(r.reason as {code:string}).code==='40001').length,1);
  assert.deepEqual((await listBranches(db,session(employee),tenant)).map(b=>b.id),[secondBranch]);
  await assert.rejects(renameBranch(db,session(employee),{tenantId:tenant,branchId:branch,name:'Old branch',expectedVersion:1}));
  await assert.rejects(assignStaff(db,session(employee),{tenantId:tenant,membershipId:member,branchId:branch,role:'branch_owner',version:2}),denied);
});
test('audit failure rolls back assignment and membership version',async()=>{
  const before=await getTeam(db,session(owner),tenant);
  await admin.query("ALTER TABLE app.audit_events ADD CONSTRAINT reject_team_test CHECK(action<>'staff.assigned') NOT VALID");
  try {await assert.rejects(assignStaff(db,session(owner),{tenantId:tenant,membershipId:member,branchId:branch,role:'staff',version:2}));}
  finally {await admin.query('ALTER TABLE app.audit_events DROP CONSTRAINT reject_team_test');}
  assert.deepEqual((await getTeam(db,session(owner),tenant)).members,before.members);
});
test('revocation protects tenant administrators and denies subsequent requests; invitations cannot resurrect revoked membership',async()=>{
  const ownerMember=(await getTeam(db,session(owner),tenant)).members.find(m=>m.role==='tenant_admin')!;
  await assert.rejects(revokeStaff(db,session(owner),tenant,ownerMember.id,1),denied);
  await assert.rejects(revokeStaff(db,session(other),tenant,member,2),denied);
  await revokeStaff(db,session(owner),tenant,member,2);
  await assert.rejects(listBranches(db,session(employee),tenant));
  assert.equal((await admin.query('SELECT branch_id FROM app.branch_assignments WHERE membership_id=$1 AND status=$2',[member,'active'])).rowCount,0);
  const reinvite=await inviteStaff(db,session(owner),{tenantId:tenant,branchId:branch,email,role:'staff'});
  await assert.rejects(acceptStaffInvitation(db,session(employee),reinvite.code),denied);
  await cancelStaffInvitation(db,session(owner),tenant,reinvite.id);
});
test('expired, cancelled and revoked-inviter invitations fail and cannot be cancelled across tenants',async()=>{
  for(const scenario of ['expired','cancelled','inviter','branch','user','tenant']){
    const invitation=await inviteStaff(db,session(owner),{tenantId:tenant,branchId:branch,email:`${scenario}@example.test`,role:'manager'});
    await assert.rejects(cancelStaffInvitation(db,session(other),foreignTenant,invitation.id),denied);
    if(scenario==='expired')await admin.query("UPDATE app_private.staff_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",[invitation.id]);
    if(scenario==='cancelled')await cancelStaffInvitation(db,session(owner),tenant,invitation.id);
    if(scenario==='inviter')await admin.query("UPDATE app.staff_memberships SET status='revoked' WHERE tenant_id=$1 AND user_id=$2",[tenant,owner]);
    if(scenario==='branch')await admin.query("UPDATE app.branches SET status='closed' WHERE id=$1",[branch]);
    if(scenario==='user')await admin.query("UPDATE app.users SET status='suspended' WHERE id=$1",[stranger]);
    if(scenario==='tenant')await admin.query("UPDATE app.tenants SET status='suspended' WHERE id=$1",[tenant]);
    try {await assert.rejects(acceptStaffInvitation(db,session(stranger,`${scenario}@example.test`),invitation.code),denied);}
    finally {
      await admin.query("UPDATE app.staff_memberships SET status='active' WHERE tenant_id=$1 AND user_id=$2",[tenant,owner]);
      await admin.query("UPDATE app.branches SET status='active' WHERE id=$1",[branch]);
      await admin.query("UPDATE app.users SET status='active' WHERE id=$1",[stranger]);
      await admin.query("UPDATE app.tenants SET status='active' WHERE id=$1",[tenant]);
    }
  }
});
test('concurrent cancellation and acceptance are serialized without partial membership',async()=>{
  const invited=await inviteStaff(db,session(owner),{tenantId:tenant,branchId:branch,email:'race@example.test',role:'staff'});
  const results=await Promise.allSettled([cancelStaffInvitation(db,session(owner),tenant,invited.id),acceptStaffInvitation(db,session(stranger,'race@example.test'),invited.code)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const state=(await admin.query('SELECT status FROM app_private.staff_invitations WHERE id=$1',[invited.id])).rows[0].status;
  const count=(await admin.query('SELECT id FROM app.staff_memberships WHERE tenant_id=$1 AND user_id=$2',[tenant,stranger])).rowCount;
  assert.equal(count,state==='accepted'?1:0);
});
test('audit events contain no raw invitation tokens; runtime cannot forge administrative audit types',async()=>{
  const events=(await admin.query("SELECT action,details FROM app.audit_events WHERE tenant_id=$1",[tenant])).rows;
  for(const event of events)assert.ok(!('token' in event.details)&&!('token_hash' in event.details));
  await assert.rejects(db.query("INSERT INTO app.audit_events(tenant_id,branch_id,actor_user_id,action,details) VALUES($1,$2,$3,'staff.invited','{}')",[tenant,branch,owner]),denied);
});
