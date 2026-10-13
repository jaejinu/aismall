import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProviderConfig } from '../scripts/lib/provider-config.mjs';
const base = {
  SUPABASE_URL: 'https://projectref.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  DATABASE_URL: 'postgresql://aismall_runtime.projectref:example@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=verify-full',
};
test('accepts isolated runtime role with verified TLS',()=>assert.deepEqual(validateProviderConfig(base),[]));
test('accepts direct connection to the matching project',()=>assert.deepEqual(validateProviderConfig({...base,DATABASE_URL:'postgresql://aismall_runtime:example@db.projectref.supabase.co:5432/postgres?sslmode=verify-full'}),[]));
test('rejects missing configuration without echoing values',()=>assert.equal(validateProviderConfig({}).length,3));
test('rejects privileged login and a different project',()=>{
  for (const user of ['postgres.projectref','aismall_runtime.otherref']) assert.ok(validateProviderConfig({...base,DATABASE_URL:base.DATABASE_URL.replace('aismall_runtime.projectref',user)}).length);
});
test('rejects secret keys and legacy JWT keys',()=>{
  for (const key of ['sb_secret_do_not_log','eyJhbGci.example']) {
    const errors=validateProviderConfig({...base,SUPABASE_PUBLISHABLE_KEY:key});
    assert.ok(errors.length); assert.ok(!errors.join().includes(key));
  }
});
test('rejects insecure TLS and option overrides',()=>{
  for(const suffix of ['sslmode=require','sslmode=verify-full&sslmode=disable','sslmode=verify-full&uselibpqcompat=true','sslmode=verify-full&ssl=false'])
    assert.ok(validateProviderConfig({...base,DATABASE_URL:base.DATABASE_URL.split('?')[0]+'?'+suffix}).length);
  assert.ok(validateProviderConfig({...base,NODE_TLS_REJECT_UNAUTHORIZED:'0'}).length);
});
test('rejects unexpected hosts, credentials in Auth URL, and redirects in configuration',()=>{
  for (const url of ['http://projectref.supabase.co','https://projectref.supabase.co.evil.test','https://user:pass@projectref.supabase.co','https://projectref.supabase.co/path'])
    assert.ok(validateProviderConfig({...base,SUPABASE_URL:url}).length);
});
