/* SpeedyLearning logins: each child has a username and a secret 4-number PIN. No email, no real name needed.
   Progress is kept in this browser as before and copied to the child's login, so they can carry on
   on any device. A grown-ups' recovery code (shown once, at sign-up) resets a forgotten PIN.
   On a shared device, each child types their PIN to switch to their own progress. */
(() => {
  "use strict";
  const PLAYERS = "speedy-players", CURRENT = "speedy-player", META = "speedy-profile-meta", WELCOME = "speedy-profiles-welcome";
  const JOURNEY = "speedy-island-journey-v1", ADVENTURE = "speedylearning-adventure-v1", QUESTS = "speedy-quest-atlas-v3";
  // Everything saved per child uses "<prefix>|<name>". Renaming or removing a learner moves or clears these.
  const PER_CHILD = ["speedy-log", "speedy-miss", "speedy-days", "speedy-done", "speedy-books", "speedy-year", "speedy-srs", "speedy-mission", "speedy-tt", JOURNEY, ADVENTURE];
  const AUX = ["speedy-session", "speedy-pin", "speedy-sync"]; // login details on this device
  // How each kind of progress is combined between devices (matches serverlib/learner-accounts.js)
  const SYNC_ADD = { "speedy-log": 4000, "speedy-done": 300 };
  const SYNC_UNION = ["speedy-days", "speedy-books"];
  const SYNC_SET = ["speedy-miss", "speedy-year", "speedy-srs", "speedy-mission", "speedy-tt", JOURNEY, ADVENTURE, "quests"];
  const BUDDIES = [["dash", "Dash"], ["sum", "Sum"], ["story", "Story"], ["scribble", "Scribble"], ["scout", "Scout"], ["spark", "Spark"]];
  const BUDDY_IDS = BUDDIES.map(b => b[0]);
  const YEARS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
  const DEFAULT = "Me";
  const USERNAME_RE = /^[A-Za-z0-9]{3,16}$/;

  // ---------- storage (falls back to memory when the browser blocks storage) ----------
  const mem = new Map();
  const canStore = (() => { try { localStorage.setItem("speedy-test", "1"); localStorage.removeItem("speedy-test"); return true; } catch (e) { return false; } })();
  const ls = {
    get(k) { if (canStore) { try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} } return mem.has(k) ? mem.get(k) : null; },
    set(k, v) { mem.set(k, String(v)); if (canStore) { try { localStorage.setItem(k, String(v)); } catch (e) {} } },
    del(k) { mem.delete(k); if (canStore) { try { localStorage.removeItem(k); } catch (e) {} } }
  };
  const readJSON = (k, d) => { try { const v = JSON.parse(ls.get(k)); return v ?? d; } catch (e) { return d; } };
  const writeJSON = (k, v) => ls.set(k, JSON.stringify(v));

  // ---------- learners on this device ----------
  function list() {
    const p = readJSON(PLAYERS, null);
    const names = Array.isArray(p) ? p.filter(x => typeof x === "string" && x.trim()) : [];
    return names.length ? [...new Set(names)] : [DEFAULT];
  }
  function meta() { const m = readJSON(META, {}); return m && typeof m === "object" && !Array.isArray(m) ? m : {}; }
  function current() { const names = list(), c = ls.get(CURRENT); return c && names.includes(c) ? c : names[0]; }
  const isAccount = name => !!(meta()[name] || {}).user;
  const token = name => ls.get("speedy-session|" + name);
  const learners = () => list().filter(n => n !== DEFAULT || meta()[n]);
  const hasAccounts = () => learners().some(isAccount);
  function isSetUp() { return Object.keys(meta()).length > 0; }
  function profile(name) {
    const m = meta()[name];
    return { name, buddy: m && BUDDY_IDS.includes(m.buddy) ? m.buddy : "dash", year: ls.get("speedy-year|" + name) || "", setUp: !!m, account: !!(m && m.user), needsLogin: !!(m && m.user && !token(name)) };
  }
  const buddyName = id => (BUDDIES.find(b => b[0] === id) || BUDDIES[0])[1];
  const face = id => "/assets/mascot-" + (BUDDY_IDS.includes(id) ? id : "dash") + ".svg";
  const answers = name => { const l = readJSON("speedy-log|" + name, []); return Array.isArray(l) ? l.length : 0; };
  function hasData(name) {
    const saved = PER_CHILD.some(p => { const v = ls.get(p + "|" + name); return v !== null && v !== "" && v !== "[]" && v !== "{}"; });
    // Island Journey progress from before profiles existed belongs to whoever opens it first
    return saved || (name === DEFAULT && !ls.get(JOURNEY + "-claimed") && !!ls.get(JOURNEY));
  }
  function uniqueName(base) { let n = base.slice(0, 20), i = 2; const taken = list().map(x => x.toLowerCase()); while (taken.includes(n.toLowerCase())) n = base.slice(0, 18) + " " + i++; return n; }

  // Moves (or with to = null, removes) everything saved for one child.
  function moveChild(from, to, { keepLogin = false } = {}) {
    if (from === to) return;
    for (const prefix of keepLogin ? PER_CHILD : [...PER_CHILD, ...AUX]) {
      const k = prefix + "|" + from, v = ls.get(k);
      if (v === null) continue;
      if (to) ls.set(prefix + "|" + to, v);
      ls.del(k);
    }
    for (const legacy of [JOURNEY, ADVENTURE]) {
      // Progress saved before profiles existed belongs to the default learner until someone claims it
      if (from === DEFAULT && !ls.get(legacy + "-claimed") && ls.get(legacy)) {
        if (to && ls.get(legacy + "|" + to) === null) ls.set(legacy + "|" + to, ls.get(legacy));
        ls.set(legacy + "-claimed", to || from);
      } else if (ls.get(legacy + "-claimed") === from && to) ls.set(legacy + "-claimed", to);
    }
    // Home Quest Atlas keeps every learner in one record keyed by [learner, nation, stage]
    const q = readJSON(QUESTS, null);
    if (q && typeof q === "object") {
      let changed = false;
      for (const key of Object.keys(q)) {
        let parts; try { parts = JSON.parse(key); } catch (e) { continue; }
        if (!Array.isArray(parts) || parts[0] !== from.slice(0, 35)) continue;
        if (to) q[JSON.stringify([to.slice(0, 35), ...parts.slice(1)])] = q[key];
        delete q[key]; changed = true;
      }
      if (changed) writeJSON(QUESTS, q);
    }
  }
  function renameLocal(from, to) {
    const m = meta(); if (m[from]) { m[to] = m[from]; delete m[from]; }
    moveChild(from, to);
    writeJSON(PLAYERS, list().map(n => (n === from ? to : n))); writeJSON(META, m);
    if (ls.get(CURRENT) === from) ls.set(CURRENT, to);
  }
  function removeLocal(name) {
    moveChild(name, null);
    const m = meta(); delete m[name];
    let names = list().filter(p => p !== name);
    if (!names.length) names = [DEFAULT];
    writeJSON(PLAYERS, names); writeJSON(META, m);
    if (!names.includes(ls.get(CURRENT))) ls.set(CURRENT, names.includes(DEFAULT) ? DEFAULT : names[0]);
  }

  // Reload so every part of the site (game, island journey, quests) picks up the new learner
  let reloadOnClose = false;
  function refresh(hash) {
    if (!canStore) { reloadOnClose = false; close(); mountChip(); return; }
    if (hash && location.pathname === "/") { try { history.replaceState(null, "", "/" + hash); } catch (e) {} }
    location.reload();
  }
  async function switchTo(name, hash) {
    if (!list().includes(name)) return;
    const was = current();
    if (was !== name && isAccount(was)) await push(was, { keepalive: true });
    ls.set(CURRENT, name);
    refresh(hash);
  }

  // ---------- talking to the SpeedyLearning server ----------
  async function api(action, body, tok, opts = {}) {
    const init = { method: body === undefined ? "GET" : "POST", headers: {}, cache: "no-store", credentials: "same-origin" };
    if (body !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
    if (opts.keepalive) init.keepalive = true;
    if (tok) init.headers.Authorization = "Bearer " + tok;
    let r; try { r = await fetch("/api/learner/" + action, init); } catch (e) { return { error: "offline" }; }
    let data; try { data = await r.json(); } catch (e) { data = {}; }
    if (!data || typeof data !== "object") data = {};
    if (!r.ok && !data.error) data.error = "unavailable";
    return data;
  }
  function say(r) {
    const e = r && r.error;
    if (e === "wrong-pin") return r.triesLeft > 1 ? `That PIN isn't right. You have ${r.triesLeft} more tries.` : r.triesLeft === 1 ? "That PIN isn't right. You have 1 more try before a short wait." : "That PIN isn't right.";
    if (e === "locked") return `Too many wrong tries. Please wait ${r.waitMinutes || 15} minutes, or ask a grown-up to use the recovery code.`;
    return ({
      "taken": "Someone already has that username. Try adding a number, or tap 💡 for an idea.",
      "username": "Use 3 to 16 letters or numbers, with no spaces.",
      "reserved": "That username can't be used. Please try another one.",
      "pin": "Your PIN needs 4 numbers.",
      "easy-pin": "That PIN is too easy to guess! Try 4 different numbers that aren't in order.",
      "no-account": "We can't find that username. Check the spelling, or make a new login.",
      "wrong-code": "That recovery code isn't right. Check the login card and try again.",
      "busy": "Lots of people are logging in right now. Wait a minute and try again.",
      "offline": "We can't reach SpeedyLearning. Check the internet and try again.",
      "signed-out": "Please log in again.",
      "unavailable": "Logins aren't working right now. Please try again later. You can still play!"
    })[e] || "Something went wrong. Please try again.";
  }
  const easyPin = pin => /^(\d)\1{3}$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin) || ["1212", "2580", "0852", "1122", "1004", "2000", "2468", "1357", "6969"].includes(pin);

  // A scrambled copy of the PIN on this device lets brothers and sisters switch learner without the internet
  const enc = new TextEncoder();
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  async function pinDigest(pin, salt) {
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
      return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 20000 }, key, 256));
    }
    return fnv(salt + ":" + pin);
  }
  async function savePinCheck(name, pin) {
    const salt = hex(crypto.getRandomValues(new Uint8Array(12)));
    writeJSON("speedy-pin|" + name, { s: salt, h: await pinDigest(pin, salt) });
  }
  async function pinOK(name, pin) { const c = readJSON("speedy-pin|" + name, null); return !!(c && c.s && c.h === await pinDigest(pin, c.s)); }

  // ---------- keeping progress the same on every device ----------
  function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ":" + s.length; }
  const idOf = (k, x) => k === "speedy-done" ? `${x.t}|${x.what || ""}` : `${x.t}|${x.q || ""}`;
  const syncRec = name => { const r = readJSON("speedy-sync|" + name, null); return { rev: Number(r && r.rev) || 0, h: r && r.h && typeof r.h === "object" ? r.h : {}, at: Number(r && r.at) || 0 }; };
  function readLocal(k, name) {
    if (k !== "quests") return ls.get(k + "|" + name);
    const q = readJSON(QUESTS, {}), mine = {}, n = name.slice(0, 35);
    for (const key of Object.keys(q || {}).sort()) { let parts; try { parts = JSON.parse(key); } catch (e) { continue; } if (Array.isArray(parts) && parts[0] === n) mine[JSON.stringify(parts.slice(1))] = q[key]; }
    return Object.keys(mine).length ? JSON.stringify(mine) : null;
  }
  function writeLocal(k, name, v) {
    if (k !== "quests") { ls.set(k + "|" + name, v); return; }
    let mine; try { mine = JSON.parse(v); } catch (e) { return; }
    const q = readJSON(QUESTS, {}) || {}, n = name.slice(0, 35);
    for (const key of Object.keys(q)) { try { const p = JSON.parse(key); if (Array.isArray(p) && p[0] === n) delete q[key]; } catch (e) {} }
    for (const [rest, val] of Object.entries(mine || {})) { try { q[JSON.stringify([n, ...JSON.parse(rest)])] = val; } catch (e) {} }
    writeJSON(QUESTS, q);
  }
  // Merges what the server sent into this device. Returns true if anything new arrived.
  function applyServer(name, progress, r) {
    let changed = false;
    for (const [k, v] of Object.entries(progress || {})) {
      if (typeof v !== "string") continue;
      if (SYNC_ADD[k]) {
        let server; try { server = JSON.parse(v); } catch (e) { continue; }
        if (!Array.isArray(server)) continue;
        const local = readJSON(k + "|" + name, []), arr = Array.isArray(local) ? local : [];
        const at = new Map(arr.map((x, i) => [idOf(k, x), i]));
        let touched = false;
        for (const x of server) {
          if (!x || typeof x !== "object") continue;
          const id = idOf(k, x);
          if (at.has(id)) { const y = arr[at.get(id)]; if (!y._s) { y._s = 1; touched = true; } }
          else { arr.push({ ...x, _s: 1 }); at.set(id, -1); touched = true; changed = true; }
        }
        if (touched) { arr.sort((a, b) => a.t - b.t); while (arr.length > SYNC_ADD[k]) arr.shift(); writeJSON(k + "|" + name, arr); }
      } else if (SYNC_UNION.includes(k)) {
        let server; try { server = JSON.parse(v); } catch (e) { continue; }
        if (!Array.isArray(server)) continue;
        const local = readJSON(k + "|" + name, []), arr = Array.isArray(local) ? local : [], set = new Set(arr);
        const extra = server.filter(x => typeof x === "string" && !set.has(x));
        if (extra.length) { let out = [...arr, ...extra]; if (k === "speedy-days") out.sort(); writeJSON(k + "|" + name, out); changed = true; }
        r.h[k] = fnv(v);
      } else if (SYNC_SET.includes(k)) {
        const local = readLocal(k, name);
        if (local === null || fnv(local) === r.h[k]) { if (local !== v) { writeLocal(k, name, v); changed = true; } r.h[k] = fnv(v); }
        // otherwise this device changed it too: this device's copy wins and is sent next
      }
    }
    return changed;
  }
  function signedOut(name) { ls.del("speedy-session|" + name); window.dispatchEvent(new Event("speedy-profile-updated")); }
  async function pull(name) {
    const tok = token(name); if (!tok) return { ok: false };
    const r = syncRec(name), res = await api("me?since=" + r.rev, undefined, tok);
    if (res.error) { if (res.error === "signed-out") signedOut(name); return { ok: false, error: res.error }; }
    const changed = applyServer(name, res.progress, r);
    r.rev = Number(res.rev) || r.rev; r.at = Date.now();
    writeJSON("speedy-sync|" + name, r);
    if (res.profile) { const m = meta(); if (m[name] && BUDDY_IDS.includes(res.profile.buddy) && m[name].buddy !== res.profile.buddy) { m[name].buddy = res.profile.buddy; writeJSON(META, m); window.dispatchEvent(new Event("speedy-profile-updated")); } }
    return { ok: true, changed };
  }
  let pushing = null;
  function push(name = current(), opts = {}) {
    if (!isAccount(name) || !token(name)) return Promise.resolve(false);
    if (pushing) return pushing;
    pushing = (async () => {
      const r = syncRec(name), changes = {};
      for (const k of Object.keys(SYNC_ADD)) {
        const arr = readJSON(k + "|" + name, null); if (!Array.isArray(arr)) continue;
        const fresh = arr.filter(x => x && typeof x === "object" && !x._s);
        if (fresh.length) changes[k] = JSON.stringify(fresh.map(({ _s, ...x }) => x));
      }
      for (const k of [...SYNC_UNION, ...SYNC_SET]) { const v = readLocal(k, name); if (v !== null && fnv(v) !== r.h[k]) changes[k] = v; }
      const keys = Object.keys(changes);
      if (!keys.length) return true;
      // Small requests: at most 500 answers or about 250 KB each
      const pieces = [];
      for (const k of keys) {
        if (SYNC_ADD[k]) { const items = JSON.parse(changes[k]); for (let i = 0; i < items.length; i += 500) pieces.push([k, JSON.stringify(items.slice(i, i + 500))]); }
        else pieces.push([k, changes[k]]);
      }
      const batches = []; let batch = {}, size = 0;
      for (const [k, v] of pieces) { if (size && (size + v.length > 250000 || k in batch)) { batches.push(batch); batch = {}; size = 0; } batch[k] = v; size += v.length; }
      batches.push(batch);
      let behind = false;
      for (const b of batches) {
        const body = { baseRev: r.rev, changes: b };
        const res = await api("sync", body, token(name), { keepalive: opts.keepalive && JSON.stringify(body).length < 60000 });
        if (res.error) { if (res.error === "signed-out") signedOut(name); return false; }
        for (const k of Object.keys(b)) {
          if (SYNC_ADD[k]) {
            // Only the answers in this request are marked as saved online
            const ids = new Set(JSON.parse(b[k]).map(x => idOf(k, x)));
            const arr = readJSON(k + "|" + name, []); let marked = false;
            for (const x of arr) if (x && !x._s && ids.has(idOf(k, x))) { x._s = 1; marked = true; }
            if (marked) writeJSON(k + "|" + name, arr);
          } else r.h[k] = fnv(b[k]);
        }
        if (res.behind) behind = true; else r.rev = Number(res.rev) || r.rev;
        r.at = Date.now();
        writeJSON("speedy-sync|" + name, r);
      }
      if (behind && !opts.keepalive) await pull(name);
      return true;
    })().finally(() => { pushing = null; });
    return pushing;
  }
  async function startSync() {
    const name = current();
    if (!isAccount(name) || !token(name)) return;
    const res = await pull(name);
    if (res.ok && res.changed) {
      // New progress arrived from another device: reload once so every part of the page shows it
      let last = 0; try { last = Number(sessionStorage.getItem("speedy-sync-reload")) || 0; } catch (e) {}
      if (Date.now() - last > 60000) { try { sessionStorage.setItem("speedy-sync-reload", String(Date.now())); } catch (e) {} location.reload(); return; }
    }
    await push(name);
    setInterval(() => { if (document.visibilityState === "visible") push(name); }, 20000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") push(name, { keepalive: true }); });
    window.addEventListener("pagehide", () => push(name, { keepalive: true }));
  }

  // Sets up (or refreshes) a logged-in learner on this device
  async function adoptAccount(res, pin, keepFrom) {
    const name = res.profile.username, user = name.toLowerCase();
    let m = meta();
    const existing = list().find(n => (m[n] || {}).user === user);
    if (existing && existing !== name) renameLocal(existing, name);
    m = meta();
    const clash = list().find(n => n !== keepFrom && n.toLowerCase() === user && (m[n] || {}).user !== user);
    if (clash) renameLocal(clash, uniqueName(clash + " (old)"));
    if (keepFrom && keepFrom !== name && list().includes(keepFrom)) { moveChild(keepFrom, name); const mm = meta(); delete mm[keepFrom]; writeJSON(META, mm); writeJSON(PLAYERS, list().map(n => (n === keepFrom ? name : n))); }
    let names = list();
    if (!names.includes(name)) names.push(name);
    if (names.includes(DEFAULT) && !meta()[DEFAULT] && !hasData(DEFAULT)) names = names.filter(n => n !== DEFAULT);
    m = meta();
    m[name] = { ...(m[name] || {}), buddy: res.profile.buddy, created: res.profile.created, user };
    writeJSON(PLAYERS, names); writeJSON(META, m);
    ls.set("speedy-session|" + name, res.token); ls.set(CURRENT, name); ls.set(WELCOME, "done");
    if (res.profile.year && !ls.get("speedy-year|" + name)) ls.set("speedy-year|" + name, res.profile.year);
    const r = existing || keepFrom ? syncRec(name) : { rev: 0, h: {}, at: 0 };
    applyServer(name, res.progress, r);
    r.rev = Number(res.rev) || 0; r.at = Date.now();
    writeJSON("speedy-sync|" + name, r);
    await savePinCheck(name, pin);
    return name;
  }
  async function resetProgress(name = current()) {
    if (isAccount(name) && token(name)) {
      const res = await api("reset", {}, token(name));
      if (res.error) return res;
      writeJSON("speedy-sync|" + name, { rev: res.rev, h: {}, at: Date.now() }); // everything left is sent again
    }
    for (const k of ["speedy-log", "speedy-days", "speedy-done", "speedy-books"]) ls.set(k + "|" + name, "[]");
    ls.set("speedy-miss|" + name, "{}");
    await push(name);
    return { ok: true };
  }

  // ---------- small DOM helpers ----------
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid);
    return n;
  };
  const img = (src, cls) => el("img", { src, alt: "", class: cls, width: "72", height: "72", decoding: "async" });
  const title = text => el("h2", { id: "spTitle", tabindex: "-1", text });
  const lead = text => el("p", { class: "sp-lead", text });
  const steps = (n, of) => el("p", { class: "sp-steps", "aria-label": `Step ${n} of ${of}` }, Array.from({ length: of }, (_, i) => el("i", { class: i < n ? "on" : "" })), el("span", { text: `Step ${n} of ${of}` }));
  const back = fn => el("button", { class: "sp-ghost", type: "button", text: "Back", onclick: fn });

  // ---------- dialog ----------
  let overlay, dialog, body, lastFocus = null, returnHash = "", activePad = null;
  function ensureDialog() {
    if (overlay) return;
    body = el("div", { class: "sp-body" });
    dialog = el("div", { class: "sp-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "spTitle" },
      el("button", { class: "sp-close", type: "button", "aria-label": "Close", text: "✕", onclick: close }), body);
    overlay = el("div", { class: "sp-overlay", hidden: true, onclick: e => { if (e.target === overlay) close(); } }, dialog);
    document.addEventListener("keydown", e => {
      if (overlay.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (activePad && activePad.node.isConnected && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (/^\d$/.test(e.key)) { e.preventDefault(); activePad.press(e.key); return; }
        if (e.key === "Backspace") { e.preventDefault(); activePad.del(); return; }
      }
      if (e.key !== "Tab") return;
      const f = [...dialog.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])")].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    document.body.append(overlay);
  }
  function open(view, opts = {}) {
    ensureDialog();
    if (overlay.hidden) lastFocus = document.activeElement;
    returnHash = opts.returnHash || "";
    overlay.hidden = false;
    document.documentElement.classList.add("sp-lock");
    show(view || "pick", opts);
  }
  function close() {
    if (!overlay || overlay.hidden) return;
    if (reloadOnClose) { refresh(returnHash); return; }
    overlay.hidden = true; activePad = null;
    document.documentElement.classList.remove("sp-lock");
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  const VIEWS = { pick: viewPick, login: viewLogin, signup: viewSignup, unlock: viewUnlock, manage: viewManage, learner: viewLearner, forgot: viewForgot, changepin: viewChangePin, done: viewDone, add: viewSignup };
  function show(view, opts = {}) {
    activePad = null;
    body.replaceChildren((VIEWS[view] || viewPick)(opts));
    dialog.scrollTop = 0;
    // On phones and tablets, don't pop the keyboard up straight away
    const fine = window.matchMedia && matchMedia("(pointer: fine)").matches;
    const first = (fine && body.querySelector("input[type=text]")) || body.querySelector(".sp-tile.is-on") || body.querySelector("#spTitle");
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  }

  // A big friendly number pad. onDone(pin) runs when 4 numbers are in; call pad.fail(message) to try again.
  function pinPad(onDone) {
    let digits = "", busy = false;
    const dots = el("div", { class: "sp-dots", role: "img", "aria-label": "0 of 4 numbers typed" }, [0, 1, 2, 3].map(() => el("i")));
    const msg = el("p", { class: "sp-error sp-pin-msg", role: "alert" });
    const draw = () => { dots.querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i < digits.length)); dots.setAttribute("aria-label", `${digits.length} of 4 numbers typed`); };
    const pad = {
      press(d) {
        if (busy || digits.length >= 4) return;
        digits += d; msg.textContent = ""; draw();
        if (digits.length === 4) { busy = true; node.classList.add("is-busy"); setTimeout(() => Promise.resolve(onDone(digits, pad)).catch(() => pad.fail(say({ error: "offline" }))), 140); }
      },
      del() { if (busy) return; digits = digits.slice(0, -1); draw(); },
      fail(text) { busy = false; digits = ""; draw(); node.classList.remove("is-busy"); msg.textContent = text || ""; dots.classList.remove("shake"); void dots.offsetWidth; dots.classList.add("shake"); },
      hold(text) { busy = true; msg.textContent = text || ""; },
      node: null
    };
    const key = (label, aria, fn, cls) => el("button", { type: "button", class: "sp-key" + (cls ? " " + cls : ""), "aria-label": aria, text: label, onclick: fn });
    const keys = el("div", { class: "sp-keys" },
      ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => key(d, d, () => pad.press(d))),
      key("Clear", "Clear", () => { if (!busy) { digits = ""; draw(); } }, "sp-key-small"), key("0", "0", () => pad.press("0")), key("⌫", "Delete last number", () => pad.del(), "sp-key-small"));
    const node = el("div", { class: "sp-pin" }, dots, msg, keys);
    pad.node = node; activePad = pad;
    return pad;
  }

  // ---------- views ----------
  function tile(name, opts) {
    const p = profile(name), on = name === current() && p.account && !p.needsLogin && !opts.manage;
    const label = opts.manage ? "✏️ Manage" : p.needsLogin ? "Log in again" : p.account ? (on ? "Playing now" : "🔒 Type your PIN") : "Needs a login";
    return el("button", { class: "sp-tile" + (on ? " is-on" : "") + (!p.account ? " is-local" : ""), type: "button", "aria-pressed": opts.manage ? false : String(on), onclick: () => opts.go(name, p) },
      el("span", { class: "sp-face" }, img(face(p.buddy))), el("b", { text: name }), el("small", { text: label }));
  }
  function viewPick() {
    const names = learners();
    const go = (name, p) => {
      if (!p.account) return show("signup", { keepFrom: name });
      if (p.needsLogin) return show("login", { username: name });
      if (name === current()) return close();
      show("unlock", { name });
    };
    return el("div", {},
      title(names.length ? "Who's learning today?" : "Let's get you logged in!"),
      lead(names.length ? "Tap your buddy and type your secret PIN." : "Each learner has a username and a secret 4-number PIN. No email needed."),
      el("div", { class: "sp-grid" }, names.map(n => tile(n, { go })),
        el("button", { class: "sp-tile sp-add", type: "button", onclick: () => show("login") }, el("span", { class: "sp-face sp-plus", "aria-hidden": "true", text: "🔑" }), el("b", { text: "Log in" }), el("small", { text: "I have a username" })),
        el("button", { class: "sp-tile sp-add", type: "button", onclick: () => show("signup") }, el("span", { class: "sp-face sp-plus", "aria-hidden": "true", text: "+" }), el("b", { text: "New learner" }), el("small", { text: "Make a login" }))),
      el("p", { class: "sp-safe" }, "🔒 No email needed. Progress is saved to your login, so you can carry on using any device."),
      !canStore ? el("p", { class: "sp-warn", text: "⚠️ This browser isn't saving information (for example a private window), so you'll need to log in again next time." }) : null,
      el("div", { class: "sp-foot" },
        current() !== DEFAULT ? el("button", { class: "sp-link", type: "button", text: "Play without logging in", onclick: () => { if (!list().includes(DEFAULT)) writeJSON(PLAYERS, [...list(), DEFAULT]); switchTo(DEFAULT, returnHash); } }) : null,
        names.length ? el("button", { class: "sp-link", type: "button", text: "Grown-ups: manage logins", onclick: () => show("manage") }) : null));
  }

  function viewUnlock({ name }) {
    const p = profile(name);
    let fails = 0;
    const pad = pinPad(async (pin, pad) => {
      if (await pinOK(name, pin)) { pad.hold("Welcome back! ✨"); return switchTo(name, returnHash); }
      if (++fails >= 5) { pad.hold("Too many tries. Ask a grown-up, or log in again with your username."); setTimeout(() => show("login", { username: name }), 2500); return; }
      pad.fail("That PIN isn't right. Try again!");
    });
    return el("div", { class: "sp-center" },
      el("span", { class: "sp-face sp-face-big" }, img(face(p.buddy))),
      title("Hi " + name + "!"), lead("Type your secret PIN."), pad.node,
      el("div", { class: "sp-foot" },
        el("button", { class: "sp-link", type: "button", text: "Forgot your PIN?", onclick: () => show("forgot", { username: name }) }),
        el("button", { class: "sp-link", type: "button", text: "Not " + name + "?", onclick: () => show("pick") })));
  }

  function usernameField(value, placeholder) {
    return el("input", { name: "username", type: "text", maxlength: "16", autocomplete: "username", autocapitalize: "off", autocorrect: "off", spellcheck: "false", inputmode: "text", placeholder: placeholder || "Your username", value: value || "", "aria-describedby": "spUserHint" });
  }

  function viewLogin({ username = "" } = {}) {
    let user = username;
    const step1 = () => {
      const err = el("p", { class: "sp-error", role: "alert" }), input = usernameField(user);
      const f = el("form", { class: "sp-form", novalidate: true },
        el("label", { class: "sp-field" }, el("span", { text: "Your username" }), input),
        el("p", { class: "sp-hint", id: "spUserHint", text: "It's on your login card. Capital letters don't matter." }), err,
        el("div", { class: "sp-actions" }, el("button", { class: "sp-go", type: "submit", text: "Next ➜" }), back(() => show("pick"))),
        el("p", { class: "sp-switch" }, "New to SpeedyLearning? ", el("button", { class: "sp-link", type: "button", text: "Make a login", onclick: () => show("signup") })));
      input.addEventListener("input", () => { err.textContent = ""; });
      f.addEventListener("submit", async e => {
        e.preventDefault();
        user = input.value.trim();
        if (!USERNAME_RE.test(user)) { err.textContent = say({ error: "username" }); input.focus(); return; }
        const btn = f.querySelector(".sp-go"); btn.disabled = true;
        const res = await api("check", { username: user });
        btn.disabled = false;
        if (res.error) { err.textContent = say(res); return; }
        if (res.free) { err.textContent = say({ error: "no-account" }); input.focus(); return; }
        body.replaceChildren(step2()); setTimeout(() => body.querySelector("#spTitle").focus({ preventScroll: true }), 30);
      });
      return el("div", {}, title("Log in"), lead("Type your username, then your secret PIN."), f);
    };
    const step2 = () => {
      const pad = pinPad(async (pin, pad) => {
        const res = await api("login", { username: user, pin });
        if (res.error) return pad.fail(say(res));
        pad.hold("Welcome back! ✨");
        await adoptAccount(res, pin);
        refresh(returnHash);
      });
      return el("div", { class: "sp-center" }, title("Hi " + user + "!"), lead("Type your secret PIN."), pad.node,
        el("div", { class: "sp-foot" },
          el("button", { class: "sp-link", type: "button", text: "Forgot your PIN?", onclick: () => show("forgot", { username: user }) }),
          el("button", { class: "sp-link", type: "button", text: "Change username", onclick: () => body.replaceChildren(step1()) })));
    };
    return username ? step2() : step1();
  }

  const ADJ = ["Speedy", "Happy", "Brave", "Clever", "Super", "Mighty", "Sunny", "Cosmic", "Lucky", "Jolly", "Bright", "Zippy", "Swift", "Starry"];
  const ANI = ["Fox", "Panda", "Otter", "Tiger", "Owl", "Dolphin", "Koala", "Rocket", "Dragon", "Penguin", "Comet", "Bear", "Badger", "Hedgehog"];
  const pickOne = a => a[crypto.getRandomValues(new Uint32Array(1))[0] % a.length];
  const idea = () => pickOne(ADJ) + pickOne(ANI) + (10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90));

  function choice(group, value, label, checked, extra) {
    const input = el("input", { type: "radio", name: group, value, checked: checked || false });
    const lab = el("label", { class: "sp-" + group + (checked ? " is-on" : "") }, input, extra || null, el("span", { text: label }));
    input.addEventListener("change", () => { lab.parentElement.querySelectorAll("label").forEach(l => l.classList.toggle("is-on", l.querySelector("input").checked)); });
    return lab;
  }
  function buddyYearFields(buddy, year) {
    return [
      el("fieldset", {}, el("legend", { text: "Pick your buddy" }), el("div", { class: "sp-buddies" }, BUDDIES.map(([id, label]) => choice("buddy", id, label, id === buddy, img(face(id)))))),
      el("fieldset", {}, el("legend", { text: "Which year are you in?" }), el("div", { class: "sp-years" }, YEARS.map(y => choice("year", y, y, y === year))))
    ];
  }

  function viewSignup({ keepFrom: fromTile } = {}) {
    const keepFrom = fromTile || (hasData(DEFAULT) && list().includes(DEFAULT) ? DEFAULT : null);
    const suggested = fromTile && USERNAME_RE.test(fromTile.replace(/\s+/g, "")) ? fromTile.replace(/\s+/g, "") : "";
    const st = { username: suggested, buddy: (fromTile && profile(fromTile).buddy) || BUDDY_IDS[learners().length % BUDDY_IDS.length], year: (keepFrom && ls.get("speedy-year|" + keepFrom)) || "", keep: !!keepFrom, pin: "" };
    const heading = fromTile ? "Make a login for " + fromTile : "Make your login";

    const s1 = () => {
      const err = el("p", { class: "sp-error", role: "alert" }), input = usernameField(st.username, "e.g. BraveOtter27");
      const ideaBtn = el("button", { class: "sp-idea", type: "button", onclick: async () => {
        for (let i = 0; i < 4; i++) { const n = idea(); const r = await api("check", { username: n }); if (r.error || r.free) { input.value = n; err.textContent = ""; return; } }
      } }, "💡 Give me an idea");
      const f = el("form", { class: "sp-form", novalidate: true },
        el("label", { class: "sp-field" }, el("span", { text: "Choose a username" }), el("span", { class: "sp-row" }, input, ideaBtn)),
        el("p", { class: "sp-hint", id: "spUserHint", text: "3 to 16 letters or numbers. Make it fun, and don't use your full name!" }), err,
        el("div", { class: "sp-actions" }, el("button", { class: "sp-go", type: "submit", text: "Next ➜" }), back(() => show("pick"))));
      input.addEventListener("input", () => { err.textContent = ""; });
      f.addEventListener("submit", async e => {
        e.preventDefault();
        const name = input.value.trim();
        if (/@/.test(name)) { err.textContent = "No email needed! Just make up a username."; return; }
        if (!USERNAME_RE.test(name)) { err.textContent = say({ error: "username" }); input.focus(); return; }
        const btn = f.querySelector(".sp-go"); btn.disabled = true;
        const res = await api("check", { username: name });
        btn.disabled = false;
        if (res.error) { err.textContent = say(res); return; }
        if (!res.free) { err.textContent = say({ error: res.problem === "reserved" ? "reserved" : "taken" }); input.focus(); return; }
        st.username = name; go(s2);
      });
      return el("div", {}, steps(1, 3), title(heading), lead("Just a username and a secret PIN. No email needed."), f);
    };
    const s2 = () => {
      const keepBox = keepFrom ? el("label", { class: "sp-keep" }, el("input", { type: "checkbox", name: "keep", checked: st.keep }),
        el("span", {}, "Keep the progress already on this device", el("small", { text: answers(keepFrom) ? " (" + answers(keepFrom).toLocaleString("en-GB") + " answers so far)" : "" }))) : null;
      const f = el("form", { class: "sp-form", novalidate: true }, buddyYearFields(st.buddy, st.year), keepBox,
        el("div", { class: "sp-actions" }, el("button", { class: "sp-go", type: "submit", text: "Next ➜" }), back(() => go(s1))));
      f.addEventListener("submit", e => {
        e.preventDefault();
        const data = new FormData(f);
        st.buddy = String(data.get("buddy") || st.buddy); st.year = String(data.get("year") || ""); st.keep = !!data.get("keep");
        go(s3);
      });
      return el("div", {}, steps(2, 3), title("Hello, " + st.username + "!"), f);
    };
    const s3 = (again) => {
      const pad = pinPad(async (pin, pad) => {
        if (!again) {
          if (easyPin(pin)) return pad.fail(say({ error: "easy-pin" }));
          st.pin = pin; return go(() => s3(true));
        }
        if (pin !== st.pin) { st.pin = ""; go(() => s3(false)); body.querySelector(".sp-pin-msg").textContent = "Those PINs didn't match. Let's try again."; return; }
        pad.hold("Making your login…");
        const res = await api("signup", { username: st.username, pin, buddy: st.buddy, year: st.year });
        if (res.error) {
          if (res.error === "taken") { go(s1); body.querySelector(".sp-error").textContent = say(res); return; }
          return pad.fail(say(res));
        }
        await adoptAccount(res, pin, st.keep ? keepFrom : null);
        reloadOnClose = true;
        go(() => viewDone({ username: res.profile.username, code: res.recoveryCode, buddy: st.buddy }));
      });
      return el("div", { class: "sp-center" }, steps(3, 3),
        title(again ? "Type your PIN again" : "Make a secret PIN"),
        lead(again ? "Just to check you remember it." : "Choose 4 numbers you'll remember. Only tell your grown-up!"), pad.node,
        el("div", { class: "sp-foot" }, back(() => go(s2))));
    };
    function go(view) { body.replaceChildren(view()); dialog.scrollTop = 0; const t = body.querySelector("#spTitle"); if (t) setTimeout(() => t.focus({ preventScroll: true }), 30); }
    return s1();
  }

  function viewDone({ username, code, buddy }) {
    const printCard = () => {
      let card = document.getElementById("spPrintCard");
      if (card) card.remove();
      card = el("div", { id: "spPrintCard" },
        el("h1", { text: "My SpeedyLearning login" }), img(face(buddy)),
        el("p", {}, "Username: ", el("b", { text: username })),
        el("p", {}, "PIN: ", el("span", { class: "sp-blanks", text: "_  _  _  _" })),
        el("p", { class: "sp-print-code" }, "Grown-ups' recovery code: ", el("b", { text: code })),
        el("p", { text: "Log in at speedylearning.co.uk. Keep this card somewhere safe. The recovery code lets a grown-up set a new PIN." }));
      document.body.append(card);
      document.documentElement.classList.add("sp-print");
      const done = () => { document.documentElement.classList.remove("sp-print"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
      setTimeout(done, 1500);
    };
    return el("div", { class: "sp-center" },
      el("span", { class: "sp-face sp-face-big" }, img(face(buddy))),
      title("You're all set, " + username + "! 🎉"),
      lead("Log in on any device with your username and secret PIN."),
      el("div", { class: "sp-card" },
        el("p", { class: "sp-card-user" }, el("small", { text: "Your username" }), el("b", { text: username })),
        el("div", { class: "sp-card-code" },
          el("p", {}, el("b", { text: "Grown-ups: " }), "write down or print this recovery code. It's the only way to set a new PIN if it's forgotten, and it won't be shown again."),
          el("p", { class: "sp-code", text: code }))),
      el("div", { class: "sp-actions sp-actions-center" },
        el("button", { class: "sp-go", type: "button", text: "Start learning ➜", onclick: () => refresh(returnHash) }),
        el("button", { class: "sp-ghost", type: "button", text: "🖨️ Print login card", onclick: printCard })));
  }

  function viewForgot({ username = "" } = {}) {
    const st = { username, code: "", pin: "" };
    const s1 = () => {
      const err = el("p", { class: "sp-error", role: "alert" }), user = usernameField(st.username);
      const code = el("input", { name: "code", type: "text", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", maxlength: "20", placeholder: "XXXX-XXXX-XXXX", value: st.code });
      const f = el("form", { class: "sp-form", novalidate: true },
        el("label", { class: "sp-field" }, el("span", { text: "Username" }), user),
        el("label", { class: "sp-field sp-gap" }, el("span", { text: "Recovery code" }), code),
        el("p", { class: "sp-hint", id: "spUserHint", text: "The recovery code was shown when the login was made (it's on the printed login card)." }), err,
        el("div", { class: "sp-actions" }, el("button", { class: "sp-go", type: "submit", text: "Next ➜" }), back(() => show("pick"))));
      f.addEventListener("submit", e => {
        e.preventDefault();
        st.username = user.value.trim(); st.code = code.value.trim();
        if (!USERNAME_RE.test(st.username)) { err.textContent = say({ error: "username" }); return; }
        if (st.code.replace(/[^A-Za-z0-9]/g, "").length !== 12) { err.textContent = "The recovery code has 12 letters and numbers, like ABCD-EFGH-JK23."; return; }
        go(() => s2(false));
      });
      return el("div", {}, title("Forgot your PIN?"), lead("A grown-up can set a new PIN with the recovery code."), f);
    };
    const s2 = again => {
      const pad = pinPad(async (pin, pad) => {
        if (!again) { if (easyPin(pin)) return pad.fail(say({ error: "easy-pin" })); st.pin = pin; return go(() => s2(true)); }
        if (pin !== st.pin) { go(() => s2(false)); body.querySelector(".sp-pin-msg").textContent = "Those PINs didn't match. Let's try again."; return; }
        pad.hold("Saving your new PIN…");
        const res = await api("recover", { username: st.username, code: st.code, newPin: pin });
        if (res.error) { go(s1); body.querySelector(".sp-error").textContent = say(res); return; }
        await adoptAccount(res, pin);
        refresh(returnHash);
      });
      return el("div", { class: "sp-center" }, title(again ? "Type the new PIN again" : "Choose a new PIN"), lead("4 numbers that are easy to remember but hard to guess."), pad.node, el("div", { class: "sp-foot" }, back(() => go(s1))));
    };
    function go(view) { body.replaceChildren(view()); dialog.scrollTop = 0; }
    return s1();
  }

  function viewManage() {
    return el("div", {},
      title("Grown-ups: manage logins"),
      lead("Choose a learner to change their buddy, year or PIN, log them out of this device, or delete their login."),
      el("div", { class: "sp-grid" }, learners().map(n => tile(n, { manage: true, go: name => show("learner", { name }) }))),
      el("p", { class: "sp-safe" }, "🔒 Logins need no email. PINs are stored scrambled, and logins nobody uses for a year are deleted."),
      el("div", { class: "sp-foot" }, el("button", { class: "sp-go", type: "button", text: "Done", onclick: () => show("pick") })));
  }

  function viewLearner({ name }) {
    const p = profile(name), rec = syncRec(name), note = el("p", { class: "sp-error", role: "alert" });
    const saved = !p.account ? "Saved on this device only" : p.needsLogin ? "Logged out on this device" : rec.at ? "Saved online ✓ " + new Date(rec.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Saved online ✓";
    const f = el("form", { class: "sp-form", novalidate: true }, buddyYearFields(p.buddy, p.year), note,
      el("div", { class: "sp-actions" }, el("button", { class: "sp-go", type: "submit", text: "Save changes" }), back(() => show("manage"))));
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const data = new FormData(f), buddy = String(data.get("buddy") || p.buddy), year = String(data.get("year") || p.year);
      const m = meta(); m[name] = { ...(m[name] || { created: Date.now() }), buddy }; writeJSON(META, m);
      if (year) ls.set("speedy-year|" + name, year);
      if (p.account && token(name)) { const r = await api("profile", { buddy, year }, token(name)); if (r.error && r.error !== "offline") { note.textContent = say(r); return; } }
      if (name === current()) refresh(returnHash); else show("manage");
    });
    let armed = "";
    const confirmNote = el("p", { class: "sp-remove-note", role: "status" });
    const danger = [];
    if (p.account) {
      if (!p.needsLogin) danger.push(el("button", { class: "sp-ghost sp-small", type: "button", text: "🔢 Change PIN", onclick: () => show("changepin", { name }) }));
      danger.push(el("button", { class: "sp-ghost sp-small", type: "button", text: "🚪 Log out on this device", onclick: async e => {
        if (armed !== "out") { armed = "out"; e.currentTarget.textContent = "Yes, log " + name + " out"; confirmNote.textContent = name + "'s progress stays saved online. Log in again any time with the username and PIN."; return; }
        e.currentTarget.disabled = true;
        if (token(name)) { await push(name); await api("logout", {}, token(name)); }
        const wasCurrent = current() === name; removeLocal(name);
        if (wasCurrent) refresh(returnHash); else show("manage");
      } }));
      if (!p.needsLogin) danger.push(el("button", { class: "sp-remove", type: "button", text: "Delete " + name + "'s login", onclick: () => show("changepin", { name, deleting: true }) }));
    } else {
      danger.push(el("button", { class: "sp-ghost sp-small", type: "button", text: "🔑 Make a login", onclick: () => show("signup", { keepFrom: name }) }));
      danger.push(el("button", { class: "sp-remove", type: "button", text: "Remove from this device", onclick: e => {
        if (armed !== "rm") { armed = "rm"; e.currentTarget.textContent = "Yes, remove " + name; confirmNote.textContent = "This deletes " + name + "'s progress on this device. It can't be undone. Press again to remove."; return; }
        const wasCurrent = current() === name; removeLocal(name);
        if (wasCurrent) refresh(returnHash); else show("manage");
      } }));
    }
    return el("div", {},
      el("div", { class: "sp-who" }, el("span", { class: "sp-face" }, img(face(p.buddy))), el("div", {}, title(name), el("p", { class: "sp-saved", text: (p.account ? "Username: " + name + " · " : "") + saved }))),
      f, el("div", { class: "sp-danger" }, el("div", { class: "sp-danger-row" }, danger), confirmNote));
  }

  function viewChangePin({ name, deleting = false }) {
    const st = { old: "" };
    const stepOld = () => {
      const pad = pinPad(async (pin, pad) => {
        if (deleting) {
          pad.hold("Deleting…");
          const res = await api("delete", { pin }, token(name));
          if (res.error) return pad.fail(say(res));
          const wasCurrent = current() === name; removeLocal(name);
          if (wasCurrent) return refresh(returnHash);
          return show("manage");
        }
        st.old = pin; go(() => stepNew(false));
      });
      return el("div", { class: "sp-center" },
        title(deleting ? "Delete " + name + "'s login?" : "Change " + name + "'s PIN"),
        lead(deleting ? "This deletes the login and all of " + name + "'s progress, on every device. It can't be undone. Type the PIN to confirm." : "First, type the PIN used now."),
        pad.node, el("div", { class: "sp-foot" }, back(() => show("learner", { name })),
          el("button", { class: "sp-link", type: "button", text: "Forgot the PIN?", onclick: () => show("forgot", { username: name }) })));
    };
    const stepNew = again => {
      const pad = pinPad(async (pin, pad) => {
        if (!again) { if (easyPin(pin)) return pad.fail(say({ error: "easy-pin" })); st.pin = pin; return go(() => stepNew(true)); }
        if (pin !== st.pin) { go(() => stepNew(false)); body.querySelector(".sp-pin-msg").textContent = "Those PINs didn't match. Let's try again."; return; }
        pad.hold("Saving…");
        const res = await api("pin", { pin: st.old, newPin: pin }, token(name));
        if (res.error) { go(stepOld); body.querySelector(".sp-pin-msg").textContent = say(res); return; }
        await savePinCheck(name, pin);
        show("learner", { name });
        body.querySelector(".sp-error").textContent = "✓ New PIN saved.";
      });
      return el("div", { class: "sp-center" }, title(again ? "Type the new PIN again" : "Choose a new PIN"), lead("4 numbers that are easy to remember but hard to guess."), pad.node, el("div", { class: "sp-foot" }, back(() => go(stepOld))));
    };
    function go(view) { body.replaceChildren(view()); dialog.scrollTop = 0; }
    return stepOld();
  }

  // ---------- header chip and homepage welcome ----------
  function mountChip() {
    const head = document.querySelector(".speed-top");
    if (!head) return;
    const chip = head.querySelector(".sp-chip");
    const name = current(), p = profile(name), ready = p.account && !p.needsLogin;
    const small = ready ? "Learning as" : p.needsLogin ? "Welcome back" : "Who's learning?";
    const big = ready ? name : p.needsLogin ? "Log in again" : "Log in";
    const fresh = el("button", { class: "sp-chip" + (ready ? "" : " is-out"), type: "button", "aria-haspopup": "dialog", "aria-label": ready ? "Learning as " + name + ". Change learner" : "Log in or make a login", onclick: () => open(p.needsLogin ? "login" : "pick", p.needsLogin ? { username: name } : {}) },
      el("span", { class: "sp-chip-face" }, img(face(p.buddy))),
      el("span", { class: "sp-chip-text" }, el("small", { text: small }), el("b", { text: big })));
    if (chip) chip.replaceWith(fresh); else head.insertBefore(fresh, head.querySelector(".speed-menu-toggle") || head.querySelector(".speed-nav-cta"));
    head.classList.add("sp-has-chip");
  }
  const welcoming = () => location.pathname === "/" && !hasAccounts() && !ls.get(WELCOME);
  function mountWelcome() {
    if (!welcoming()) return;
    const anchor = document.getElementById("speedHero") || document.getElementById("rules");
    if (!anchor || document.querySelector(".sp-welcome")) return;
    const card = el("section", { class: "sp-welcome", "aria-labelledby": "spWelcomeTitle" },
      el("div", { class: "sp-welcome-crew", "aria-hidden": "true" }, ["dash", "story", "spark"].map(n => img(face(n)))),
      el("div", { class: "sp-welcome-copy" },
        el("h2", { id: "spWelcomeTitle", text: "Who's learning today?" }),
        el("p", {}, "Each child gets a username and a secret 4-number PIN. ", el("b", { text: "No email needed." }), " Log in on any device and carry on where you left off.")),
      el("div", { class: "sp-welcome-actions" },
        el("button", { class: "sp-go", type: "button", text: "Make a login", onclick: () => open("signup") }),
        el("button", { class: "sp-ghost", type: "button", text: "I have a login", onclick: () => open("login") }),
        el("button", { class: "sp-link", type: "button", text: "Not now", onclick: () => { ls.set(WELCOME, "later"); card.remove(); } })));
    anchor.parentNode.insertBefore(card, anchor);
  }

  function mount() { mountChip(); mountWelcome(); }
  // Runs after the shared header is built by speedy-world.js
  const start = () => setTimeout(mount, 0);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  window.addEventListener("speedy-profile-updated", mountChip);
  window.addEventListener("storage", e => { if ([PLAYERS, CURRENT, META].includes(e.key)) mountChip(); });
  startSync();

  window.SpeedyProfiles = Object.freeze({
    open: (view, opts) => open(view, opts),
    switchTo, current, list, learners, isSetUp, welcoming, isAccount,
    profile: name => profile(name || current()),
    buddyName, face, resetProgress, syncNow: () => push(current())
  });
})();
