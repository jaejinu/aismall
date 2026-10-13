'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { TeamActionState } from '@/app/workspace/team-actions';
export function TeamForm({action,children,label,danger=false,primary=false}:{action:(state:TeamActionState,form:FormData)=>Promise<TeamActionState>;children?:React.ReactNode;label:string;danger?:boolean;primary?:boolean}) {
  const [state,submit,pending]=useActionState(action,{message:''});
  return <form action={submit} className="space-y-4">
    <fieldset disabled={pending} className="space-y-4">{children}<Button type="submit" variant={danger?'danger':primary?'primary':'secondary'} disabled={pending}>{pending?'처리 중…':label}</Button></fieldset>
    {state.message && <p role={state.ok?'status':'alert'} className="text-body-sm">{state.message}</p>}
    {state.code && <div className="rounded-lg border border-line bg-subtle p-4"><p className="mb-2 text-label-sm">초대 코드 · 7일 동안 유효</p><code className="break-all select-all text-body-sm">{state.code}</code><p className="mt-2 text-body-sm">직원이 로그인한 뒤 ‘내 조직’에서 이 코드를 입력하면 돼요. 메일은 자동 발송되지 않아요.</p></div>}
  </form>;
}
