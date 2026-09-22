import { getSession, json } from "../../../_auth/auth.js";

export async function onRequestDelete({ request, env, params }) {
  const session = await getSession(request, env.SESSION_SECRET);
  if (!session?.u) return json({ error: "Unauthorized" }, 401);

  const target = await env.DB.prepare(
    "SELECT id, username FROM admin_users WHERE id = ?"
  ).bind(params.id).first();
  if (!target) return json({ error: "Admin tidak ditemukan." }, 404);

  if (target.username === session.u) {
    return json({ error: "Kamu tidak bisa menghapus akun yang sedang digunakan." }, 400);
  }

  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users").first();
  if (Number(count?.count || 0) <= 1) {
    return json({ error: "Minimal harus ada satu admin." }, 400);
  }

  await env.DB.prepare("DELETE FROM admin_users WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
