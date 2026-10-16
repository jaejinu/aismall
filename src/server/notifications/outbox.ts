import 'server-only';
import type {Pool,PoolClient} from 'pg';
import {uuidPattern} from '../auth/session';

export type BookingNotificationJob={
 id:string;tenant_id:string;branch_id:string;booking_id:string;booking_version:number;
 event:'booking.confirmed'|'booking.rescheduled'|'booking.cancelled';
 payload:{schema_version:1;customer_id:string;session_id:string;program_id:string;starts_at:string;ends_at:string;previous_session_id:string|null};
 attempt:number;lease_token:string;lease_until:string;
};
// Separate worker pool only. The web runtime must never receive worker membership.
async function workerTransaction<T>(pool:Pool,run:(db:PoolClient)=>Promise<T>) {
 const db=await pool.connect();let discard=false;
 try {
  await db.query('BEGIN');
  const role=(await db.query("SELECT NOT rolsuper AND NOT rolbypassrls AND pg_has_role(current_user,'aismall_notification_worker','member') AND NOT pg_has_role(current_user,'aismall_app','member') AS safe FROM pg_roles WHERE rolname=current_user")).rows[0];
  if(!role?.safe)throw new Error('Dedicated notification worker role required');
  const result=await run(db);await db.query('COMMIT');return result;
 }catch(error){try{await db.query('ROLLBACK');}catch{discard=true;}throw error;}
 finally{db.release(discard);}
}
export async function claimBookingNotifications(pool:Pool,limit=10):Promise<BookingNotificationJob[]> {
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Batch size must be 1–50');
 return workerTransaction(pool,async db=>(await db.query('SELECT app_private.claim_booking_notifications($1) AS job',[limit])).rows.map(r=>r.job));
}
export async function finishBookingNotification(pool:Pool,jobId:string,leaseToken:string,outcome:'delivered'|'temporary'|'permanent') {
 if(!uuidPattern.test(jobId)||!uuidPattern.test(leaseToken)||!['delivered','temporary','permanent'].includes(outcome))throw new Error('Invalid notification result');
 return workerTransaction(pool,async db=>{await db.query('SELECT app_private.finish_booking_notification($1,$2,$3)',[jobId,leaseToken,outcome]);});
}

export type NotificationEligibility={allowed:false;reason:'inactive_scope'|'superseded'|'expired_event'|'recipient_unavailable'|'consent_missing'|'before_consent'|'channel_disabled'}|{allowed:true;channel:'email';recipient:string;recipient_user_id:string;idempotency_key:string;lease_until:string};
/** Invoke immediately before the provider call; do not cache or log the recipient.
 * The transport must also reverify the current Auth email and its verified status.
 * No transport is connected yet. This check does not eliminate external-send races.
 */
export async function prepareBookingNotification(pool:Pool,jobId:string,leaseToken:string):Promise<NotificationEligibility> {
 if(!uuidPattern.test(jobId)||!uuidPattern.test(leaseToken))throw new Error('Invalid notification identity');
 return workerTransaction(pool,async db=>(await db.query('SELECT app_private.prepare_booking_notification($1,$2) AS data',[jobId,leaseToken])).rows[0].data);
}

export type RecipientVerifier=(internalUserId:string)=>Promise<{verifiedEmail:string}|null>;
/** Provider-neutral final gate. The verifier must consult the current trusted Auth
 * provider, not caller input, cached profile data or the original invitation.
 * Transport integration must call this rather than prepareBookingNotification alone.
 */
export async function authorizeBookingDelivery(pool:Pool,jobId:string,leaseToken:string,verify:RecipientVerifier):Promise<NotificationEligibility|{allowed:false;reason:'identity_unverified'|'identity_unavailable'}> {
 const initial=await prepareBookingNotification(pool,jobId,leaseToken);
 if(!initial.allowed)return initial;
 let identity:{verifiedEmail:string}|null;
 try{identity=await verify(initial.recipient_user_id);}catch{return {allowed:false,reason:'identity_unavailable'};}
 if(!identity||typeof identity.verifiedEmail!=='string'||identity.verifiedEmail.trim().toLowerCase()!==initial.recipient)return {allowed:false,reason:'identity_unverified'};
 // Auth lookup may be slow; recheck lease, consent and scope after it completes.
 const latest=await prepareBookingNotification(pool,jobId,leaseToken);
 if(!latest.allowed)return latest;
 if(latest.recipient!==initial.recipient||latest.recipient_user_id!==initial.recipient_user_id)return {allowed:false,reason:'identity_unverified'};
 return latest;
}

export type NotificationResultReason=Exclude<Awaited<ReturnType<typeof authorizeBookingDelivery>>,{allowed:true}>['reason']|'provider_accepted'|'transport_temporary'|'transport_permanent';
export async function notificationAuthIdentity(pool:Pool,jobId:string,token:string):Promise<{issuer:string;subject:string}|null> {
 if(!uuidPattern.test(jobId)||!uuidPattern.test(token))throw new Error('Invalid notification identity');
 return workerTransaction(pool,async db=>(await db.query('SELECT app_private.notification_auth_identity($1,$2) AS data',[jobId,token])).rows[0].data);
}
export async function recordNotificationResult(pool:Pool,jobId:string,token:string,reason:NotificationResultReason):Promise<'pending'|'dead'|'delivered'> {
 if(!uuidPattern.test(jobId)||!uuidPattern.test(token))throw new Error('Invalid notification identity');
 return workerTransaction(pool,async db=>(await db.query('SELECT app_private.record_notification_result($1,$2,$3) AS status',[jobId,token,reason])).rows[0].status);
}

export type NotificationScope={tenantId:string;branchId:string};
export async function claimScopedBookingNotifications(pool:Pool,scope:NotificationScope,limit=10):Promise<BookingNotificationJob[]> {
 if(!scope||!uuidPattern.test(scope.tenantId)||!uuidPattern.test(scope.branchId))throw new Error('Explicit notification scope required');
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Batch size must be 1–50');
 return workerTransaction(pool,async db=>(await db.query('SELECT app_private.claim_scoped_booking_notifications($1,$2,$3) AS job',[scope.tenantId,scope.branchId,limit])).rows.map(r=>r.job));
}

export async function recordNotificationReceipt(pool:Pool,jobId:string,token:string,emailId:string):Promise<'delivered'> {
 if(!uuidPattern.test(jobId)||!uuidPattern.test(token)||!uuidPattern.test(emailId))throw new Error('Invalid notification receipt');
 return workerTransaction(pool,async db=>(await db.query('SELECT app_private.record_notification_receipt($1,$2,$3) AS status',[jobId,token,emailId])).rows[0].status);
}
