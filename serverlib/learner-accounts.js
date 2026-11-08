/* SpeedyLearning learner logins: a username and a 4-digit PIN. No email, no real names needed.
 *
 * Each learner account is one SQLite-backed Durable Object, kept in Cloudflare's EU jurisdiction.
 * It holds: the username, buddy and school year; a salted PBKDF2 hash of the PIN (never the PIN);
 * a SHA-256 hash of the grown-ups' recovery code; hashed session tokens; and learning progress.
 * Wrong PINs lock the account for longer each time. Accounts nobody logs in to for a year are deleted.
 */
import { DurableObject } from "cloudflare:workers";

const DAY = 24 * 60 * 60 * 1000;
const RETAIN = 365 * DAY;            // delete accounts nobody has used for a year
const SESSION_IDLE = 180 * DAY;      // a device stays logged in for 6 months of inactivity
const MAX_SESSIONS = 12;
const PIN_ITER = 20000;
const FAILS_BEFORE_LOCK = 5;

// Progress kept for each learner, and how two devices' copies are combined
export const PROGRESS_KEYS = {
  "speedy-log": "add", "speedy-done": "add",               // lists of timed events: keep both devices' entries
  "speedy-days": "union", "speedy-books": "union",           // lists of names/dates: keep every one
  "speedy-miss": "set", "speedy-year": "set", "speedy-srs": "set", "speedy-mission": "set", "speedy-tt": "set",
  "speedy-island-journey-v1": "set", "speedylearning-adventure-v1": "set", "quests": "set"
};
const CAPS = { "speedy-log": 4000, "speedy-done": 300, "speedy-days": 400, "speedy-books": 2000 };
const MAX_VALUE = 1_500_000;

