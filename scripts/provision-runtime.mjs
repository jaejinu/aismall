import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { validateProviderConfig } from './lib/provider-config.mjs';

// Explicitly target one development project; never rotate an existing role.
process.loadEnvFile('.env.local');
const ref = process.argv[2];
if (!ref || process.env.SUPABASE_URL !== `https://${ref}.supabase.co`) throw new Error('Pass the exact development project reference');
if (process.env.DATABASE_URL) throw new Error('Runtime URL already exists; inspect it instead of reprovisioning');
const adminUrl = new URL(process.env.DATABASE_ADMIN_URL);
if (decodeURIComponent(adminUrl.username) !== `postgres.${ref}` || !adminUrl.hostname.endsWith('.pooler.supabase.com') || adminUrl.port !== '5432' || adminUrl.searchParams.get('sslmode') !== 'verify-full') throw new Error('Verified administrator session-pooler connection required');
const password = randomBytes(32).toString('base64url');
const runtimeUrl = new URL(adminUrl);
runtimeUrl.username = `aismall_runtime.${ref}`;
runtimeUrl.password = password;
runtimeUrl.port = '6543';
if (validateProviderConfig({ ...process.env, DATABASE_URL: runtimeUrl.href }).length) throw new Error('Runtime configuration validation failed');
const original = fs.readFileSync('.env.local', 'utf8');
if (!/^DATABASE_URL=\s*$/m.test(original)) throw new Error('An empty DATABASE_URL line is required');
const next = original.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${runtimeUrl.href}`);
const client = new pg.Client({ connectionString: adminUrl.href, connectionTimeoutMillis:5000 });
let wrote = false;
let commitAttempted = false;
try {
  await client.connect();
  await client.query('BEGIN');
  const { rows } = await client.query("SELECT 1 FROM pg_roles WHERE rolname='aismall_runtime'");
  if (rows.length) throw new Error('Role already exists; no changes made');
  await client.query(`CREATE ROLE aismall_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD ${pg.escapeLiteral(password)}`);
  await client.query('GRANT aismall_app TO aismall_runtime');
  if (fs.readFileSync('.env.local','utf8') !== original) throw new Error('Environment file changed during provisioning');
  fs.writeFileSync('.env.local', next, {mode:0o600});
  wrote = true;
  commitAttempted = true;
  await client.query('COMMIT');
  console.log('Restricted runtime role created; credentials saved only in ignored .env.local.');
} catch {
  await client.query('ROLLBACK').catch(()=>{});
  if (wrote && !commitAttempted && fs.readFileSync('.env.local','utf8') === next) fs.writeFileSync('.env.local',original,{mode:0o600});
  console.error('Runtime provisioning failed; inspect role and connection state before retrying. Credentials hidden.');
  process.exitCode = 1;
} finally { await client.end(); }
