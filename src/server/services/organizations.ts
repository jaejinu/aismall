import 'server-only';
import type { Pool } from 'pg';
import { AuthenticationRequired, requireSession, type SessionProvider } from '../auth/session';

export async function listOrganizations(pool: Pool, provider: SessionProvider) {
  const session = await requireSession(provider);
  const { rows } = await pool.query<{ id: string; name: string; role: string }>('SELECT * FROM app_private.my_organizations($1)', [session.userId]);
  return rows;
}

export async function createFirstOrganization(pool: Pool, provider: SessionProvider, organization: string, branch: string) {
  if (![organization, branch].every(value => value.trim().length > 0 && [...value.trim()].length <= 120)) throw new Error('이름은 1~120자로 입력해 주세요.');
  const session = await requireSession(provider);
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: string }>('SELECT app_private.create_first_organization($1,$2,$3) AS id', [session.userId, organization.trim(), branch.trim()]);
    if (session.expiresAt <= Date.now()) throw new AuthenticationRequired();
    await client.query('COMMIT');
    return rows[0].id;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = true; }
    throw error;
  } finally { client.release(discard); }
}