export const USERNAME_RE = /^[A-Za-z0-9]{3,16}$/;
const RESERVED = new Set(["me", "guest", "admin", "speedy", "speedylearning", "teacher", "parent", "test"]);
export function usernameProblem(name) {
  if (typeof name !== "string" || !USERNAME_RE.test(name)) return "username";
  if (RESERVED.has(name.toLowerCase())) return "reserved";
  return "";
}
export function pinProblem(pin) {
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) return "pin";
  if (/^(\d)\1{3}$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin) ||
      ["1212", "2580", "0852", "1122", "1004", "2000", "2468", "1357", "6969"].includes(pin)) return "easy-pin";
  return "";
}

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const randomBytes = n => crypto.getRandomValues(new Uint8Array(n));
async function sha256(text) { return b64url(await crypto.subtle.digest("SHA-256", enc.encode(text))); }
async function pinHash(pin, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  return b64url(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: PIN_ITER }, key, 256));
}
function sameText(a, b) { // constant-time comparison
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newRecoveryCode() {
  const b = randomBytes(12); let s = "";
  for (let i = 0; i < 12; i++) s += CODE_CHARS[b[i] % CODE_CHARS.length] + (i === 3 || i === 7 ? "-" : "");
  return s;
}
export const normaliseCode = code => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
const lockFor = fails => fails < FAILS_BEFORE_LOCK ? 0 : Math.min(24 * 60, 15 * 2 ** (Math.floor(fails / FAILS_BEFORE_LOCK) - 1)) * 60000;

function itemId(key, x) { return key === "speedy-done" ? `${x.t}|${x.what || ""}` : `${x.t}|${x.q || ""}`; }
function mergeAdd(key, oldText, incoming) {
  let old = []; try { old = JSON.parse(oldText || "[]"); } catch (e) {}
  if (!Array.isArray(old)) old = [];
  const seen = new Set(old.map(x => itemId(key, x)));
  let added = 0;
  for (const x of incoming) {
    if (!x || typeof x !== "object" || Array.isArray(x) || !Number.isFinite(x.t)) continue;
    const { _s, ...item } = x;
    if (JSON.stringify(item).length > 4000) continue;
    const id = itemId(key, item);
    if (seen.has(id)) continue;
    seen.add(id); old.push(item); added++;
  }
  if (!added) return null;
  old.sort((a, b) => a.t - b.t);
  if (old.length > CAPS[key]) old = old.slice(-CAPS[key]);
  let text = JSON.stringify(old);
  while (text.length > MAX_VALUE && old.length > 10) { old = old.slice(Math.ceil(old.length / 10)); text = JSON.stringify(old); }
  return text;
}
function mergeUnion(key, oldText, incoming) {
  let old = []; try { old = JSON.parse(oldText || "[]"); } catch (e) {}
  if (!Array.isArray(old)) old = [];
  const set = new Set(old), before = set.size;
  for (const x of incoming) if (typeof x === "string" && x.length <= 300) set.add(x);
  if (set.size === before) return null;
  let out = [...set];
  if (key === "speedy-days") out.sort();
  if (out.length > CAPS[key]) out = out.slice(-CAPS[key]);
  return JSON.stringify(out);
}

export class LearnerAccount extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
  }
  // Tables are only created when an account is made, so looking up a username never stores anything
  hasTables() { return Number(this.sql.exec("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'account'").one().n) > 0; }
  createTables() {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS account (
      id INTEGER PRIMARY KEY CHECK (id = 1), username TEXT NOT NULL, buddy TEXT NOT NULL, year TEXT NOT NULL,
      pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL, code_salt TEXT NOT NULL, code_hash TEXT NOT NULL,
      fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
      created INTEGER NOT NULL, active INTEGER NOT NULL, rev INTEGER NOT NULL DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, created INTEGER NOT NULL, seen INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS progress (k TEXT PRIMARY KEY, v TEXT NOT NULL, rev INTEGER NOT NULL)`);
  }

  account() { return this.hasTables() ? this.sql.exec("SELECT * FROM account WHERE id = 1").toArray()[0] || null : null; }
  profile(a) { return { username: a.username, buddy: a.buddy, year: a.year, created: a.created }; }
  async touch() {
    const now = Date.now();
    this.sql.exec("UPDATE account SET active = ? WHERE id = 1", now);
    await this.ctx.storage.setAlarm(now + RETAIN);
  }
  async newSession() {
    const secret = b64url(randomBytes(24)), now = Date.now();
    this.sql.exec("DELETE FROM sessions WHERE seen < ?", now - SESSION_IDLE);
    this.sql.exec("INSERT INTO sessions (hash, created, seen) VALUES (?, ?, ?)", await sha256(secret), now, now);
    const extra = this.sql.exec("SELECT hash FROM sessions ORDER BY seen DESC LIMIT -1 OFFSET ?", MAX_SESSIONS).toArray();
    for (const row of extra) this.sql.exec("DELETE FROM sessions WHERE hash = ?", row.hash);
    return secret;
  }
  async checkSession(secret) {
    if (typeof secret !== "string" || secret.length < 20 || secret.length > 64) return false;
    const h = await sha256(secret), now = Date.now();
    const row = this.sql.exec("SELECT seen FROM sessions WHERE hash = ?", h).toArray()[0];
    if (!row || row.seen < now - SESSION_IDLE) return false;
    if (row.seen < now - 60 * 60 * 1000) this.sql.exec("UPDATE sessions SET seen = ? WHERE hash = ?", now, h);
    return true;
  }
  // Counts a PIN (or recovery code) attempt against the lock. Returns null when it may go ahead.
  locked(a) {
    const now = Date.now();
    return a.locked_until > now ? { error: "locked", waitMinutes: Math.ceil((a.locked_until - now) / 60000) } : null;
  }
  failed(a) {
    const fails = a.fails + 1, wait = lockFor(fails) && fails % FAILS_BEFORE_LOCK === 0 ? lockFor(fails) : 0;
    this.sql.exec("UPDATE account SET fails = ?, locked_until = ? WHERE id = 1", fails, wait ? Date.now() + wait : a.locked_until);
    return wait ? { error: "locked", waitMinutes: Math.ceil(wait / 60000) } : { error: "wrong-pin", triesLeft: FAILS_BEFORE_LOCK - (fails % FAILS_BEFORE_LOCK) };
  }
  async pinMatches(a, pin) { return typeof pin === "string" && sameText(await pinHash(pin, a.pin_salt), a.pin_hash); }
  progressSince(since) {
    const out = {};
    for (const row of this.sql.exec("SELECT k, v FROM progress WHERE rev > ?", Number(since) || 0).toArray()) out[row.k] = row.v;
    return out;
  }

  async exists() { return !!this.account(); }

  async signup({ username, pin, buddy, year }) {
    if (this.account()) return { error: "taken" };
    this.createTables();
    const now = Date.now(), pinSalt = b64url(randomBytes(16)), codeSalt = b64url(randomBytes(16)), code = newRecoveryCode();
    this.sql.exec(`INSERT INTO account (id, username, buddy, year, pin_salt, pin_hash, code_salt, code_hash, created, active)
                   VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      username, buddy, year, pinSalt, await pinHash(pin, pinSalt), codeSalt, await sha256(codeSalt + normaliseCode(code)), now, now);
    await this.ctx.storage.setAlarm(now + RETAIN);
    const a = this.account();
    return { secret: await this.newSession(), recoveryCode: code, profile: this.profile(a), progress: {}, rev: 0 };
  }

  async login({ pin }) {
    const a = this.account();
    if (!a) return { error: "no-account" };
    const lock = this.locked(a); if (lock) return lock;
    if (!(await this.pinMatches(a, pin))) return this.failed(a);
    this.sql.exec("UPDATE account SET fails = 0, locked_until = 0 WHERE id = 1");
    await this.touch();
    return { secret: await this.newSession(), profile: this.profile(a), progress: this.progressSince(0), rev: a.rev };
  }

  async recover({ code, newPin }) {
    const a = this.account();
    if (!a) return { error: "no-account" };
    // The recovery code works even while wrong PINs have locked the account (it is far too long to guess)
    if (!sameText(await sha256(a.code_salt + normaliseCode(code)), a.code_hash)) { const r = this.failed(a); return r.error === "wrong-pin" ? { ...r, error: "wrong-code" } : r; }
    const salt = b64url(randomBytes(16));
    this.sql.exec("UPDATE account SET pin_salt = ?, pin_hash = ?, fails = 0, locked_until = 0 WHERE id = 1", salt, await pinHash(newPin, salt));
    this.sql.exec("DELETE FROM sessions"); // a lost device can no longer get in
    await this.touch();
    return { secret: await this.newSession(), profile: this.profile(a), progress: this.progressSince(0), rev: a.rev };
  }

  async me({ secret, since }) {
    const a = this.account();
    if (!a || !(await this.checkSession(secret))) return { error: "signed-out" };
    if (a.active < Date.now() - DAY) await this.touch();
    return { profile: this.profile(a), progress: this.progressSince(since), rev: a.rev };
  }

  async sync({ secret, baseRev, changes }) {
    const a = this.account();
    if (!a || !(await this.checkSession(secret))) return { error: "signed-out" };
    let rev = a.rev;
    const behind = (Number(baseRev) || 0) < a.rev, written = [];
    this.ctx.storage.transactionSync(() => {
      for (const [k, raw] of Object.entries(changes || {})) {
        const kind = PROGRESS_KEYS[k];
        if (!kind || typeof raw !== "string" || raw.length > MAX_VALUE) continue;
        const old = this.sql.exec("SELECT v FROM progress WHERE k = ?", k).toArray()[0];
        let next = null;
        if (kind === "set") next = old && old.v === raw ? null : raw;
        else {
          let items; try { items = JSON.parse(raw); } catch (e) { continue; }
          if (!Array.isArray(items)) continue;
          next = kind === "add" ? mergeAdd(k, old && old.v, items) : mergeUnion(k, old && old.v, items);
        }
        if (next === null) continue;
        rev++;
        this.sql.exec("INSERT INTO progress (k, v, rev) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, rev = excluded.rev", k, next, rev);
        written.push(k);
      }
      if (rev !== a.rev) this.sql.exec("UPDATE account SET rev = ? WHERE id = 1", rev);
    });
    if (a.active < Date.now() - DAY) await this.touch();
    return { rev, behind, written };
  }

  async updateProfile({ secret, buddy, year }) {
    const a = this.account();
    if (!a || !(await this.checkSession(secret))) return { error: "signed-out" };
    this.sql.exec("UPDATE account SET buddy = ?, year = ? WHERE id = 1", buddy || a.buddy, year || a.year);
    return { profile: this.profile(this.account()) };
  }

  async changePin({ secret, pin, newPin }) {
    const a = this.account();
    if (!a || !(await this.checkSession(secret))) return { error: "signed-out" };
    const lock = this.locked(a); if (lock) return lock;
    if (!(await this.pinMatches(a, pin))) return this.failed(a);
    const salt = b64url(randomBytes(16));
    this.sql.exec("UPDATE account SET pin_salt = ?, pin_hash = ?, fails = 0, locked_until = 0 WHERE id = 1", salt, await pinHash(newPin, salt));
    return { ok: true };
  }

  async logout({ secret }) {
    if (typeof secret === "string") this.sql.exec("DELETE FROM sessions WHERE hash = ?", await sha256(secret));
    return { ok: true };
  }

  async resetProgress({ secret }) {
    const a = this.account();
    if (!a || !(await this.checkSession(secret))) return { error: "signed-out" };
    this.sql.exec("DELETE FROM progress");
    this.sql.exec("UPDATE account SET rev = ? WHERE id = 1", a.rev + 1);
    return { ok: true, rev: a.rev + 1 };
  }

  async remove({ secret, pin }) {
    const a = this.account();
    if (!a || !(await this.checkSession(secret))) return { error: "signed-out" };
    const lock = this.locked(a); if (lock) return lock;
    if (!(await this.pinMatches(a, pin))) return this.failed(a);
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    return { ok: true };
  }

  // One entry point for the Worker. Large bodies are parsed and serialised here, inside the Durable Object,
  // so the Worker itself only passes text through (the free plan gives Workers 10 ms of CPU per request).
  async rpc(action, args = {}) {
    let result;
    if (action === "sync") {
      let body = null; try { body = JSON.parse(args.text || ""); } catch (e) {}
      result = body && body.changes && typeof body.changes === "object" && !Array.isArray(body.changes)
        ? await this.sync({ secret: args.secret, baseRev: body.baseRev, changes: body.changes }) : { error: "bad-request" };
    } else if (RPC_ACTIONS.includes(action)) result = await this[action](args);
    else result = { error: "bad-request" };
    if (result && result.secret) { const { secret, ...rest } = result; result = { ...rest, token: `${rest.profile.username.toLowerCase()}.${secret}` }; }
    return { status: result && result.error ? STATUS[result.error] || 400 : 200, body: JSON.stringify(result) };
  }

  async alarm() {
    const a = this.account();
    if (!a) { await this.ctx.storage.deleteAll(); return; }
    if (a.active < Date.now() - RETAIN + DAY) { await this.ctx.storage.deleteAll(); return; }
    await this.ctx.storage.setAlarm(a.active + RETAIN);
  }
}

