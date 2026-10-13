import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { AuthenticationRequired, requireSession, uuidPattern, type SessionProvider } from '../auth/session';
export type BranchRole = 'branch_owner' | 'manager' | 'staff';
export type TeamSnapshot = {
  members: {id:string;label:string;role:string;status:string;version:number;assignments:{branchId:string;branchName:string;role:BranchRole}[]}[];
  invitations: {id:string;email:string;role:BranchRole;branchName:string;status:string;expiresAt:string}[];
};
export const branchRoles: BranchRole[] = ['branch_owner','manager','staff'];
function ids(...values: string[]) { if (values.some(v=>!uuidPattern.test(v))) throw new Error('잘못된 대상이에요.'); }
function role(value: string): asserts value is BranchRole { if (!branchRoles.includes(value as BranchRole)) throw new Error('역할을 확인해 주세요.'); }
function version(value: number) { if (!Number.isSafeInteger(value) || value<1) throw new Error('버전을 확인해 주세요.'); }
async function transaction<T>(pool: Pool, provider: SessionProvider, work: (client: PoolClient, session: Awaited<ReturnType<typeof requireSession>>) => Promise<T>) {
  const session=await requireSession(provider);
  const client=await pool.connect();let discard=false;
  try {
    await client.query('BEGIN');
    const result=await work(client,session);
    if (session.expiresAt<=Date.now()) throw new AuthenticationRequired();
    await client.query('COMMIT');return result;
  } catch(error) {try{await client.query('ROLLBACK');}catch{discard=true;}throw error;}
  finally{client.release(discard);}
}
export async function getTeam(pool:Pool,provider:SessionProvider,tenantId:string) {
  ids(tenantId);
  return transaction(pool,provider,async(c,s)=>(await c.query<{team:TeamSnapshot}>('SELECT app_private.team_snapshot($1,$2) AS team',[s.userId,tenantId])).rows[0].team);
}
export async function inviteStaff(pool:Pool,provider:SessionProvider,input:{tenantId:string;branchId:string;email:string;role:string}) {
  ids(input.tenantId,input.branchId);role(input.role);
  const email=input.email.trim().toLowerCase();
  if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일을 확인해 주세요.');
  const code=randomBytes(32).toString('base64url');
  const hash=createHash('sha256').update(code).digest('hex');
  const id=await transaction(pool,provider,async(c,s)=>(await c.query<{id:string}>('SELECT app_private.invite_staff($1,$2,$3,$4,$5,$6) AS id',[s.userId,input.tenantId,email,input.branchId,input.role,hash])).rows[0].id);
  return {id,code};
}
export async function acceptStaffInvitation(pool:Pool,provider:SessionProvider,code:string) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error('초대 코드를 확인해 주세요.');
  const hash=createHash('sha256').update(code).digest('hex');
  return transaction(pool,provider,async(c,s)=>{
    if(!s.verifiedEmail) throw new AuthenticationRequired();
    return (await c.query<{id:string}>('SELECT app_private.accept_staff_invitation($1,$2,$3) AS id',[s.userId,s.verifiedEmail,hash])).rows[0].id;
  });
}
export async function cancelStaffInvitation(pool:Pool,provider:SessionProvider,tenantId:string,invitationId:string) {
  ids(tenantId,invitationId);
  return transaction(pool,provider,async(c,s)=>{await c.query('SELECT app_private.cancel_staff_invitation($1,$2,$3)',[s.userId,tenantId,invitationId]);});
}
export async function assignStaff(pool:Pool,provider:SessionProvider,input:{tenantId:string;membershipId:string;branchId:string;role:string;version:number}) {
  ids(input.tenantId,input.membershipId,input.branchId);role(input.role);version(input.version);
  return transaction(pool,provider,async(c,s)=>{await c.query('SELECT app_private.assign_staff($1,$2,$3,$4,$5,$6)',[s.userId,input.tenantId,input.membershipId,input.branchId,input.role,input.version]);});
}
export async function revokeStaff(pool:Pool,provider:SessionProvider,tenantId:string,membershipId:string,expectedVersion:number) {
  ids(tenantId,membershipId);version(expectedVersion);
  return transaction(pool,provider,async(c,s)=>{await c.query('SELECT app_private.revoke_staff($1,$2,$3,$4)',[s.userId,tenantId,membershipId,expectedVersion]);});
}
