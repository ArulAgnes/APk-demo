import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type AppDatabase = NodePgDatabase;

const globalForDb = globalThis as typeof globalThis & {
  __mathspherePgPool?: Pool;
};

let instance: AppDatabase | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Database is not configured. Add DATABASE_URL to .env.local and restart the server.");
  }
  return url;
}

function getPool(): Pool {
  if (globalForDb.__mathspherePgPool) return globalForDb.__mathspherePgPool;

  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (error) => {
    console.error("[db] PostgreSQL idle client error:", error.message);
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__mathspherePgPool = pool;
  }

  return pool;
}

function getDb(): AppDatabase {
  if (!instance) instance = drizzle(getPool());
  return instance;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Lazily initialized so pages that do not touch the database can still render
 * (and the app can build) when DATABASE_URL is absent. Database-backed routes
 * receive a clear error inside their existing try/catch blocks instead.
 */
export const db = new Proxy({} as AppDatabase, {
  get(_target, property) {
    const real = getDb();
    const value = Reflect.get(real, property, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
