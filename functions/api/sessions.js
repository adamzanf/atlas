// Atlas quiz-session counter — Cloudflare Pages Function + D1 (SQLite).
// Stores ONE number. No IPs, cookies, user agents or identifiers are read or stored.
const T = "CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL DEFAULT 0)";
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
let ready = false;
const init = async (db) => { if (!ready) { await db.prepare(T).run(); ready = true; } };

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "not_configured" }, 503);
  try {
    await init(env.DB);
    const r = await env.DB.prepare("SELECT total FROM counter WHERE id = 1").first();
    return json({ count: r ? r.total : 0 });
  } catch (e) { return json({ error: "unavailable" }, 503); }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "not_configured" }, 503);
  if (request.headers.get("x-atlas") !== "1") return json({ error: "bad_request" }, 400);
  const o = request.headers.get("origin");
  if (o && o !== new URL(request.url).origin) return json({ error: "forbidden" }, 403);
  try {
    await init(env.DB);
    // One SQL statement = one atomic increment, safe under simultaneous requests.
    const r = await env.DB.prepare("INSERT INTO counter (id, total) VALUES (1, 1) ON CONFLICT(id) DO UPDATE SET total = total + 1 RETURNING total").first();
    return json({ count: r.total });
  } catch (e) { return json({ error: "unavailable" }, 503); }
}

export const onRequest = () => json({ error: "method_not_allowed" }, 405);
