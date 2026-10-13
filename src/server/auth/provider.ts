import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Pool } from 'pg';
import { uuidPattern, type SessionProvider } from './session';

/** Auth server validation + verified JWT; never trust cookie user metadata. */
export function supabaseSessionProvider(client: Pick<SupabaseClient, 'auth'>, pool: Pool, issuer: string): SessionProvider {
  return {
    async getVerifiedSession() {
      const { data: verified, error: userError } = await client.auth.getUser();
      if (userError || !verified.user || !verified.user.email_confirmed_at || verified.user.is_anonymous) return null;
      const { data, error } = await client.auth.getClaims();
      const claims = data?.claims;
      if (error || !claims || claims.iss !== issuer || claims.sub !== verified.user.id || !uuidPattern.test(claims.sub)
        || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) return null;
      const { rows } = await pool.query<{ id: string }>('SELECT app_private.resolve_identity($1,$2) AS id', [issuer, claims.sub]);
      return { userId: rows[0].id, expiresAt: claims.exp * 1000, verifiedEmail: verified.user.email?.trim().toLowerCase() };
    },
  };
}
