import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { authConfig, authCookieOptions } from './config';

export async function createAuthClient(writable = false) {
  const jar = await cookies();
  const { url, key } = authConfig();
  return createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        // Proxy refreshes before Server Components render; actions can write.
        if (writable) for (const { name, value, options } of values) jar.set(name, value, options);
      },
    },
  });
}
