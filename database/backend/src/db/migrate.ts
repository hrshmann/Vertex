/**
 * Applies .sql files in filename order and tracks completed migrations.
 * MariaDB implicitly commits DDL, so each migration runs outside a transaction.
 *
 * Usage: npm run migrate (from database/backend/)
 */
import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../migrations");
const MIGRATION_LOCK = "vertex-trading-schema-migrations";

async function run() {
  console.log(`[migrate] reading ${MIGRATIONS_DIR}`);
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    const lock = await client.query<{ acquired: number | null }>(
      "SELECT GET_LOCK(?, 30) AS acquired",
      [MIGRATION_LOCK]
    );
    lockAcquired = Number(lock.rows[0]?.acquired) === 1;
    if (!lockAcquired) {
      throw new Error("Could not acquire MariaDB migration lock within 30 seconds");
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB
    `);
    const appliedResult = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations"
    );
    const applied = new Set(appliedResult.rows.map((row) => row.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip  ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`[migrate] apply ${file}`);
      try {
        await client.executeScript(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
      } catch (err) {
        console.error(`[migrate] FAILED on ${file}; MariaDB may have committed earlier DDL statements`);
        throw err;
      }
    }

    console.log("[migrate] done");
  } finally {
    try {
      if (lockAcquired) {
        await client.query("SELECT RELEASE_LOCK(?)", [MIGRATION_LOCK]);
      }
    } finally {
      client.release();
    }
  }
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
