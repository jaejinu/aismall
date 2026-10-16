import { existsSync } from 'node:fs';
import pg from 'pg';
import { validateProviderConfig, inspectRuntimeDatabase } from './lib/provider-config.mjs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const args = process.argv.slice(2);
if (args.some(arg=>arg!=='--remote')) {
  console.error('Usage: npm run provider:check -- [--remote]');
  process.exitCode = 1;
} else {
  const errors = validateProviderConfig(process.env);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log('Provider configuration format passed (values hidden).');
    if (args.includes('--remote')) {
      let stage = 'Auth endpoint';
      const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, query_timeout: 10000 });
      try {
        const response = await fetch(new URL('/auth/v1/settings', process.env.SUPABASE_URL), {
          headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY },
          signal: AbortSignal.timeout(10000), redirect: 'error', cache: 'no-store',
        });
        if (!response.ok) throw new Error();
        await response.body?.cancel();
        stage = 'Database connection, role and RLS';
        await client.connect();
        await inspectRuntimeDatabase(client);
        console.log('Auth endpoint and read-only DB checks passed. Real sign-in and cross-tenant tests are still required.');
      } catch {
        // Driver/HTTP errors can contain connection details. Never print them.
        console.error(`${stage} check failed. Check the setup guide; no credentials were logged.`);
        process.exitCode = 1;
      } finally { await client.end(); }
    } else {
      console.log('No network requests made. Use --remote after provisioning to check Auth availability and DB permissions.');
    }
  }
}
