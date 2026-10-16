import {validateNotificationConfig,inspectNotificationDatabase,previewNotificationScope} from './notification-config.mjs';

export function parsePilotOptions(args,env) {
 let execute=false,limit=1;
 const seen=new Set();
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(seen.has(arg))throw new Error('Duplicate pilot option');
  seen.add(arg);
  if(arg==='--execute')execute=true;
  else if(arg==='--limit'){
   const value=args[++i];
   if(!/^(?:[1-9]|[1-4][0-9]|50)$/.test(value||''))throw new Error('Pilot limit must be 1–50');
   limit=Number(value);
  }else throw new Error('Usage: npm run notifications:pilot -- [--execute] [--limit 1–50]');
 }
 const errors=validateNotificationConfig(env,{execute});
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!uuid.test(env.NOTIFICATION_TENANT_ID||'')||!uuid.test(env.NOTIFICATION_BRANCH_ID||''))errors.push('NOTIFICATION_TENANT_ID and NOTIFICATION_BRANCH_ID: explicit UUIDs required');
 if(errors.length)throw new Error(errors.join('\n'));
 return {execute,limit,scope:{tenantId:env.NOTIFICATION_TENANT_ID,branchId:env.NOTIFICATION_BRANCH_ID}};
}

/** Dependencies are injected to test the command without connecting or sending. */
export async function runPilot(options,{pool,inspect=inspectNotificationDatabase,preview=previewNotificationScope,executeBatch}) {
 const client=await pool.connect();let snapshot;
 try{
  await inspect(client);
  snapshot=await preview(client,options.scope.tenantId,options.scope.branchId);
 }finally{client.release();}
 if(!options.execute)return {mode:'preview',limit:options.limit,scope:snapshot};
 if(snapshot.active!==true||snapshot.email_enabled!==true)throw new Error('Pilot scope or email channel is inactive');
 const counts=await executeBatch(pool,{enabled:true,scope:options.scope,limit:options.limit});
 // Only aggregate counters leave the runner, never recipients, messages or provider responses.
 return {mode:'execute',scope:{tenant_id:options.scope.tenantId,branch_id:options.scope.branchId},counts:{claimed:counts.claimed,accepted:counts.accepted,blocked:counts.blocked,retrying:counts.retrying,failed:counts.failed}};
}
