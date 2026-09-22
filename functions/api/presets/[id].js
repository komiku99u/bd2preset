function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function makeId() {
  return "preset_" + crypto.randomUUID();
}

async function getPreset(env, id) {
  return env.DB.prepare(
    "SELECT id, name, description, team_json, created_at, updated_at FROM presets WHERE id = ?"
  ).bind(id).first();
}

function rowToPreset(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    team: JSON.parse(row.team_json || "[]"),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare(
    "SELECT id, name, description, team_json, created_at, updated_at FROM presets ORDER BY updated_at DESC"
  ).all();

  return json({
    presets: (result.results || []).map(rowToPreset)
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const id = makeId();
  const now = new Date().toISOString();
  const name = String(body.name || "Unnamed Preset").slice(0, 100);
  const description = String(body.description || "").slice(0, 500);
  const team = Array.isArray(body.team) ? body.team : [];

  if (team.length > 5) {
    return json({ error: "A preset can contain at most 5 characters." }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO presets (id, name, description, team_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, description, JSON.stringify(team), now, now).run();

  const row = await getPreset(env, id);
  return json({ preset: rowToPreset(row) }, 201);
}

export async function onRequestPut({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const id = params.id;
  const existing = await getPreset(env, id);
  if (!existing) return json({ error: "Preset not found" }, 404);

  const name = String(body.name ?? existing.name).slice(0, 100);
  const description = String(body.description ?? existing.description).slice(0, 500);
  const team = Array.isArray(body.team) ? body.team : JSON.parse(existing.team_json || "[]");

  if (team.length > 5) {
    return json({ error: "A preset can contain at most 5 characters." }, 400);
  }

  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE presets
     SET name = ?, description = ?, team_json = ?, updated_at = ?
     WHERE id = ?`
  ).bind(name, description, JSON.stringify(team), now, id).run();

  const row = await getPreset(env, id);
  return json({ preset: rowToPreset(row) });
}

export async function onRequestDelete({ env, params }) {
  const id = params.id;
  const result = await env.DB.prepare(
    "DELETE FROM presets WHERE id = ?"
  ).bind(id).run();

  if (!result.meta.changes) {
    return json({ error: "Preset not found" }, 404);
  }

  return json({ ok: true });
}
