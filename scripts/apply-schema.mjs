import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { loadEnv } from "./env.mjs";

/**
 * Applies supabase/schema.sql to the project database.
 * Requires DATABASE_URL in .env.local (Supabase → Settings → Database →
 * Connection string; the session-pooler URI works best on Windows/IPv4).
 *
 * One-shot: the schema uses plain `create` statements, so run against a
 * fresh project (or drop the tables first).
 */
loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// optional arg: path to a .sql file (e.g. supabase/migrations/002_auth.sql)
const target = process.argv[2] ?? join("supabase", "schema.sql");
const sql = readFileSync(join(root, target), "utf8");

// Parse the URI ourselves and pass explicit fields — pg's connection-string
// parser mis-handles some percent-encoded passwords.
const parsed = new URL(url);
const client = new pg.Client({
  host: parsed.hostname,
  port: Number(parsed.port || 5432),
  database: parsed.pathname.replace(/^\//, "") || "postgres",
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`${target} applied`);
} catch (err) {
  console.error("apply failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
