import type {NotificationDelivery} from '@/server/services/notification-monitor';
const facts=[
 {type:'email.complained',label:'스팸 신고',tone:'bg-danger-bg text-danger-fg',guidance:'회원이 스팸으로 신고했어요. 이 지점 고객의 추가 예약 이메일을 차단해요. 수신 의사를 확인해 주세요.'},
 {type:'email.bounced',label:'영구 반송',tone:'bg-danger-bg text-danger-fg',guidance:'수신 메일 서버가 이메일을 거절했어요. 이 지점 고객의 추가 예약 이메일을 차단해요. 주소와 수신 의사를 확인해 주세요.'},
 {type:'email.suppressed',label:'공급자 발송 차단',tone:'bg-danger-bg text-danger-fg',guidance:'발송 서비스가 전송을 막았어요. 공급자의 차단 사유를 확인해 주세요.'},
 {type:'email.failed',label:'발송 실패',tone:'bg-danger-bg text-danger-fg',guidance:'발송 서비스에서 전송에 실패했어요. 발신자 설정과 수신 주소를 확인해 주세요.'},
 {type:'email.delivered',label:'메일 서버 전달',tone:'bg-success-bg text-success-fg',guidance:'수신 메일 서버가 이메일을 받았어요. 받은편지함 도착이나 회원의 열람을 뜻하지는 않아요.'},
 {type:'email.delivery_delayed',label:'전달 지연',tone:'bg-risk-medium-bg text-fg',guidance:'발송 서비스가 전달을 지연 중이에요. 중복 발송하지 말고 후속 결과를 기다려 주세요.'},
 {type:'email.sent',label:'공급자 접수',tone:'bg-info-bg text-info-fg',guidance:'발송 서비스가 이메일을 접수했어요. 수신 메일 서버의 전달 결과를 기다리고 있어요.'},
];
/** Attention-worthy facts take precedence; arrival order never downgrades delivery. */
export function deliveryPresentation(delivery:NotificationDelivery|undefined,accepted:boolean){
 const fact=facts.find(f=>delivery?.events.some(e=>e.type===f.type));
 if(fact)return {...fact,occurredAt:delivery?.events.find(e=>e.type===fact.type)?.occurred_at};
 return {label:delivery?.receipt_recorded?'전달 결과 대기':accepted?'전달 확인 불가':'전달 결과 없음',tone:'bg-subtle text-fg-secondary',guidance:delivery?.receipt_recorded?'발송 접수 기록이 있어요. 전달 결과가 아직 도착하지 않았어요.':accepted?'발송 접수는 기록됐지만 전달 결과와 연결할 정보가 없어요. 전달 완료로 판단하지 마세요.':'아직 연결된 발송 접수·전달 기록이 없어요.',occurredAt:undefined};
}
const date=(value:string)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export function NotificationDeliveryCard({delivery,accepted}:{delivery?:NotificationDelivery;accepted:boolean}){
 const state=deliveryPresentation(delivery,accepted);
 const observed=facts.flatMap(f=>{const event=delivery?.events.find(e=>e.type===f.type);return event?[{...f,...event}]:[];});
 return <div className="mt-4 rounded-xl bg-subtle/60 p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-label-sm">전달 결과</p><span className={`rounded-full px-2.5 py-1 text-label-sm ${state.tone}`}>{state.label}</span></div>
  <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{state.guidance}</p>
  {state.occurredAt&&<p className="mt-2 text-caption text-fg-muted">결과 발생 {date(state.occurredAt)}</p>}
  {delivery?.last_received_at&&<p className="mt-1 text-caption text-fg-muted">마지막 결과 수신 {date(delivery.last_received_at)} · 한국 시간</p>}
  {observed.length>1&&<details className="mt-3 text-caption text-fg-muted"><summary className="cursor-pointer">확인된 결과 {observed.length}종류</summary><p className="mt-2">주의가 필요한 결과를 먼저 표시해요. 각 결과의 최초 발생 시각이에요.</p><ul className="mt-2 space-y-1">{observed.map(e=><li key={e.type}>{e.label} · {date(e.occurred_at)}</li>)}</ul></details>}
 </div>;
}
