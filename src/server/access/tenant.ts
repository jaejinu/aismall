import "server-only";
import type { Pool, PoolClient } from "pg";
import { AuthenticationRequired, requireSession, uuidPattern, type SessionProvider } from "../auth/session";

export class AccessDenied extends Error {
  constructor() {
    super("접근할 수 없는 조직 또는 지점이에요.");
    this.name = "AccessDenied";
  }
}

export type TenantContext = Readonly<{
  tenantId: string;
  userId: string;
  membershipId: string;
  role: "tenant_admin" | "branch_staff";
}>;

/** One checked-out connection, one transaction, no session-level tenant state.
 * Only trusted server code may supply the provider or transaction callback.
 * Do not let the client/context escape this callback or start unawaited work.
 */
export async function withTenant<T>(
  pool: Pool,
  provider: SessionProvider,
  tenantId: string,
  work: (client: PoolClient, context: TenantContext) => Promise<T>,
): Promise<T> {
  const session = await requireSession(provider);
  if (!uuidPattern.test(tenantId)) throw new AccessDenied();
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query("BEGIN");
    const { rows: roles } = await client.query<{ unsafe: boolean }>(`
      SELECT r.rolsuper OR r.rolbypassrls
        OR NOT pg_has_role(current_user, 'aismall_app', 'member')
        OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = 'app' AND c.relowner = r.oid) AS unsafe
      FROM pg_roles r WHERE r.rolname = current_user
    `);
    if (roles.length !== 1 || roles[0].unsafe) throw new Error("업무 DB 연결에 최소 권한 실행 계정이 필요해요.");
    await client.query("SELECT set_config('app.user_id', $1, true), set_config('app.tenant_id', $2, true)", [session.userId, tenantId]);
    const { rows } = await client.query<{ membership_id: string; role: TenantContext["role"] }>(`
      SELECT m.id AS membership_id, m.role
      FROM app.staff_memberships m JOIN app.tenants t ON t.id = m.tenant_id
      WHERE m.tenant_id = $1 AND m.user_id = $2 AND m.status = 'active' AND t.status = 'active'
    `, [tenantId, session.userId]);
    if (rows.length !== 1) throw new AccessDenied();
    const context = Object.freeze({ tenantId, userId: session.userId, membershipId: rows[0].membership_id, role: rows[0].role });
    const result = await work(client, context);
    // Do not commit a long-running write after the verified session expires.
    if (session.expiresAt <= Date.now()) throw new AuthenticationRequired();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}
