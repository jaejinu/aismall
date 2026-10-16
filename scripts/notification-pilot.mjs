import {existsSync} from 'node:fs';
import pg from 'pg';
import {parsePilotOptions,runPilot} from './lib/notification-pilot.mjs';
// Never load the web runtime's environment file. Default command is read-only.
let pool;
try{
 if(existsSync('.env.worker.local'))process.loadEnvFile('.env.worker.local');
 const options=parsePilotOptions(process.argv.slice(2),process.env);
 pool=new pg.Pool({connectionString:process.env.WORKER_DATABASE_URL,max:2,connectionTimeoutMillis:5000,query_timeout:10000,statement_timeout:10000});
 pool.on('error',()=>{console.error('Pilot database connection failed. Details hidden.');process.exitCode=1;});
 const result=await runPilot(options,{pool,executeBatch:async(db,batch)=>{
  // Preview never loads or instantiates external-provider adapters.
  const {runNotificationBatch}=await import('../src/server/notifications/worker.ts');
  const {supabaseRecipientVerifier,resendTransport}=await import('../src/server/notifications/adapters.ts');
  return runNotificationBatch(db,{...batch,
   verifier:supabaseRecipientVerifier(db,{url:process.env.SUPABASE_URL,secretKey:process.env.WORKER_SUPABASE_SECRET_KEY}),
   transport:resendTransport({apiKey:process.env.RESEND_API_KEY,from:process.env.NOTIFICATION_FROM,allowedRecipients:process.env.NOTIFICATION_ALLOWED_RECIPIENTS.split(',')}),
  });
 }});
 console.log(JSON.stringify(result));
 if(result.mode==='execute'&&(result.counts.failed||result.counts.retrying||result.counts.blocked))process.exitCode=2;
}catch{
 console.error('Pilot stopped. Check arguments, worker configuration, permissions and scope. No automatic rerun; inspect notification status before retrying. Details hidden.');
 process.exitCode=1;
}finally{
 if(pool)try{await pool.end();}catch{console.error('Pilot database cleanup failed. Details hidden.');process.exitCode=1;}
}
