'use client';
import { useActionState } from 'react';
import { onboard } from '@/app/workspace/actions';
import { Button } from '@/components/ui/button';
export function OnboardingForm() {
  const [error, action, pending] = useActionState(onboard, '');
  return <form action={action} className="mt-6 max-w-md space-y-5">
    <label className="block text-label-md">조직 이름<input name="organization" required maxLength={120} placeholder="예: 재진필라테스" className="mt-2 block w-full rounded-md border border-line bg-surface p-3" /></label>
    <label className="block text-label-md">첫 지점 이름<input name="branch" required maxLength={120} placeholder="예: 강남점" className="mt-2 block w-full rounded-md border border-line bg-surface p-3" /></label>
    {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
    <Button type="submit" variant="primary" disabled={pending}>{pending ? '만드는 중…' : '조직과 첫 지점 만들기'}</Button>
  </form>;
}
