import { getSession, json } from "./_auth/auth.js";

function wantsJson(path) {
  return path.startsWith("/api/");
}

async function isActiveAdmin(env, session) {
  if (!session?.u) return false;
  const row = await env.DB.prepare(
    "SELECT id FROM admin_users WHERE username = ? LIMIT 1"
  ).bind(session.u).first();
  return !!row;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const isAdminPage = url.pathname === "/admin.html" || url.pathname === "/admin-users.html";
  const isPresetMutation =
    url.pathname === "/api/presets" ||
    url.pathname.startsWith("/api/presets/");
  const isAdminApi =
    url.pathname === "/api/admin/users" ||
    url.pathname.startsWith("/api/admin/users/");

  const needsAuth =
    isAdminPage ||
    isAdminApi ||
    (isPresetMutation && request.method !== "GET");

  if (!needsAuth) return context.next();

  const session = await getSession(request, env.SESSION_SECRET);
  const active = session ? await isActiveAdmin(env, session) : false;

  if (active) return context.next();

  if (wantsJson(url.pathname)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const loginUrl = new URL("/login.html", url.origin);
  loginUrl.searchParams.set("next", url.pathname);
  return Response.redirect(loginUrl.toString(), 302);
}
