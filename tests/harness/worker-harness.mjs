/* Runs the real SpeedyLearning Worker (_worker.js) in Node for tests, with Durable Objects backed by
 * Node's built-in SQLite, a simple rate limiter, and the built static site (dist/) as ASSETS.
 * Usage: node tests/harness/worker-harness.mjs [port]   (default 8765)
 * Test-only endpoints: POST /__test/advance?days=N (moves the clock and runs due alarms), POST /__test/reset */
import { register } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
register("./cf-hooks.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dist = path.join(root, "dist");
const realNow = Date.now.bind(Date);
let offset = 0;
Date.now = () => realNow() + offset;

function makeSql(db) {
  const cursor = rows => ({ toArray: () => rows, one() { if (rows.length !== 1) throw new Error("Expected exactly one result from SQL query, but got " + rows.length); return rows[0]; }, [Symbol.iterator]: () => rows[Symbol.iterator]() });
  return {
    exec(query, ...bindings) {
      const q = query.trim();
      if (/^(SELECT|PRAGMA|WITH)\b/i.test(q) || /\bRETURNING\b/i.test(q)) return cursor(db.prepare(q).all(...bindings).map(r => ({ ...r })));
      if (!bindings.length) { db.exec(q); return cursor([]); }
      db.prepare(q).run(...bindings); return cursor([]);
    }
  };
}
class FakeState {
  constructor(name) { this.name = name; this.db = new DatabaseSync(":memory:"); this.alarmAt = null; this.id = { name, toString: () => name };
    const self = this;
    this.storage = {
      sql: makeSql(this.db),
      transactionSync(fn) { self.db.exec("BEGIN"); try { const r = fn(); self.db.exec("COMMIT"); return r; } catch (e) { self.db.exec("ROLLBACK"); throw e; } },
      async getAlarm() { return self.alarmAt; }, async setAlarm(t) { self.alarmAt = Number(t); }, async deleteAlarm() { self.alarmAt = null; },
      async deleteAll() { for (const r of self.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()) self.db.exec(`DROP TABLE IF EXISTS "${r.name}"`); },
      async get() { return undefined; }, async put() {}
    };
  }
  waitUntil() {}
  blockConcurrencyWhile(fn) { return fn(); }
}
const objects = new Map(); // "Class/jurisdiction/name" -> {state, instance, queue}
function namespace(Cls, env, label, jurisdiction = "") {
  const get = name => {
    const key = `${label}/${jurisdiction}/${name}`;
    if (!objects.has(key)) { const state = new FakeState(name); objects.set(key, { state, instance: new Cls(state, env), queue: Promise.resolve() }); }
    const o = objects.get(key);
    return new Proxy({}, { get(_, prop) {
      if (prop === "then") return undefined;
      return (...args) => {
        const run = o.queue.then(async () => structuredClone(await o.instance[prop](...structuredClone(args))));
        o.queue = run.catch(() => {});
        return run;
      };
    } });
  };
  return { getByName: get, idFromName: n => ({ name: n }), get: id => get(id.name), jurisdiction: j => namespace(Cls, env, label, j) };
}
async function runAlarms() {
  for (const o of objects.values()) if (o.state.alarmAt !== null && o.state.alarmAt <= Date.now()) { o.state.alarmAt = null; await o.instance.alarm(); }
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".xml": "application/xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp3": "audio/mpeg" };
const ASSETS = { async fetch(request) {
  let p = decodeURIComponent(new URL(request.url).pathname);
  let file = path.join(dist, p);
  if (!file.startsWith(dist)) return new Response("Not found", { status: 404 });
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  else if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" } });
} };
const hits = new Map();
const LOGIN_LIMITER = { async limit({ key }) {
  const now = Date.now(), limit = Number(process.env.HARNESS_RATE_LIMIT || 40);
  const list = (hits.get(key) || []).filter(t => t > now - 60000); list.push(now); hits.set(key, list);
  return { success: list.length <= limit };
} };

const worker = await import(path.join(root, "_worker.js"));
const env = { ASSETS, LOGIN_LIMITER };
env.VISIT_COUNTER = namespace(worker.VisitCounter, env, "VisitCounter");
env.LEARNERS = namespace(worker.LearnerAccount, env, "LearnerAccount");

const port = Number(process.argv[2] || process.env.PORT || 8765);
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1:" + port}`);
    if (url.pathname === "/__test/advance" && req.method === "POST") { offset += Number(url.searchParams.get("days") || 0) * 864e5; await runAlarms(); res.end("ok"); return; }
    if (url.pathname === "/__test/reset" && req.method === "POST") { objects.clear(); hits.clear(); offset = 0; res.end("ok"); return; }
    const chunks = []; for await (const c of req) chunks.push(c);
    const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    headers.set("CF-Connecting-IP", req.socket.remoteAddress || "127.0.0.1");
    const request = new Request(url, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const response = await worker.default.fetch(request, env, { waitUntil() {}, passThroughOnException() {} });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) { console.error(e); res.writeHead(500); res.end(String(e)); }
}).listen(port, "127.0.0.1", () => console.log(`SpeedyLearning test Worker on http://127.0.0.1:${port}`));
