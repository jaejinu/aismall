import {existsSync} from 'node:fs';
import pg from 'pg';
import {validateNotificationConfig,inspectNotificationDatabase,previewNotificationScope} from './lib/notification-config.mjs';
// Separate ignored file; do not load the web runtime's credentials implicitly.
if(existsSync('.env.worker.local'))process.loadEnvFile('.env.worker.local');
const args=process.argv.slice(2);
if(args.some(arg=>!['--database-readonly','--scope-preview'].includes(arg))){
 console.error('Usage: npm run notifications:check -- [--database-readonly | --scope-preview]');process.exitCode=1;
}else{
 const errors=validateNotificationConfig(process.env);
 if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}
 else if(!args.includes('--database-readonly')&&!args.includes('--scope-preview'))console.log('Configuration format passed. No connections or sends made. Credentials, sender verification and live delivery remain unverified.');
 else{
  const client=new pg.Client({connectionString:process.env.WORKER_DATABASE_URL,connectionTimeoutMillis:5000,query_timeout:10000});
  try{await client.connect();await inspectNotificationDatabase(client);if(args.includes('--scope-preview'))console.log(JSON.stringify(await previewNotificationScope(client,process.env.NOTIFICATION_TENANT_ID,process.env.NOTIFICATION_BRANCH_ID)));console.log('Read-only worker permissions passed. No queue claims, Auth lookups or sends made. Provider credentials and sender verification remain unverified.');}
  catch{console.error('Worker database check failed. Values and driver errors are hidden.');process.exitCode=1;}
  finally{await client.end();}
 }
}
