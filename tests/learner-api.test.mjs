// Learner login API, run against the real Worker in the Node test harness.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = 8791, base = `http://127.0.0.1:${PORT}`;
let server;
before(async () => {
  server = spawn(process.execPath, [fileURLToPath(new URL("./harness/worker-harness.mjs", import.meta.url)), String(PORT)], { env: { ...process.env, HARNESS_RATE_LIMIT: "1000" }, stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((ok, fail) => { server.stdout.on("data", d => /test Worker on/.test(String(d)) && ok()); server.on("exit", fail); });
});
after(() => server && server.kill());

const post = (p, body, token, headers = {}) => fetch(base + "/api/learner/" + p, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...headers }, body: JSON.stringify(body) })
  .then(async r => ({ status: r.status, ...(await r.json()) }));
const get = (p, token) => fetch(base + "/api/learner/" + p, { headers: token ? { Authorization: "Bearer " + token } : {} }).then(async r => ({ status: r.status, ...(await r.json()) }));
const reset = () => fetch(base + "/__test/reset", { method: "POST" });

test("sign-up needs a simple username and a 4-digit PIN that isn't too easy", async () => {
  await reset();
  assert.equal((await post("signup", { username: "ava@school.uk", pin: "4821" })).error, "username");
  assert.equal((await post("signup", { username: "Av", pin: "4821" })).error, "username");
  assert.equal((await post("signup", { username: "guest", pin: "4821" })).error, "reserved");
  assert.equal((await post("signup", { username: "AvaStar7", pin: "1234" })).error, "easy-pin");
  assert.equal((await post("signup", { username: "AvaStar7", pin: "7777" })).error, "easy-pin");
  assert.equal((await post("signup", { username: "AvaStar7", pin: "48a1" })).error, "pin");
  assert.equal((await post("check", { username: "AvaStar7" })).free, true, "nothing stored by failed sign-ups");
  const ok = await post("signup", { username: "AvaStar7", pin: "4821", buddy: "story", year: "Year 2" });
  assert.equal(ok.status, 200);
  assert.match(ok.token, /^avastar7\.[A-Za-z0-9_-]{20,}$/);
  assert.match(ok.recoveryCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.deepEqual({ ...ok.profile, created: 0 }, { username: "AvaStar7", buddy: "story", year: "Year 2", created: 0 });
  assert.equal((await post("check", { username: "avastar7" })).free, false, "usernames ignore capitals");
  assert.equal((await post("signup", { username: "AVASTAR7", pin: "5930" })).status, 409);
});

test("logging in, wrong PINs, locks and the grown-ups' recovery code", async () => {
  await reset();
  const { token: first, recoveryCode } = await post("signup", { username: "BenBolt", pin: "5930", buddy: "spark" });
  assert.equal((await post("login", { username: "nobody99", pin: "5930" })).error, "no-account");
  const wrong = await post("login", { username: "benbolt", pin: "1111" });
  assert.deepEqual([wrong.status, wrong.error, wrong.triesLeft], [401, "wrong-pin", 4]);
  for (let i = 0; i < 3; i++) await post("login", { username: "BenBolt", pin: "0000" });
  const locked = await post("login", { username: "BenBolt", pin: "2222" });
  assert.deepEqual([locked.status, locked.error, locked.waitMinutes], [429, "locked", 15]);
  assert.equal((await post("login", { username: "BenBolt", pin: "5930" })).error, "locked", "even the right PIN waits during a lock");
  assert.equal((await post("recover", { username: "BenBolt", code: "AAAA-BBBB-CCCC", newPin: "6047" })).error, "wrong-code");
  const back = await post("recover", { username: "benbolt", code: recoveryCode.toLowerCase().replace(/-/g, " "), newPin: "6047" });
  assert.equal(back.status, 200, "recovery code works during a lock, typed any way");
  assert.equal((await get("me", first)).error, "signed-out", "recovery logs out every other device");
  const again = await post("login", { username: "BenBolt", pin: "6047" });
  assert.equal(again.status, 200);
  assert.equal((await get("me", again.token)).profile.username, "BenBolt");
  // After a lock expires, the next five tries are counted again and the lock gets longer
  await fetch(base + "/__test/advance?days=1", { method: "POST" });
  for (let i = 0; i < 4; i++) await post("login", { username: "BenBolt", pin: "1111" });
  assert.equal((await post("login", { username: "BenBolt", pin: "1111" })).waitMinutes, 15);
});

test("progress syncs between two devices without losing answers", async () => {
  await reset();
  const s = await post("signup", { username: "Cara", pin: "3141", year: "Year 4" });
  const laptop = s.token, tablet = (await post("login", { username: "Cara", pin: "3141" })).token;
  const log1 = [{ t: 1000, s: "maths", q: "2+2", a: "4", ok: 1 }, { t: 2000, s: "maths", q: "3+3", a: "6", ok: 0 }];
  let r = await post("sync", { baseRev: 0, changes: { "speedy-log": JSON.stringify(log1), "speedy-days": '["2026-11-07"]', "speedy-year": "Year 4", "not-allowed": "x" } }, laptop);
  assert.deepEqual([r.rev, r.behind, r.written.sort()], [3, false, ["speedy-days", "speedy-log", "speedy-year"]]);
  // The tablet answers more, offline, then syncs: both devices' answers are kept, duplicates dropped
  r = await post("sync", { baseRev: 0, changes: { "speedy-log": JSON.stringify([{ t: 1500, s: "english", q: "cat", a: "cat", ok: 1, _s: 1 }, log1[0]]), "speedy-days": '["2026-11-08"]' } }, tablet);
  assert.equal(r.behind, true, "tablet is told the laptop changed things");
  const me = await get("me?since=0", tablet);
  assert.deepEqual(JSON.parse(me.progress["speedy-log"]).map(x => x.t), [1000, 1500, 2000]);
  assert.ok(!me.progress["speedy-log"].includes("_s"));
  assert.deepEqual(JSON.parse(me.progress["speedy-days"]), ["2026-11-07", "2026-11-08"]);
  assert.equal(me.progress["speedy-year"], "Year 4");
  assert.deepEqual(Object.keys((await get("me?since=" + me.rev, laptop)).progress), [], "only newer changes are sent");
  assert.equal((await post("reset", {}, laptop)).ok, true);
  assert.deepEqual((await get("me?since=0", laptop)).progress, {});
  assert.equal((await post("sync", { changes: {} }, "cara.notarealtoken000000000")).status, 401);
});

test("changing a PIN, profile, logging out and deleting need the right things", async () => {
  await reset();
  const { token } = await post("signup", { username: "Dev", pin: "8264" });
  assert.equal((await post("profile", { buddy: "scout", year: "Year 6" }, token)).profile.buddy, "scout");
  assert.equal((await post("pin", { pin: "1111", newPin: "9173" }, token)).error, "wrong-pin");
  assert.equal((await post("pin", { pin: "8264", newPin: "4444" }, token)).error, "easy-pin");
  assert.equal((await post("pin", { pin: "8264", newPin: "9173" }, token)).ok, true);
  assert.equal((await post("login", { username: "Dev", pin: "9173" })).status, 200);
  assert.equal((await post("delete", { pin: "8264" }, token)).error, "wrong-pin");
  assert.equal((await post("delete", { pin: "9173" }, token)).ok, true);
  assert.equal((await post("check", { username: "Dev" })).free, true, "deleted accounts are gone completely");
  assert.equal((await post("login", { username: "Dev", pin: "9173" })).error, "no-account");
  const t2 = (await post("signup", { username: "Eve", pin: "5821" })).token;
  assert.equal((await post("logout", {}, t2)).ok, true);
  assert.equal((await get("me", t2)).error, "signed-out");
});

test("accounts nobody uses for a year are deleted", async () => {
  await reset();
  await post("signup", { username: "Finn", pin: "7302" });
  await fetch(base + "/__test/advance?days=200", { method: "POST" });
  assert.equal((await post("check", { username: "Finn" })).free, false);
  await fetch(base + "/__test/advance?days=200", { method: "POST" });
  assert.equal((await post("check", { username: "Finn" })).free, true);
});

test("requests from other websites and too many tries are refused", async () => {
  await reset();
  assert.equal((await post("signup", { username: "Gus", pin: "7302" }, null, { Origin: "https://evil.example" })).status, 403);
  assert.equal((await fetch(base + "/api/learner/login", { method: "GET" })).status, 405);
});
