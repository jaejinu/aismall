import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateNotificationConfig} from '../scripts/lib/notification-config.mjs';
const valid={SUPABASE_URL:'https://synthetic.supabase.co',WORKER_SUPABASE_SECRET_KEY:'sb_secret_synthetic',RESEND_API_KEY:'re_synthetic',NOTIFICATION_FROM:'sender@example.test',NOTIFICATION_ALLOWED_RECIPIENTS:'one@example.test,two@example.test',NOTIFICATION_WORKER_ENABLED:'false',WORKER_DATABASE_URL:'postgresql://aismall_delivery:synthetic@db.synthetic.supabase.co:5432/postgres?sslmode=verify-full'};
test('notification checker accepts direct and same-project pooler worker configurations',()=>{
 assert.deepEqual(validateNotificationConfig(valid),[]);
 assert.deepEqual(validateNotificationConfig({...valid,WORKER_DATABASE_URL:'postgresql://aismall_delivery.synthetic:synthetic@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=verify-full'}),[]);
});
test('notification checker rejects runtime/admin/wrong-project connections and TLS overrides',()=>{
 for(const url of [valid.WORKER_DATABASE_URL.replace('aismall_delivery','postgres'),valid.WORKER_DATABASE_URL.replace('aismall_delivery','aismall_runtime'),valid.WORKER_DATABASE_URL.replace('db.synthetic','db.other'),valid.WORKER_DATABASE_URL.replace('verify-full','require'),valid.WORKER_DATABASE_URL+'&sslmode=disable',valid.WORKER_DATABASE_URL+'&options=unsafe'])assert.ok(validateNotificationConfig({...valid,WORKER_DATABASE_URL:url}).length);
 assert.ok(validateNotificationConfig({...valid,NODE_TLS_REJECT_UNAUTHORIZED:'0'}).length);
});
test('notification checker requires disabled mode, secret key, sender and bounded unique allowlist',()=>{
 for(const changes of [{NOTIFICATION_WORKER_ENABLED:'true'},{NOTIFICATION_WORKER_ENABLED:undefined},{WORKER_SUPABASE_SECRET_KEY:'sb_publishable_x'},{NOTIFICATION_FROM:'invalid'},{NOTIFICATION_ALLOWED_RECIPIENTS:''},{NOTIFICATION_ALLOWED_RECIPIENTS:'one@example.test,ONE@example.test'},{NOTIFICATION_ALLOWED_RECIPIENTS:Array.from({length:21},(_,i)=>i+'@example.test').join(',')}])assert.ok(validateNotificationConfig({...valid,...changes}).length);
});
test('validation errors never contain supplied credential or recipient values',()=>{
 const secret='PRIVATE_VALUE_9382';const result=validateNotificationConfig(Object.fromEntries(Object.keys(valid).map(k=>[k,secret])));
 assert.ok(result.length>0);assert.ok(!JSON.stringify(result).includes(secret));
});
