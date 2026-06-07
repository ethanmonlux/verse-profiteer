import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

// The pool and db are constructed lazily on first access rather than at module
// import time, so importing this module never crashes a build, test, or page-data
// collection when DATABASE_URL is absent. The throw moves into getPool().
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Returns the single shared pool for the whole process, constructing it on first
 * call. The worker is responsible for calling getPool().end() on exit so the
 * process can shut down cleanly.
 */
export function getPool(): Pool {
  if (_pool === null) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. The mirror persistence layer requires a Postgres connection string.",
      );
    }
    _pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

export function getDb(): ReturnType<typeof drizzle> {
  if (_db === null) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}
