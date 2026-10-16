'use server';
import { redirect } from 'next/navigation';
import { currentSessionProvider } from '@/server/auth/current';
import { getDatabasePool } from '@/server/db/pool';
import { createFirstOrganization } from '@/server/services/organizations';

export async function onboard(_previous: string, form: FormData): Promise<string> {
  const organization = form.get('organization');
  const branch = form.get('branch');
  if (typeof organization !== 'string' || typeof branch !== 'string' || ![organization, branch].every(s => s.trim().length > 0 && [...s.trim()].length <= 120)) return '조직과 지점 이름은 각각 1~120자로 입력해 주세요.';
  let id: string;
  try { id = await createFirstOrganization(getDatabasePool(), await currentSessionProvider(), organization, branch); }
  catch { return '조직을 만들지 못했어요. 로그인 상태를 확인한 뒤 다시 시도해 주세요.'; }
  redirect(`/workspace/${id}`);
}