/* ---------- HTTP routes: /api/learner/* ---------- */
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
const BUDDIES = ["dash", "sum", "story", "scribble", "scout", "spark"];
const YEARS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const RPC_ACTIONS = ["signup", "login", "recover", "me", "updateProfile", "changePin", "logout", "resetProgress", "remove"];
const STATUS = { "taken": 409, "username": 400, "reserved": 400, "pin": 400, "easy-pin": 400, "no-account": 404, "wrong-pin": 401, "wrong-code": 401, "locked": 429, "signed-out": 401, "busy": 429, "bad-request": 400 };

function accountStub(env, username) {
  const ns = typeof env.LEARNERS.jurisdiction === "function" ? env.LEARNERS.jurisdiction("eu") : env.LEARNERS;
  return ns.getByName("learner:" + username.toLowerCase());
}
function parseToken(request) {
  const m = /^Bearer\s+([A-Za-z0-9]{3,16})\.([A-Za-z0-9_-]{20,64})$/.exec(request.headers.get("Authorization") || "");
  return m ? { username: m[1], secret: m[2] } : null;
}
async function readJSON(request, max = 2_600_000) {
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > max) return null;
  const text = await request.text();
  if (text.length > max) return null;
  try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch (e) { return null; }
}
async function tooBusy(env, request, bucket) {
  // The network address is only used for this moment's count, never saved.
  if (!env.LOGIN_LIMITER || typeof env.LOGIN_LIMITER.limit !== "function") return false;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  try { const { success } = await env.LOGIN_LIMITER.limit({ key: bucket + ":" + ip }); return !success; } catch (e) { return false; }
}
const answer = result => reply(result, result && result.error ? STATUS[result.error] || 400 : 200);
const pass = r => new Response(r.body, { status: r.status, headers: JSON_HEADERS });

