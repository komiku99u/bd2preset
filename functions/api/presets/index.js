import { getSession, json } from "../../_auth/auth.js";

function makeId() {
  return "preset_" + crypto.randomUUID();
}

async function getPreset(env, id) {
  return env.DB.prepare(
    `SELECT
      id,
      name,
      description,
      team_json,
      created_by,
      created_at,
      updated_at
     FROM presets
     WHERE id = ?`
  ).bind(id).first();
}

function rowToPreset(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_by: row.created_by || "unknown",
    team: JSON.parse(row.team_json || "[]"),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}


/*
 * GET /api/presets
 *
 * Public.
 * Member boleh melihat semua preset tanpa login.
 */
export async function onRequestGet({ env }) {
  const result = await env.DB.prepare(
    `SELECT
      id,
      name,
      description,
      team_json,
      created_by,
      created_at,
      updated_at
     FROM presets
     ORDER BY updated_at DESC`
  ).all();

  return json({
    presets: (result.results || []).map(rowToPreset)
  });
}


/*
 * POST /api/presets
 *
 * Membuat preset baru.
 * Username admin diambil dari session login,
 * bukan dari data yang dikirim browser.
 */
export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env.SESSION_SECRET);

  if (!session?.u) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const id = makeId();
  const now = new Date().toISOString();

  const name = String(
    body.name || "Unnamed Preset"
  ).slice(0, 100);

  const description = String(
    body.description || ""
  ).slice(0, 500);

  const team = Array.isArray(body.team)
    ? body.team
    : [];

  if (team.length > 5) {
    return json(
      { error: "A preset can contain at most 5 characters." },
      400
    );
  }

  /*
   * Username admin yang sedang login.
   *
   * Contoh:
   * admin1 membuat preset
   * → created_by = "admin1"
   */
  const createdBy = String(session.u).slice(0, 32);

  await env.DB.prepare(
    `INSERT INTO presets
      (
        id,
        name,
        description,
        team_json,
        created_by,
        created_at,
        updated_at
      )
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    name,
    description,
    JSON.stringify(team),
    createdBy,
    now,
    now
  ).run();

  const row = await getPreset(env, id);

  return json(
    {
      preset: rowToPreset(row)
    },
    201
  );
}
