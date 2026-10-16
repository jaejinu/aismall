import 'server-only';
import type {Pool} from 'pg';
import {uuidPattern} from '../auth/session';
import {notificationAuthIdentity,type BookingNotificationJob,type RecipientVerifier} from './outbox';
import type {EmailTransport} from './worker';
type Http=typeof fetch;
const email=(value:string)=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
/** Worker-only key, supplied explicitly; never use the web runtime client or publishable key. */
export function supabaseRecipientVerifier(pool:Pool,config:{url:string;secretKey:string},http:Http=fetch):(job:BookingNotificationJob)=>RecipientVerifier {
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url)||!config.secretKey.startsWith('sb_secret_'))throw new Error('Worker Auth configuration required');
 return job=>async()=>{
  const identity=await notificationAuthIdentity(pool,job.id,job.lease_token);
  if(!identity||identity.issuer!==`${config.url}/auth/v1`||!uuidPattern.test(identity.subject))return null;
  const response=await http(`${config.url}/auth/v1/admin/users/${identity.subject}`,{
   method:'GET',headers:{apikey:config.secretKey},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),
  });
  if(response.status===404)return null;
  if(!response.ok)throw new Error('Auth lookup unavailable');
  const user=await response.json();
  if(user.id!==identity.subject||user.deleted_at||!user.email_confirmed_at||!Number.isFinite(Date.parse(user.email_confirmed_at))
   ||(user.banned_until&&(!Number.isFinite(Date.parse(user.banned_until))||Date.parse(user.banned_until)>Date.now()))
   ||typeof user.email!=='string'||!email(user.email))return null;
  return {verifiedEmail:user.email.toLowerCase()};
 };
}
/** Optional provider adapter, not activated by env presence. A nonempty recipient
 * allowlist is mandatory for the first pilot. No subscription or real send is set up.
 */
export function resendTransport(config:{apiKey:string;from:string;allowedRecipients:readonly string[]},http:Http=fetch):EmailTransport {
 const allowed=new Set(config.allowedRecipients.map(v=>v.trim().toLowerCase()));
 if(!config.apiKey.startsWith('re_')||!email(config.from)||!allowed.size||[...allowed].some(v=>!email(v)))throw new Error('Pilot email configuration required');
 return {async send(mail){
  if(!email(mail.to)||!allowed.has(mail.to.toLowerCase())||!uuidPattern.test(mail.idempotencyKey))return 'permanent';
  try{
   const response=await http('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json','Idempotency-Key':mail.idempotencyKey},
    body:JSON.stringify({from:config.from,to:[mail.to],subject:mail.subject,text:mail.text}),
    redirect:'error',signal:AbortSignal.timeout(8000),
   });
   if(!response.ok)return response.status===408||response.status===429||response.status>=500?'temporary':'permanent';
   const receipt=await response.json();
   return typeof receipt.id==='string'&&uuidPattern.test(receipt.id)?{status:'accepted',emailId:receipt.id}:'temporary';
  }catch{return 'temporary';}
 }};
}
