/** Validation messages deliberately never include environment values. */
export function validateProviderConfig(env) {
  const errors = [];
  let authUrl;
  let databaseUrl;
  try {
    authUrl = new URL(env.SUPABASE_URL);
    if (authUrl.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(authUrl.hostname) || authUrl.username || authUrl.password || authUrl.search || authUrl.hash || authUrl.pathname !== '/') throw new Error();
  } catch { errors.push('SUPABASE_URL: hosted Supabase project HTTPS URL required'); }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.SUPABASE_PUBLISHABLE_KEY || '')) {
    errors.push('SUPABASE_PUBLISHABLE_KEY: publishable key required (never secret/service_role)');
  }
  try {
    databaseUrl = new URL(env.DATABASE_URL);
    const reference = authUrl?.hostname.split('.')[0];
    const direct = databaseUrl.hostname === `db.${reference}.supabase.co`;
    const sharedPooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(databaseUrl.hostname);
    const username = decodeURIComponent(databaseUrl.username);
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol) || !databaseUrl.password || databaseUrl.pathname !== '/postgres' || databaseUrl.hash || !(direct || sharedPooler)) throw new Error();
    if (username !== (direct ? 'aismall_runtime' : `aismall_runtime.${reference}`)) {
      errors.push('DATABASE_URL: use the aismall_runtime login for the same project');
    }
    if (databaseUrl.searchParams.get('sslmode') !== 'verify-full') {
      errors.push('DATABASE_URL: sslmode=verify-full required');
    }
    // Reject driver options which can override certificate checking.
    const allowed = new Set(['sslmode', 'sslrootcert']);
    const seen = new Set();
    for (const [key] of databaseUrl.searchParams) {
      if (!allowed.has(key) || seen.has(key)) errors.push('DATABASE_URL: unsupported or duplicate connection option');
      seen.add(key);
    }
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') errors.push('NODE_TLS_REJECT_UNAUTHORIZED must not disable TLS verification');
    if (!['5432','6543'].includes(databaseUrl.port)) errors.push('DATABASE_URL: use the dashboard connection port (5432 or 6543)');
  } catch { errors.push('DATABASE_URL: hosted Supabase PostgreSQL URL required'); }
  return [...new Set(errors)];
}

export async function inspectRuntimeDatabase(client) {
  await client.query('BEGIN READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout = '5s'");
    const { rows: roles } = await client.query(`
      SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolcreaterole, r.rolcreatedb,
        EXISTS (SELECT 1 FROM pg_roles g WHERE g.rolname='aismall_app'
          AND pg_has_role(current_user,g.oid,'MEMBER')) AS app_member,
        EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='app' AND pg_has_role(current_user,c.relowner,'MEMBER')) AS owner_member
      FROM pg_roles r WHERE r.rolname=current_user
    `);
    const role = roles[0];
    if (!role || role.rolname !== 'aismall_runtime' || role.rolsuper || role.rolbypassrls || role.rolcreaterole || role.rolcreatedb || !role.app_member || role.owner_member) {
      throw new Error('Runtime role is not sufficiently restricted');
    }
    const expected = ['users','tenants','staff_memberships','branches','branch_assignments','audit_events'];
    const { rows } = await client.query(`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='app' AND c.relkind='r' AND c.relname=ANY($1::text[])`, [expected]);
    if (rows.length !== expected.length || rows.some(r=>!r.relrowsecurity || !r.relforcerowsecurity)) {
      throw new Error('Foundation tables or forced RLS are missing');
    }
    const { rows: context } = await client.query("SELECT nullif(current_setting('app.user_id',true),'') AS user_id, nullif(current_setting('app.tenant_id',true),'') AS tenant_id");
    if (context[0].user_id || context[0].tenant_id) throw new Error('Unexpected session-level access context');
    const { rows: visible } = await client.query('SELECT EXISTS(SELECT 1 FROM app.branches) AS visible');
    if (visible[0].visible) throw new Error('Branch data visible without access context');
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
