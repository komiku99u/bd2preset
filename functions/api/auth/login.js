import { createSession, sessionCookie, json } from "../../_auth/auth.js";
import { hashPassword, verifyPassword } from "../../_auth/password.js";

async function ensureAdminTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_iterations INTEGER NOT NULL DEFAULT 100000,
      created_at TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username
    ON admin_users(username)
  `).run();
}

async function getAdmin(env, username) {
  return env.DB.prepare(
    "SELECT id, username, password_hash, password_salt, password_iterations FROM admin_users WHERE username = ? LIMIT 1"
  ).bind(username).first();
}

async function seedLegacyAdmin(env) {
  const legacyUsername = String(env.ADMIN_USERNAME || "").trim();
  if (!legacyUsername || !env.ADMIN_PASSWORD) return null;

  const existing = await getAdmin(env, legacyUsername);
  if (existing) return existing;

  const password = await hashPassword(String(env.ADMIN_PASSWORD));
  const id = "admin_" + crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO admin_users
      (id, username, password_hash, password_salt, password_iterations, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    legacyUsername,
    password.hash,
    password.salt,
    password.iterations,
    now
  ).run();

  return getAdmin(env, legacyUsername);
}

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: "SESSION_SECRET belum dikonfigurasi." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return json({ error: "Username dan password wajib diisi." }, 400);
  }

  let admin;

  try {
    // Make the migration self-healing: no manual D1 table creation is
    // required before the first legacy-admin login.
    await ensureAdminTable(env);

    admin = await getAdmin(env, username);

    // First-login migration from the old Cloudflare Pages secrets.
    // The password is never stored as plaintext; only its PBKDF2 hash is saved.
    const legacyUsername = String(env.ADMIN_USERNAME || "").trim();

    if (!admin && legacyUsername && username === legacyUsername && env.ADMIN_PASSWORD) {
      admin = await seedLegacyAdmin(env);
    }
  } catch (err) {
    console.error("Admin login database error:", err);
    return json({
      error: "Database admin belum siap: " + (err?.message || "unknown database error")
    }, 500);
  }

  if (
    !admin ||
    !(await verifyPassword(
      password,
      admin.password_hash,
      admin.password_salt,
      admin.password_iterations
    ))
  ) {
    return json({ error: "Username atau password salah." }, 401);
  }

  const token = await createSession(admin.username, env.SESSION_SECRET);

  return json(
    { ok: true },
    200,
    { "Set-Cookie": sessionCookie(token) }
  );
}
