import 'server-only';
import type {Pool} from 'pg';
import {authorizeBookingDelivery,claimScopedBookingNotifications,recordNotificationResult,recordNotificationReceipt,type NotificationScope,type BookingNotificationJob,type NotificationResultReason,type RecipientVerifier} from './outbox';
export type EmailEnvelope={to:string;subject:string;text:string;idempotencyKey:string};
export type EmailOutcome='accepted'|'temporary'|'permanent'|{status:'accepted';emailId:string};
export type EmailTransport={send:(mail:EmailEnvelope)=>Promise<EmailOutcome>};
export type NotificationWorkerOptions={scope:NotificationScope;enabled?:boolean;limit?:number;verifier:(job:BookingNotificationJob)=>RecipientVerifier;transport:EmailTransport};
const eventLabels={'booking.confirmed':'예약이 확정됐어요','booking.rescheduled':'예약 일정이 변경됐어요','booking.cancelled':'예약이 취소됐어요'};
export function bookingEmail(job:BookingNotificationJob,to:string):EmailEnvelope {
 const label=eventLabels[job.event];
 const start=new Date(job.payload.starts_at);
 if(!label||job.payload.schema_version!==1||!Number.isFinite(start.getTime()))throw new Error('Unsupported notification');
 const when=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'full',timeStyle:'short'}).format(start);
 return {to,subject:label,text:`${label}.\n\n예약 일정: ${when} (한국 시간)\n최신 예약 상태는 회원 화면의 내 예약에서 확인해 주세요.\n\n이 메일은 수신에 동의한 예약 안내예요. 수신 설정은 내 정보에서 변경할 수 있어요.`,idempotencyKey:job.id};
}
/** Bounded invocation; no cron, background loop or default live sending.
 * Claim one job at a time so a slow batch cannot exhaust unprocessed leases.
 * DB completion failures are not retried as transport calls in this invocation.
 */
export async function runNotificationBatch(pool:Pool,options:NotificationWorkerOptions) {
 const summary={claimed:0,accepted:0,blocked:0,retrying:0,failed:0};
 if(options.enabled!==true)return summary;
 const limit=options.limit??10;
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Invalid worker limit');
 for(let i=0;i<limit;i++){
  const job=(await claimScopedBookingNotifications(pool,options.scope,1))[0];if(!job)break;summary.claimed++;
  let reason:NotificationResultReason;let emailId:string|undefined;
  try{
   const eligibility=await authorizeBookingDelivery(pool,job.id,job.lease_token,options.verifier(job));
   if(!eligibility.allowed){reason=eligibility.reason;}
   else{
    // Built-in adapters use bounded network timeouts. Reserve time for DB acknowledgement.
    if(Date.parse(eligibility.lease_until)-Date.now()<15000)throw new Error('Lease budget exhausted');
    let outcome:EmailOutcome;
    try{outcome=await options.transport.send(bookingEmail(job,eligibility.recipient));}catch{outcome='temporary';}
    if(typeof outcome==='object'){emailId=outcome.emailId;outcome=outcome.status;}
    reason=outcome==='accepted'?'provider_accepted':outcome==='permanent'?'transport_permanent':'transport_temporary';
   }
  }catch{summary.failed++;continue;}
  let status:'pending'|'dead'|'delivered';
  try{status=emailId?await recordNotificationReceipt(pool,job.id,job.lease_token,emailId):await recordNotificationResult(pool,job.id,job.lease_token,reason);}catch{summary.failed++;continue;}
  if(reason==='provider_accepted')summary.accepted++;
  else if(status==='pending')summary.retrying++;
  else summary.blocked++;
 }
 return summary;
}
