/**
 * Creates (or updates the password of) the first SUPER_ADMIN account from env vars.
 * Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Str0ngPass!' npm run seed:admin
 */
import "dotenv/config";
import { pool } from "./pool";
import { hashPassword, isPasswordStrongEnough } from "../utils/password";

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables first.");
    process.exit(1);
  }
  if (password.length < 12 || !isPasswordStrongEnough(password)) {
    console.error("ADMIN_PASSWORD must be at least 12 characters with upper and lower case letters and a number.");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  await pool.query(
    `INSERT INTO admin_users (email, password_hash, role)
     VALUES (?, ?, 'SUPER_ADMIN')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [email, hash]
  );
  const result = await pool.query(
    "SELECT id, email, role FROM admin_users WHERE email = ?",
    [email]
  );
  console.log("[seed:admin] admin ready:", result.rows[0]);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
