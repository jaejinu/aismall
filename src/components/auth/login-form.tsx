'use client';
import { useActionState } from 'react';
import { login } from '@/app/login/actions';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const [error, action, pending] = useActionState(login, '');
  return <form action={action} className="space-y-5">
    <label className="block text-label-md">이메일<input name="email" type="email" autoComplete="username" required maxLength={254} className="mt-2 block w-full rounded-md border border-line bg-surface p-3 text-body-md" /></label>
    <label className="block text-label-md">비밀번호<input name="password" type="password" autoComplete="current-password" required maxLength={1024} className="mt-2 block w-full rounded-md border border-line bg-surface p-3 text-body-md" /></label>
    {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
    <Button type="submit" variant="primary" disabled={pending} className="w-full">{pending ? '로그인 중…' : '로그인하기'}</Button>
  </form>;
}
