import { json } from "../../../_auth/auth.js";
import { hashPassword } from "../../../_auth/password.js";

function makeId() {
  return "admin_" + crypto.randomUUID();
}

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare(
    "SELECT id, username, created_at FROM admin_users ORDER BY created_at ASC"
  ).all();
  return json({ users: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
    return json({ error: "Username harus 3-32 karakter dan hanya boleh memakai huruf, angka, titik, garis bawah, atau tanda hubung." }, 400);
  }
  if (password.length < 3) {
    return json({ error: "Password minimal 3 karakter." }, 400);
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM admin_users WHERE username = ?"
  ).bind(username).first();
  if (existing) return json({ error: "Username sudah digunakan." }, 409);

  const passwordData = await hashPassword(password);
  const id = makeId();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO admin_users
      (id, username, password_hash, password_salt, password_iterations, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, username, passwordData.hash, passwordData.salt, passwordData.iterations, now).run();

  return json({ ok: true, user: { id, username, created_at: now } }, 201);
}
