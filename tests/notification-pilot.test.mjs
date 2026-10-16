import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {parsePilotOptions,runPilot} from '../scripts/lib/notification-pilot.mjs';
const env={SUPABASE_URL:'https://synthetic.supabase.co',WORKER_SUPABASE_SECRET_KEY:'sb_secret_synthetic',RESEND_API_KEY:'re_synthetic',NOTIFICATION_FROM:'sender@example.test',NOTIFICATION_ALLOWED_RECIPIENTS:'one@example.test',NOTIFICATION_WORKER_ENABLED:'false',WORKER_DATABASE_URL:'postgresql://aismall_delivery:synthetic@db.synthetic.supabase.co:5432/postgres?sslmode=verify-full',NOTIFICATION_TENANT_ID:'11111111-1111-4111-8111-111111111111',NOTIFICATION_BRANCH_ID:'22222222-2222-4222-8222-222222222222'};
function harness(snapshot={active:true,email_enabled:true,pending:1}){
 const calls=[];
 const pool={connect:async()=>{calls.push('connect');return {release(){calls.push('release');}};}};
 return {calls,pool,inspect:async()=>{calls.push('inspect');},preview:async(_c,t,b)=>{calls.push(['preview',t,b]);return snapshot;},executeBatch:async(_p,options)=>{calls.push(['execute',options]);return {claimed:1,accepted:1,blocked:0,retrying:0,failed:0,recipient:'PRIVATE'};}};
}
test('pilot defaults to preview and one item; execution requires both explicit switches',()=>{
 assert.deepEqual(parsePilotOptions([],env),{execute:false,limit:1,scope:{tenantId:env.NOTIFICATION_TENANT_ID,branchId:env.NOTIFICATION_BRANCH_ID}});
 assert.throws(()=>parsePilotOptions(['--execute'],env));
 assert.throws(()=>parsePilotOptions([],{...env,NOTIFICATION_WORKER_ENABLED:'true'}));
 assert.equal(parsePilotOptions(['--execute','--limit','50'],{...env,NOTIFICATION_WORKER_ENABLED:'true'}).limit,50);
});
test('pilot rejects malformed scope, invalid or duplicate args and unsafe credentials before connection',()=>{
 for(const args of [['--limit','0'],['--limit','51'],['--limit','1.5'],['--limit'],['--execute','--execute'],['--limit','1','--limit','2'],['--unknown']])assert.throws(()=>parsePilotOptions(args,env));
 for(const changes of [{NOTIFICATION_TENANT_ID:''},{NOTIFICATION_BRANCH_ID:'bad'},{NOTIFICATION_ALLOWED_RECIPIENTS:''},{WORKER_DATABASE_URL:env.WORKER_DATABASE_URL.replace('aismall_delivery','postgres')}])assert.throws(()=>parsePilotOptions([],{...env,...changes}));
});
test('preview checks permissions and scope but never invokes worker even for active channel',async()=>{
 const deps=harness();const result=await runPilot(parsePilotOptions([],env),deps);
 assert.equal(result.mode,'preview');assert.equal(result.scope.pending,1);
 assert.deepEqual(deps.calls,['connect','inspect',['preview',env.NOTIFICATION_TENANT_ID,env.NOTIFICATION_BRANCH_ID],'release']);
});
test('execution passes only selected scope and limit after permission/preview checks, returns counts only',async()=>{
 const deps=harness();const options=parsePilotOptions(['--execute','--limit','3'],{...env,NOTIFICATION_WORKER_ENABLED:'true'});
 const result=await runPilot(options,deps);
 assert.deepEqual(deps.calls.at(-1),['execute',{enabled:true,scope:options.scope,limit:3}]);
 assert.equal(result.counts.accepted,1);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
test('inactive scope/channel and permission failures cannot invoke worker; connection is released',async()=>{
 const options=parsePilotOptions(['--execute'],{...env,NOTIFICATION_WORKER_ENABLED:'true'});
 for(const snapshot of [{active:false,email_enabled:true},{active:true,email_enabled:false}]){
  const deps=harness(snapshot);await assert.rejects(runPilot(options,deps));assert.equal(deps.calls.at(-1),'release');
 }
 const deps=harness();deps.inspect=async()=>{throw new Error('permission failure');};
 await assert.rejects(runPilot(options,deps));assert.deepEqual(deps.calls,['connect','release']);
});
test('CLI rejects unknown arguments with a nonzero exit and redacts input',()=>{
 const result=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','scripts/notification-pilot.mjs','--PRIVATE_VALUE'],{encoding:'utf8'});
 assert.equal(result.status,1);assert.ok(!result.stderr.includes('PRIVATE_VALUE'));assert.equal(result.stdout,'');
});
