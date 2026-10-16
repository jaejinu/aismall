import 'server-only';

export function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !key?.startsWith('sb_publishable_')) {
    throw new Error('인증 서비스 설정을 확인해 주세요.');
  }
  return { url, key, issuer: `${url}/auth/v1` };
}

// This app uses server-only Auth, so the browser never needs to read tokens.
export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
