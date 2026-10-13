import "server-only";
import type { Pool } from "pg";
import { uuidPattern, type SessionProvider } from "../auth/session";
import { AccessDenied, withTenant } from "../access/tenant";

type BranchRow = { id: string; slug: string; name: string; timezone: string; version: number };
export type Branch = Readonly<BranchRow>;

export class VersionConflict extends Error {
  constructor() {
    super("다른 사람이 먼저 변경했어요. 최신 내용을 확인해 주세요.");
    this.name = "VersionConflict";
  }
}

export function listBranches(pool: Pool, session: SessionProvider, tenantId: string): Promise<Branch[]> {
  return withTenant(pool, session, tenantId, async (client, context) => {
    const { rows } = await client.query<BranchRow>(`
      SELECT id, slug, name, timezone, version FROM app.branches
      WHERE tenant_id = $1 ORDER BY name, id
    `, [context.tenantId]);
    return rows;
  });
}

/** Initial write path: optimistic version check + branch permission + atomic audit. */
export function renameBranch(
  pool: Pool,
  session: SessionProvider,
  input: { tenantId: string; branchId: string; name: string; expectedVersion: number },
): Promise<Branch> {
  const name = input.name.trim();
  if (!uuidPattern.test(input.branchId) || !name || [...name].length > 120 || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) {
    throw new Error("지점 이름과 수정 버전을 확인해 주세요.");
  }
  return withTenant(pool, session, input.tenantId, async (client, context) => {
    const { rows: access } = await client.query<{ allowed: boolean }>(
      "SELECT app_private.can_access_branch($1, $2, true) AS allowed", [context.tenantId, input.branchId],
    );
    if (!access[0]?.allowed) throw new AccessDenied();
    const { rows: before } = await client.query<BranchRow>(`
      SELECT id, slug, name, timezone, version FROM app.branches
      WHERE tenant_id = $1 AND id = $2 FOR UPDATE
    `, [context.tenantId, input.branchId]);
    if (!before[0]) throw new AccessDenied();
    if (before[0].version !== input.expectedVersion) throw new VersionConflict();
    const { rows } = await client.query<BranchRow>(`
      UPDATE app.branches SET name = $3 WHERE tenant_id = $1 AND id = $2 AND version = $4
      RETURNING id, slug, name, timezone, version
    `, [context.tenantId, input.branchId, name, input.expectedVersion]);
    if (!rows[0]) throw new AccessDenied();
    await client.query(`
      INSERT INTO app.audit_events (tenant_id, branch_id, actor_user_id, action, details)
      VALUES ($1, $2, $3, 'branch.renamed', $4::jsonb)
    `, [context.tenantId, input.branchId, context.userId, JSON.stringify({ before: before[0].name, after: name, version: rows[0].version })]);
    return rows[0];
  });
}