export async function handleLearnerApi(request, env, path, sameOrigin) {
  if (!env.LEARNERS) return reply({ error: "unavailable" }, 503);
  const action = path.slice("/api/learner/".length);
  const method = action === "me" ? "GET" : "POST";
  if (request.method !== method) return reply({ error: "method" }, 405);
  if (method === "POST" && !sameOrigin(request)) return reply({ error: "cross-origin" }, 403);
  try {
    if (["check", "signup", "login", "recover"].includes(action)) {
      if (await tooBusy(env, request, action === "check" ? "check" : "login")) return answer({ error: "busy" });
      const body = await readJSON(request, 4000);
      if (!body) return answer({ error: "bad-request" });
      const username = typeof body.username === "string" ? body.username.normalize("NFKC").trim() : "";
      if (USERNAME_RE.test(username) === false) return answer({ error: "username" });
      const stub = accountStub(env, username);
      if (action === "check") {
        const problem = usernameProblem(username);
        return reply({ free: problem ? false : !(await stub.exists()), problem: problem || undefined });
      }
      if (action === "signup") {
        const problem = usernameProblem(username) || pinProblem(body.pin);
        if (problem) return answer({ error: problem });
        const buddy = BUDDIES.includes(body.buddy) ? body.buddy : "dash", year = YEARS.includes(body.year) ? body.year : "";
        return pass(await stub.rpc("signup", { username, pin: body.pin, buddy, year }));
      }
      if (action === "login") {
        if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) return answer({ error: "pin" });
        return pass(await stub.rpc("login", { pin: body.pin }));
      }
      const problem = pinProblem(body.newPin);
      if (problem) return answer({ error: problem });
      return pass(await stub.rpc("recover", { code: String(body.code || "").slice(0, 40), newPin: body.newPin }));
    }

    const token = parseToken(request);
    if (!token) return answer({ error: "signed-out" });
    const stub = accountStub(env, token.username), secret = token.secret;
    if (action === "me") {
      const since = Number(new URL(request.url).searchParams.get("since")) || 0;
      return pass(await stub.rpc("me", { secret, since }));
    }
    if (action === "sync") {
      const len = Number(request.headers.get("Content-Length") || 0);
      if (len > 2_600_000) return answer({ error: "bad-request" });
      const text = await request.text();
      if (text.length > 2_600_000) return answer({ error: "bad-request" });
      return pass(await stub.rpc("sync", { secret, text }));
    }
    const body = await readJSON(request, 4000);
    if (!body) return answer({ error: "bad-request" });
    if (action === "profile") return pass(await stub.rpc("updateProfile", { secret, buddy: BUDDIES.includes(body.buddy) ? body.buddy : "", year: YEARS.includes(body.year) ? body.year : "" }));
    if (action === "pin") {
      if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) return answer({ error: "pin" });
      const problem = pinProblem(body.newPin);
      if (problem) return answer({ error: problem });
      return pass(await stub.rpc("changePin", { secret, pin: body.pin, newPin: body.newPin }));
    }
    if (action === "logout") return pass(await stub.rpc("logout", { secret }));
    if (action === "reset") return pass(await stub.rpc("resetProgress", { secret }));
    if (action === "delete") {
      if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) return answer({ error: "pin" });
      return pass(await stub.rpc("remove", { secret, pin: body.pin }));
    }
    return reply({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Learner account error", error && error.message);
    return reply({ error: "unavailable" }, 503);
  }
}
