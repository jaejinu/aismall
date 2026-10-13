import 'server-only';
import { createAuthClient } from './client';
import { authConfig } from './config';
import { supabaseSessionProvider } from './provider';
import { getDatabasePool } from '../db/pool';

export async function currentSessionProvider() {
  return supabaseSessionProvider(await createAuthClient(), getDatabasePool(), authConfig().issuer);
}
