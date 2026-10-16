import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deliveryPresentation} from '../src/components/bookings/notification-delivery-card';
const stamp='2026-10-16T03:00:00Z';
const delivery=(types:string[])=>({receipt_recorded:true,last_received_at:stamp,events:types.map(type=>({type,occurred_at:stamp}))});
test('delivery presentation distinguishes receipt pending, unlinked acceptance and no delivery evidence',()=>{
 assert.equal(deliveryPresentation(delivery([]),true).label,'전달 결과 대기');
 assert.equal(deliveryPresentation({...delivery([]),receipt_recorded:false},true).label,'전달 확인 불가');
 assert.equal(deliveryPresentation(undefined,false).label,'전달 결과 없음');
 assert.notEqual(deliveryPresentation(delivery(['unknown']),true).label,'메일 서버 전달');
});
test('delivery presentation prioritizes actionable facts independently of event arrival order',()=>{
 for(const events of [['email.delivered','email.delivery_delayed'],['email.delivery_delayed','email.delivered']])assert.equal(deliveryPresentation(delivery(events),true).label,'메일 서버 전달');
 for(const events of [['email.delivered','email.bounced'],['email.bounced','email.delivered']])assert.equal(deliveryPresentation(delivery(events),true).label,'영구 반송');
 assert.equal(deliveryPresentation(delivery(['email.delivered','email.bounced','email.complained']),true).label,'스팸 신고');
 assert.equal(deliveryPresentation(delivery(['email.failed']),true).label,'발송 실패');
 assert.equal(deliveryPresentation(delivery(['email.suppressed']),true).label,'공급자 발송 차단');
 assert.equal(deliveryPresentation(delivery(['email.sent']),true).label,'공급자 접수');
});
