import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Webhook} from 'svix';
import {handleDeliveryWebhook,type DeliveryEvent} from '../src/server/notifications/webhook';
const secret='whsec_'+Buffer.alloc(32,7).toString('base64');
const verifier=new Webhook(secret);
const payload={type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:randomUUID(),to:['PRIVATE@example.test'],subject:'PRIVATE'}};
function request(body=JSON.stringify(payload),date=new Date()){
 const id='msg_'+randomUUID();
 return new Request('https://example.test/api/webhooks/resend',{method:'POST',body,headers:{'svix-id':id,'svix-timestamp':String(Math.floor(date.getTime()/1000)),'svix-signature':verifier.sign(id,date,body)}});
}
const config={enabled:true,secret};
test('webhook verifies signature and strips personal data before persistence',async()=>{
 const saved:DeliveryEvent[]=[];
 assert.equal((await handleDeliveryWebhook(request(),config,async e=>{saved.push(e);})).status,204);
 assert.equal(saved.length,1);assert.equal(saved[0].emailId,payload.data.email_id);
 assert.ok(!JSON.stringify(saved).includes('PRIVATE'));assert.deepEqual(Object.keys(saved[0]).sort(),['emailId','id','occurredAt','type']);
});
test('tampering, wrong signature and stale/future timestamps never touch DB',async()=>{
 let calls=0;const save=async()=>{calls++;};
 const signed=request();const changed=new Request(signed.url,{method:'POST',headers:signed.headers,body:JSON.stringify({...payload,type:'email.bounced'})});
 assert.equal((await handleDeliveryWebhook(changed,config,save)).status,400);
 assert.equal((await handleDeliveryWebhook(request(),{...config,secret:'whsec_'+Buffer.alloc(32,8).toString('base64')},save)).status,400);
 for(const offset of [-600000,600000])assert.equal((await handleDeliveryWebhook(request(undefined,new Date(Date.now()+offset)),config,save)).status,400);
 assert.equal(calls,0);
});
test('disabled endpoint, missing secret, oversized and malformed payloads fail closed',async()=>{
 let calls=0;const save=async()=>{calls++;};
 assert.equal((await handleDeliveryWebhook(request(),{enabled:false,secret},save)).status,503);
 assert.equal((await handleDeliveryWebhook(request(),{enabled:true},save)).status,503);
 assert.equal((await handleDeliveryWebhook(request('x'.repeat(65537)),config,save)).status,413);
 for(const value of ['invalid',JSON.stringify({...payload,data:{email_id:'bad'}}),JSON.stringify({...payload,created_at:'bad'})])assert.equal((await handleDeliveryWebhook(request(value),config,save)).status,400);
 assert.equal(calls,0);
});
test('unsupported signed events are acknowledged; persistence errors request retry without exposing errors',async()=>{
 assert.equal((await handleDeliveryWebhook(request(JSON.stringify({type:'email.opened'})),config,async()=>{throw new Error('unexpected');})).status,204);
 const response=await handleDeliveryWebhook(request(),config,async()=>{throw new Error('PRIVATE database credentials');});
 assert.equal(response.status,503);assert.equal(await response.text(),'');assert.equal(response.headers.get('Cache-Control'),'no-store');
});
