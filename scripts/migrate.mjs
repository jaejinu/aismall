import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import pg from 'pg';

export async function migrate(connectionString) {
  if (!connectionString) throw new Error('DATABASE_ADMIN_URL is required');
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(73482101)');
    await client.query('CREATE SCHEMA IF NOT EXISTS aismall_migrations');
    await client.query('REVOKE ALL ON SCHEMA aismall_migrations FROM PUBLIC');
    await client.query('CREATE TABLE IF NOT EXISTS aismall_migrations.versions (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory = new URL('../db/migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const { rows } = await client.query('SELECT checksum FROM aismall_migrations.versions WHERE name=$1', [name]);
      if (rows.length) {
        if (rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO aismall_migrations.versions(name,checksum) VALUES($1,$2)', [name, checksum]);
      console.log(`Applied ${name}`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  await migrate(process.env.DATABASE_ADMIN_URL);
}
