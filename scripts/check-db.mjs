import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local", quiet: true });

const expectedTables = [
  "users",
  "sessions",
  "books",
  "saved_solutions",
  "solution_notes",
  "attempts",
  "topic_progress",
  "recent_activity",
  "formula_views",
  "daily_results",
  "app_metrics",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

let target;
try {
  target = new URL(url);
} catch {
  console.error("DATABASE_URL is not a valid PostgreSQL URL.");
  process.exit(1);
}

const safeTarget = {
  host: target.hostname,
  port: target.port || "5432",
  database: target.pathname.replace(/^\//, ""),
  user: decodeURIComponent(target.username),
};

const pool = new pg.Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 5_000,
});

try {
  const identity = await pool.query(
    "select current_database() as database, current_user as username, current_setting('server_version') as version"
  );
  const tables = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
  );
  const found = tables.rows.map((row) => row.table_name);
  const missing = expectedTables.filter((table) => !found.includes(table));
  const extra = found.filter((table) => !expectedTables.includes(table));

  const counts = {};
  for (const table of expectedTables.filter((name) => found.includes(name))) {
    const result = await pool.query(`select count(*)::int as count from "${table}"`);
    counts[table] = result.rows[0].count;
  }

  console.log(
    JSON.stringify(
      {
        ok: missing.length === 0,
        target: safeTarget,
        identity: identity.rows[0],
        tables: found,
        missing,
        extra,
        counts,
      },
      null,
      2
    )
  );

  if (missing.length > 0) process.exitCode = 1;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    "Database check failed:",
    message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://<redacted>")
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
