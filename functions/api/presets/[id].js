import { getSession, json } from "../../_auth/auth.js";


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
 * GET /api/presets/:id
 *
 * Public.
 */
export async function onRequestGet({ env, params }) {
  const id = params.id;

  const row = await getPreset(env, id);

  if (!row) {
    return json(
      { error: "Preset not found" },
      404
    );
  }

  return json({
    preset: rowToPreset(row)
  });
}


/*
 * PUT /api/presets/:id
 *
 * Mengedit preset.
 *
 * created_by TIDAK diubah.
 * Jadi kalau admin2 mengedit preset milik admin1,
 * tetap tercatat:
 *
 * created_by = admin1
 */
export async function onRequestPut({
  request,
  env,
  params
}) {
  const session = await getSession(
    request,
    env.SESSION_SECRET
  );

  if (!session?.u) {
    return json(
      { error: "Unauthorized" },
      401
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Invalid JSON" },
      400
    );
  }

  const id = params.id;

  const existing = await getPreset(env, id);

  if (!existing) {
    return json(
      { error: "Preset not found" },
      404
    );
  }

  const name = String(
    body.name ?? existing.name
  ).slice(0, 100);

  const description = String(
    body.description ?? existing.description
  ).slice(0, 500);

  const team = Array.isArray(body.team)
    ? body.team
    : JSON.parse(existing.team_json || "[]");

  if (team.length > 5) {
    return json(
      {
        error:
          "A preset can contain at most 5 characters."
      },
      400
    );
  }

  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE presets
     SET
       name = ?,
       description = ?,
       team_json = ?,
       updated_at = ?
     WHERE id = ?`
  ).bind(
    name,
    description,
    JSON.stringify(team),
    now,
    id
  ).run();

  const row = await getPreset(env, id);

  return json({
    preset: rowToPreset(row)
  });
}


/*
 * DELETE /api/presets/:id
 *
 * Hanya admin yang sudah login.
 */
export async function onRequestDelete({
  request,
  env,
  params
}) {
  const session = await getSession(
    request,
    env.SESSION_SECRET
  );

  if (!session?.u) {
    return json(
      { error: "Unauthorized" },
      401
    );
  }

  const id = params.id;

  const result = await env.DB.prepare(
    "DELETE FROM presets WHERE id = ?"
  ).bind(id).run();

  if (!result.meta.changes) {
    return json(
      { error: "Preset not found" },
      404
    );
  }

  return json({
    ok: true
  });
}
