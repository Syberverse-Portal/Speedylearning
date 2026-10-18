/* SpeedyLearning Cloudflare Worker: anonymous visits with automatic SQLite
 * Durable Object storage (provisioned at deploy time via wrangler.jsonc).
 * No IP addresses, cookies, browser fingerprints, or children's answers saved.
 * An existing D1 binding remains supported as a backwards-compatible fallback.
 */
import { DurableObject } from "cloudflare:workers";

const DAY = 24 * 60 * 60 * 1000;
const KEEP = 30 * DAY;
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};
const reply = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });

function sameOrigin(request) {
  const { origin } = new URL(request.url);
  const requestOrigin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  return (!requestOrigin || requestOrigin === origin) &&
    (!site || site === "same-origin" || site === "none");
}

/* Exactly one DO instance (keyed by a fixed server-side name) stores
   visit timestamps and lifetime aggregate counters, never user identities. */
export class VisitCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visited_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_visits_visited_at
        ON visits (visited_at);
      CREATE TABLE IF NOT EXISTS counters (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO counters (key, value) VALUES ('total', 0);
      INSERT OR IGNORE INTO counters (key, value) VALUES ('started_at', 0);
    `);
  }

  async recordVisit() {
    const now = Date.now();
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("INSERT INTO visits (visited_at) VALUES (?)", now);
      this.sql.exec("UPDATE counters SET value = value + 1 WHERE key = 'total'");
      this.sql.exec(
        "UPDATE counters SET value = ? WHERE key = 'started_at' AND value = 0",
        now
      );
    });
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(now + DAY);
    }
    return true;
  }

  async getSummary() {
    const now = Date.now();
    const sql = this.sql;
    const count = (windowMs) => Number(sql.exec(
      "SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?",
      now - windowMs
    ).one().n);
    const total = Number(sql.exec(
      "SELECT value FROM counters WHERE key = 'total'"
    ).one().value);
    const trackingSince = Number(sql.exec(
      "SELECT value FROM counters WHERE key = 'started_at'"
    ).one().value) || null;
    const recent = sql.exec(
      "SELECT visited_at FROM visits WHERE visited_at >= ? ORDER BY id DESC LIMIT 35",
      now - KEEP
    ).toArray().map(row => ({ time: Number(row.visited_at) }));
    const hourCounts = sql.exec(
      `SELECT CAST(visited_at / 3600000 AS INTEGER) AS hour,
              COUNT(*) AS n
         FROM visits
        WHERE visited_at >= ?
        GROUP BY hour`,
      now - DAY
    ).toArray();
    const byHour = new Map(hourCounts.map(row =>
      [Number(row.hour), Number(row.n)]));
    const hourNow = Math.floor(now / 3600000);
    return {
      total,
      lastHour: count(60 * 60 * 1000),
      last24Hours: count(DAY),
      last7Days: count(7 * DAY),
      recent,
      hourly: Array.from({ length: 24 }, (_, i) => {
        const hour = hourNow - 23 + i;
        return { time: hour * 3600000, visits: byHour.get(hour) || 0 };
      }),
      trackingSince,
      eventRetentionDays: 30,
      updatedAt: now
    };
  }

  async alarm() {
    this.sql.exec("DELETE FROM visits WHERE visited_at < ?", Date.now() - KEEP);
    await this.ctx.storage.setAlarm(Date.now() + DAY);
  }
}

function visitStore(env) {
  // DO is provisioned automatically with the Worker. Only use D1 if
  // deployment configuration does not yet include this binding.
  return env.VISIT_COUNTER
    ? { type: "durable-object", stub: env.VISIT_COUNTER.getByName("speedylearning-visit-counter-v1") }
    : env.DB ? { type: "d1" } : null;
}

async function d1Summary(env) {
  const now = Date.now();
  const result = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS n FROM visits"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?").bind(now - 60 * 60 * 1000),
    env.DB.prepare("SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?").bind(now - DAY),
    env.DB.prepare("SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?").bind(now - 7 * DAY),
    env.DB.prepare("SELECT visited_at FROM visits ORDER BY id DESC LIMIT 35"),
    env.DB.prepare("SELECT CAST(visited_at / 3600000 AS INTEGER) AS hour, COUNT(*) AS n FROM visits WHERE visited_at >= ? GROUP BY hour").bind(now - DAY)
  ]);
  const count = i => Number(result[i]?.results?.[0]?.n || 0);
  const currentHour = Math.floor(now / 3600000);
  const hourly = new Map((result[5]?.results || []).map(x =>
    [Number(x.hour), Number(x.n)]));
  return {
    total: count(0),
    lastHour: count(1),
    last24Hours: count(2),
    last7Days: count(3),
    recent: (result[4]?.results || []).map(x => ({ time: Number(x.visited_at) })),
    hourly: Array.from({ length: 24 }, (_, i) => {
      const hour = currentHour - 23 + i;
      return { time: hour * 3600000, visits: hourly.get(hour) || 0 };
    }),
    updatedAt: now
  };
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    // Never serve backend source code as static pages.
    if (path.startsWith("/functions/") || path.startsWith("/serverlib/") ||
        path === "/schema.sql" || path === "/_worker.js" ||
        path === "/wrangler.jsonc" || path.startsWith("/scripts/")) {
      return reply({ error: "Not found" }, 404);
    }

    if (path === "/api/worker-health") {
      return reply({
        worker: true,
        databaseConfigured: Boolean(env.VISIT_COUNTER || env.DB),
        visitStorage: env.VISIT_COUNTER ? "durable-object" : env.DB ? "d1" : "missing",
        pushConfigured: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)
      });
    }

    if (path === "/api/visit") {
      if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
      if (!sameOrigin(request)) return reply({ error: "Cross-origin request denied" }, 403);
      const store = visitStore(env);
      if (!store) return reply({ error: "Visit storage is unavailable" }, 503);
      try {
        if (store.type === "durable-object") {
          await store.stub.recordVisit();
        } else {
          await env.DB.prepare("INSERT INTO visits (visited_at) VALUES (?)")
            .bind(Date.now()).run();
          if (Math.random() < 0.02) {
            ctx.waitUntil(env.DB.prepare(
              "DELETE FROM visits WHERE visited_at < ?"
            ).bind(Date.now() - KEEP).run().catch(() => {}));
          }
        }
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "no-store" }
        });
      } catch (error) {
        console.error("Anonymous visit storage error", error);
        return reply({ error: "Visit storage could not write" }, 503);
      }
    }

    if (path === "/api/public-visit-summary") {
      if (request.method !== "GET") return reply({ error: "Method not allowed" }, 405);
      const store = visitStore(env);
      if (!store) return reply({ error: "Visit storage is unavailable" }, 503);
      try {
        return reply(store.type === "durable-object"
          ? await store.stub.getSummary()
          : await d1Summary(env));
      } catch (error) {
        console.error("Visitor summary error", error);
        return reply({ error: "Visitor statistics are temporarily unavailable" }, 503);
      }
    }

    // Don't open admin actions to the public to get notifications working.
    if (path.startsWith("/api/admin/")) {
      return reply({ error: "Admin API requires authenticated deployment" }, 503);
    }
    if (path.startsWith("/api/")) return reply({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  }
};
