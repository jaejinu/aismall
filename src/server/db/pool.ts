import "server-only";
import { Pool } from "pg";

let pool: Pool | undefined;

/** Lazy: building/reading the demo must not require a database or open sockets. */
export function getDatabasePool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL이 설정되지 않았어요.");
  pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
  // Do not log connection URLs or driver messages that could contain secrets.
  pool.on("error", () => console.error("Database idle connection failed"));
  return pool;
}
