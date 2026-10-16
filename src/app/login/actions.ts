'use server';
import { redirect } from 'next/navigation';
import { createAuthClient } from '@/server/auth/client';

export async function login(_previous: string, form: FormData): Promise<string> {
  const email = form.get('email');
  const password = form.get('password');
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    || typeof password !== 'string' || !password.length || password.length > 1024) return '이메일과 비밀번호를 확인해 주세요.';
  try {
    const client = await createAuthClient(true);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return '로그인하지 못했어요. 입력 내용과 이메일 인증 여부를 확인하고 잠시 후 다시 시도해 주세요.';
  } catch { return '로그인 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'; }
  // Fixed internal destination; no untrusted return URL.
  redirect('/workspace');
}

export async function logout() {
  const client = await createAuthClient(true);
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw new Error('로그아웃하지 못했어요. 다시 시도해 주세요.');
  redirect('/login');
}
