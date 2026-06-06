import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. The mirror persistence layer requires a Postgres connection string.",
  );
}

// Single shared pool for the whole process. The worker is responsible for
// calling pool.end() on exit so the process can shut down cleanly.
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
