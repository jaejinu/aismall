import { execFile as callbackExecFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from './migrate.mjs';
const execFile = promisify(callbackExecFile);
const docker = process.env.DOCKER_BIN || (existsSync('/Applications/Docker.app/Contents/Resources/bin/docker') ? '/Applications/Docker.app/Contents/Resources/bin/docker' : 'docker');
const name = `aismall-test-${randomUUID()}`;
try {
  await execFile(docker, ['run', '-d', '--rm', '--name', name, '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_PASSWORD=local_test_only', '-p', '127.0.0.1::5432', 'postgres:17']);
  const { stdout } = await execFile(docker, ['port', name, '5432/tcp']);
  const port = stdout.trim().split(':').at(-1);
  const admin = `postgresql://postgres:local_test_only@127.0.0.1:${port}/postgres`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    const client = new pg.Client({ connectionString: admin, connectionTimeoutMillis: 500 });
    try { await client.connect(); await client.query('SELECT 1'); ready = true; }
    catch { /* Startup only. */ }
    finally { await client.end(); }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error('Test PostgreSQL did not become ready');
  const client = new pg.Client({ connectionString: admin });
  await client.connect();
  try { await client.query(await readFile(new URL('../db/local/init.sql', import.meta.url), 'utf8')); }
  finally { await client.end(); }
  await migrate(admin);
  await migrate(admin); // Reapplying is a no-op.
  const child = spawn(process.execPath, ['--conditions=react-server', '--import', 'tsx', '--test', '--test-concurrency=1', 'tests/tenancy.test.ts', 'tests/auth-onboarding.test.ts', 'tests/team.test.ts', 'tests/bookings.test.ts', 'tests/member-bookings.test.ts', 'tests/notification-outbox.test.ts', 'tests/notification-webhook.test.ts'], {
    stdio: 'inherit', env: { ...process.env, TEST_DATABASE_ADMIN_URL: admin, TEST_DATABASE_URL: `postgresql://aismall_runtime:aismall_local_only@127.0.0.1:${port}/postgres` },
  });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  process.exitCode = code === 0 ? 0 : 1;
} finally {
  await execFile(docker, ['rm', '-f', name]).catch(() => {});
}
