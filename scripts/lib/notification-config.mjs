/** Format/readiness checks only. Never return or print secrets, URLs or addresses. */
export function validateNotificationConfig(env,{execute=false}={}) {
 const errors=[];
 const email=v=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
 let ref;
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.SUPABASE_URL||''))errors.push('SUPABASE_URL: hosted HTTPS project URL required');
 else ref=new URL(env.SUPABASE_URL).hostname.split('.')[0];
 if(!/^sb_secret_[A-Za-z0-9_-]+$/.test(env.WORKER_SUPABASE_SECRET_KEY||''))errors.push('WORKER_SUPABASE_SECRET_KEY: dedicated server secret required');
 if(!/^re_[A-Za-z0-9_-]+$/.test(env.RESEND_API_KEY||''))errors.push('RESEND_API_KEY: sending key required');
 if(!email(env.NOTIFICATION_FROM))errors.push('NOTIFICATION_FROM: sender email required');
 const recipients=(env.NOTIFICATION_ALLOWED_RECIPIENTS||'').split(',').map(v=>v.trim().toLowerCase());
 if(!recipients.length||recipients.length>20||recipients.some(v=>!email(v))||new Set(recipients).size!==recipients.length)errors.push('NOTIFICATION_ALLOWED_RECIPIENTS: 1–20 unique pilot email addresses required');
 if(env.NOTIFICATION_WORKER_ENABLED!==(execute?'true':'false'))errors.push(execute?'NOTIFICATION_WORKER_ENABLED: explicit true required for execution':'NOTIFICATION_WORKER_ENABLED: keep false during readiness checks');
 if(env.NODE_TLS_REJECT_UNAUTHORIZED==='0')errors.push('TLS verification must remain enabled');
 try{
  const url=new URL(env.WORKER_DATABASE_URL),direct=url.hostname===`db.${ref}.supabase.co`;
  if(!ref||!['postgres:','postgresql:'].includes(url.protocol)||!url.password||url.pathname!=='/postgres'||url.hash||!(direct||/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname))||!['5432','6543'].includes(url.port))throw new Error();
  if(decodeURIComponent(url.username)!==(direct?'aismall_delivery':`aismall_delivery.${ref}`))throw new Error();
  if(url.searchParams.get('sslmode')!=='verify-full')throw new Error();
  const seen=new Set();for(const [key] of url.searchParams){if(!['sslmode','sslrootcert'].includes(key)||seen.has(key))throw new Error();seen.add(key);}
 }catch{errors.push('WORKER_DATABASE_URL: same-project aismall_delivery login with verify-full TLS required');}
 return errors;
}
export async function inspectNotificationDatabase(client) {
 await client.query('BEGIN READ ONLY');
 try{
  await client.query("SET LOCAL statement_timeout='5s'");
  const {rows}=await client.query(`SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcreatedb AND NOT r.rolcreaterole
   AND pg_has_role(current_user,'aismall_notification_worker','member') AND NOT pg_has_role(current_user,'aismall_app','member') AS safe
   FROM pg_roles r WHERE r.rolname=current_user`);
  if(!rows[0]?.safe)throw new Error('Unsafe worker role');
  const tables=await client.query(`SELECT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('app','app_private') AND c.relkind IN ('r','p') AND
   (pg_has_role(current_user,c.relowner,'member') OR has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))) AS exposed`);
  if(tables.rows[0].exposed)throw new Error('Direct table access');
  for(const signature of ['claim_scoped_booking_notifications(uuid,uuid,integer)','preview_booking_notifications(uuid,uuid)','finish_booking_notification(uuid,uuid,text)','prepare_booking_notification(uuid,uuid)','notification_auth_identity(uuid,uuid)','record_notification_result(uuid,uuid,text)','record_notification_receipt(uuid,uuid,uuid)']){
   const result=await client.query("SELECT has_function_privilege(current_user,$1,'EXECUTE') AS allowed",['app_private.'+signature]);
   if(!result.rows[0]?.allowed)throw new Error('Missing worker grant');
  }
 }finally{await client.query('ROLLBACK');}
}

export async function previewNotificationScope(client,tenantId,branchId) {
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!uuid.test(tenantId||'')||!uuid.test(branchId||''))throw new Error('Explicit pilot tenant and branch UUIDs required');
 await client.query('BEGIN READ ONLY');
 try{
  await client.query("SET LOCAL statement_timeout='5s'");
  return (await client.query('SELECT app_private.preview_booking_notifications($1,$2) AS data',[tenantId,branchId])).rows[0].data;
 }finally{await client.query('ROLLBACK');}
}
