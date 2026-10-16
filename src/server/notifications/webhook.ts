import 'server-only';
import {Webhook} from 'svix';
import {Pool} from 'pg';
import {uuidPattern} from '../auth/session';
export type DeliveryEvent={id:string;emailId:string;type:string;occurredAt:string};
const types=new Set(['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed']);
const reply=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});
/** Verify exact bounded bytes before parsing; return only delivery metadata. */
export async function handleDeliveryWebhook(request:Request,config:{enabled:boolean;secret?:string},save:(event:DeliveryEvent)=>Promise<void>) {
 if(!config.enabled||!config.secret)return reply(503);
 let verifier:Webhook;
 try{verifier=new Webhook(config.secret);}catch{return reply(503);}
 let raw:Uint8Array;
 try{
  const reader=request.body?.getReader();if(!reader)return reply(400);
  const chunks:Uint8Array[]=[];let size=0;
  try{
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return reply(413);}chunks.push(value);}
  }finally{reader.releaseLock();}
  raw=Buffer.concat(chunks);
 }catch{return reply(400);}
 let payload:unknown;
 const id=request.headers.get('svix-id')||'';
 if(!/^[A-Za-z0-9_-]{1,200}$/.test(id))return reply(400);
 try{
  verifier.verify(Buffer.from(raw),{'svix-id':id,'svix-timestamp':request.headers.get('svix-timestamp')||'','svix-signature':request.headers.get('svix-signature')||''});
  payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
 }catch{return reply(400);}
 if(!payload||typeof payload!=='object')return reply(400);
 const event=payload as {type?:unknown;created_at?:unknown;data?:{email_id?:unknown}};
 if(typeof event.type!=='string')return reply(400);
 if(!types.has(event.type))return reply(204);
 if(typeof event.data?.email_id!=='string'||!uuidPattern.test(event.data.email_id)||typeof event.created_at!=='string'||!Number.isFinite(Date.parse(event.created_at)))return reply(400);
 try{await save({id,emailId:event.data.email_id,type:event.type,occurredAt:new Date(event.created_at).toISOString()});}
 catch{return reply(503);}
 return reply(204);
}
let webhookPool:Pool|undefined;
export function getWebhookPool() {
 if(webhookPool)return webhookPool;
 const url=process.env.NOTIFICATION_WEBHOOK_DATABASE_URL;
 if(!url||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw new Error('Webhook database configuration required');
 const parsed=new URL(url);
 if(!['postgres:','postgresql:'].includes(parsed.protocol)||parsed.searchParams.get('sslmode')!=='verify-full')throw new Error('Webhook TLS required');
 webhookPool=new Pool({connectionString:url,max:2,connectionTimeoutMillis:5000,query_timeout:10000,statement_timeout:10000});
 webhookPool.on('error',()=>console.error('Webhook database connection failed'));
 return webhookPool;
}
export async function saveDeliveryEvent(pool:Pool,event:DeliveryEvent) {
 const client=await pool.connect();let discard=false;
 try{
  await client.query('BEGIN');
  const role=(await client.query("SELECT NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND pg_has_role(current_user,'aismall_notification_webhook','member') AND NOT pg_has_role(current_user,'aismall_app','member') AND NOT pg_has_role(current_user,'aismall_notification_worker','member') AS safe FROM pg_roles WHERE rolname=current_user")).rows[0];
  if(!role?.safe)throw new Error('Dedicated webhook role required');
  await client.query('SELECT app_private.ingest_notification_delivery($1,$2,$3,$4)',[event.id,event.emailId,event.type,event.occurredAt]);
  await client.query('COMMIT');
 }catch(error){try{await client.query('ROLLBACK');}catch{discard=true;}throw error;}
 finally{client.release(discard);}
}
