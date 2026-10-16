'use client';
import {useActionState,useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import type {BookingActionState} from '@/app/workspace/booking-actions';
type Props={action:(state:BookingActionState,form:FormData)=>Promise<BookingActionState>;initialRequest:string;label:string;children:ReactNode};
export function RegistrationForm(props:Props) {
 const [request,setRequest]=useState(props.initialRequest);
 return <RegistrationAttempt key={request} {...props} request={request} reset={()=>setRequest(crypto.randomUUID())}/>;
}
function RegistrationAttempt({action,label,children,request,reset}:Props&{request:string;reset:()=>void}) {
 const [state,submit,pending]=useActionState(action,{message:''});
 return state.ok?<div className="space-y-3"><p role="status" className="rounded-lg bg-success-bg p-3 text-body-sm">{state.message}</p><Button type="button" onClick={reset}>새 등록 시작</Button></div>:<form action={submit} className="space-y-4"><fieldset disabled={pending} className="space-y-4"><input type="hidden" name="request" value={request}/>{children}<Button type="submit" disabled={pending}>{pending?'저장 중…':label}</Button></fieldset>{state.message&&<p role="alert" className="text-body-sm">{state.message}</p>}<p className="text-caption text-fg-muted">같은 등록 요청을 다시 보내도 한 번만 저장해요.</p></form>;
}
