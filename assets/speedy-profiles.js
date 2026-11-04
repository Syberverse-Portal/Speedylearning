/* SpeedyLearning learner profiles.
   A profile is a first name or nickname, a buddy and a school year. No email, no password,
   no account: everything is saved in this browser on this device and never sent anywhere. */
(() => {
  "use strict";
  const PLAYERS = "speedy-players", CURRENT = "speedy-player", META = "speedy-profile-meta", WELCOME = "speedy-profiles-welcome";
  const JOURNEY = "speedy-island-journey-v1", QUESTS = "speedy-quest-atlas-v3";
  // Everything saved per child uses "<prefix>|<name>". Renaming or removing a learner moves or clears these.
  const PER_CHILD = ["speedy-log", "speedy-miss", "speedy-days", "speedy-done", "speedy-books", "speedy-year", "speedy-srs", "speedy-mission", "speedy-tt", JOURNEY];
  const BUDDIES = [["dash", "Dash"], ["sum", "Sum"], ["story", "Story"], ["scribble", "Scribble"], ["scout", "Scout"], ["spark", "Spark"]];
  const BUDDY_IDS = BUDDIES.map(b => b[0]);
  const YEARS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
  const DEFAULT = "Me";

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

  // ---------- profile data ----------
  function list() {
    const p = readJSON(PLAYERS, null);
    const names = Array.isArray(p) ? p.filter(x => typeof x === "string" && x.trim()) : [];
    return names.length ? [...new Set(names)] : [DEFAULT];
  }
  function meta() { const m = readJSON(META, {}); return m && typeof m === "object" && !Array.isArray(m) ? m : {}; }
  function current() { const names = list(), c = ls.get(CURRENT); return c && names.includes(c) ? c : names[0]; }
  function isSetUp() { return Object.keys(meta()).length > 0; }
  function profile(name) {
    const m = meta()[name];
    return { name, buddy: m && BUDDY_IDS.includes(m.buddy) ? m.buddy : "dash", year: ls.get("speedy-year|" + name) || "", setUp: !!m };
  }
  const buddyName = id => (BUDDIES.find(b => b[0] === id) || BUDDIES[0])[1];
  const face = id => "/assets/mascot-" + (BUDDY_IDS.includes(id) ? id : "dash") + ".svg";
  const answers = name => { const l = readJSON("speedy-log|" + name, []); return Array.isArray(l) ? l.length : 0; };
  function hasData(name) {
    const saved = PER_CHILD.some(p => { const v = ls.get(p + "|" + name); return v !== null && v !== "" && v !== "[]" && v !== "{}"; });
    // Island Journey progress from before profiles existed belongs to whoever opens it first
    return saved || (name === DEFAULT && !ls.get(JOURNEY + "-claimed") && !!ls.get(JOURNEY));
  }

  function cleanName(raw) { return String(raw || "").replace(/[|<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 20); }
  function nameProblem(name, except) {
    if (!name) return "Type a first name or nickname.";
    if (name.includes("@")) return "No email needed! Just a first name or nickname.";
    if (list().some(p => p !== except && p.toLowerCase() === name.toLowerCase())) return "There's already a learner called " + name + ". Try another name.";
    return "";
  }

  // Moves (or with to = null, removes) everything saved for one child.
  function moveChild(from, to) {
    if (from === to) return;
    for (const prefix of PER_CHILD) {
      const k = prefix + "|" + from, v = ls.get(k);
      if (v === null) continue;
      if (to) ls.set(prefix + "|" + to, v);
      ls.del(k);
    }
    if (from === DEFAULT && !ls.get(JOURNEY + "-claimed") && ls.get(JOURNEY)) {
      // The unclaimed pre-profile Island Journey belongs to the default learner
      if (to && ls.get(JOURNEY + "|" + to) === null) ls.set(JOURNEY + "|" + to, ls.get(JOURNEY));
      ls.set(JOURNEY + "-claimed", to || from);
    } else if (ls.get(JOURNEY + "-claimed") === from && to) ls.set(JOURNEY + "-claimed", to);
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

  function create({ name, buddy, year, keepFrom }) {
    const m = meta(), firstSetUp = !Object.keys(m).length;
    let names = list();
    if (keepFrom && names.includes(keepFrom)) {
      moveChild(keepFrom, name);
      names = names.map(p => (p === keepFrom ? name : p));
      delete m[keepFrom];
    } else {
      // The built-in "Me" placeholder disappears once real profiles exist, unless it has progress saved
      if (firstSetUp && names.includes(DEFAULT) && !m[DEFAULT] && !hasData(DEFAULT)) names = names.filter(p => p !== DEFAULT);
      names.push(name);
    }
    m[name] = { buddy: BUDDY_IDS.includes(buddy) ? buddy : "dash", created: Date.now() };
    if (year) ls.set("speedy-year|" + name, year);
    writeJSON(PLAYERS, names); writeJSON(META, m); ls.set(CURRENT, name);
    return name;
  }
  function update(old, { name, buddy, year }) {
    const m = meta(), before = m[old] || { created: Date.now() };
    let names = list();
    if (name !== old) {
      moveChild(old, name);
      names = names.map(p => (p === old ? name : p));
      delete m[old];
      if (ls.get(CURRENT) === old) ls.set(CURRENT, name);
    }
    m[name] = { ...before, buddy: BUDDY_IDS.includes(buddy) ? buddy : "dash" };
    if (year) ls.set("speedy-year|" + name, year);
    writeJSON(PLAYERS, names); writeJSON(META, m);
    return name;
  }
  function remove(name) {
    moveChild(name, null);
    const m = meta(); delete m[name];
    let names = list().filter(p => p !== name);
    if (!names.length) names = [DEFAULT];
    writeJSON(PLAYERS, names); writeJSON(META, m);
    if (!names.includes(ls.get(CURRENT))) ls.set(CURRENT, names[0]);
  }

  // Reload so every part of the site (game, island journey, quests) picks up the new learner
  function refresh(hash) {
    if (!canStore) { close(); mountChip(); return; }
    if (hash && location.pathname === "/") { try { history.replaceState(null, "", "/" + hash); } catch (e) {} }
    location.reload();
  }
  function switchTo(name, hash) {
    if (!list().includes(name)) return;
    ls.set(CURRENT, name);
    refresh(hash);
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

  // ---------- dialog ----------
  let overlay, dialog, body, lastFocus = null, returnHash = "";
  function ensureDialog() {
    if (overlay) return;
    body = el("div", { class: "sp-body" });
    dialog = el("div", { class: "sp-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "spTitle" },
      el("button", { class: "sp-close", type: "button", "aria-label": "Close", text: "✕", onclick: close }), body);
    overlay = el("div", { class: "sp-overlay", hidden: true, onclick: e => { if (e.target === overlay) close(); } }, dialog);
    document.addEventListener("keydown", e => {
      if (overlay.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const f = [...dialog.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])")].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    document.body.append(overlay);
  }
  function open(view, opts) {
    ensureDialog();
    if (overlay.hidden) lastFocus = document.activeElement;
    returnHash = (opts && opts.returnHash) || "";
    overlay.hidden = false;
    document.documentElement.classList.add("sp-lock");
    show(view || "pick", opts);
  }
  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.documentElement.classList.remove("sp-lock");
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function show(view, opts) {
    body.replaceChildren(view === "add" ? form(null) : view === "edit" ? form(opts && opts.name) : picker(view === "manage"));
    dialog.scrollTop = 0;
    // On phones and tablets, don't pop the keyboard up over the buddy choices straight away
    const fine = window.matchMedia && matchMedia("(pointer: fine)").matches;
    const first = view === "add" || view === "edit" ? (fine ? body.querySelector("input[name=name]") : body.querySelector("#spTitle")) : body.querySelector(".sp-tile.is-on") || body.querySelector(".sp-tile");
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  }

  function picker(manage) {
    const now = current();
    const tiles = list().map(name => {
      const p = profile(name);
      return el("button", { class: "sp-tile" + (name === now && !manage ? " is-on" : ""), type: "button", "aria-pressed": manage ? false : String(name === now),
        onclick: () => (manage ? show("edit", { name }) : name === now ? close() : switchTo(name, returnHash)) },
        el("span", { class: "sp-face" }, img(face(p.buddy))),
        el("b", { text: name }),
        el("small", { text: manage ? "✏️ Edit" : p.year || (p.setUp ? "Pick a year" : "Tap to play") }));
    });
    const add = el("button", { class: "sp-tile sp-add", type: "button", onclick: () => show("add") },
      el("span", { class: "sp-face sp-plus", "aria-hidden": "true", text: "+" }), el("b", { text: "Add a learner" }), el("small", { text: "No email needed" }));
    return el("div", {},
      el("h2", { id: "spTitle", tabindex: "-1", text: manage ? "Grown-ups: edit profiles" : "Who's learning today?" }),
      el("p", { class: "sp-lead", text: manage ? "Choose a profile to rename it, change the buddy or year, or remove it." : "Tap your buddy to start. Each child gets their own scores, stars and streaks." }),
      el("div", { class: "sp-grid" }, tiles, manage ? null : add),
      el("p", { class: "sp-safe" }, "🔒 No email, no password, no account. Profiles are saved only on this device."),
      !canStore ? el("p", { class: "sp-warn", text: "⚠️ This browser isn't saving information (for example a private window), so profiles will be forgotten when the page closes." }) : null,
      el("div", { class: "sp-foot" },
        manage ? el("button", { class: "sp-go", type: "button", text: "Done", onclick: () => show("pick") })
               : el("button", { class: "sp-link", type: "button", text: "Grown-ups: edit or remove profiles", onclick: () => show("manage") })));
  }

  function choice(group, value, label, checked, extra) {
    const input = el("input", { type: "radio", name: group, value, checked: checked || false });
    const lab = el("label", { class: "sp-" + group + (checked ? " is-on" : "") }, input, extra || null, el("span", { text: label }));
    input.addEventListener("change", () => {
      lab.parentElement.querySelectorAll("label").forEach(l => l.classList.toggle("is-on", l.querySelector("input").checked));
    });
    return lab;
  }

  function form(editing) {
    const p = editing ? profile(editing) : { name: "", buddy: BUDDY_IDS[list().length % BUDDY_IDS.length], year: "" };
    const firstEver = !editing && !isSetUp();
    const keepable = firstEver ? list().filter(hasData) : [];
    const keepFrom = keepable.includes(DEFAULT) ? DEFAULT : keepable[0];
    const err = el("p", { class: "sp-error", role: "alert" });
    const nameInput = el("input", { name: "name", type: "text", maxlength: "20", autocomplete: "off", autocapitalize: "words", spellcheck: "false", placeholder: "First name or nickname", value: p.name, "aria-describedby": "spNameHint", required: true });
    nameInput.addEventListener("input", () => { err.textContent = ""; });
    const keepBox = keepFrom ? el("label", { class: "sp-keep" },
      el("input", { type: "checkbox", name: "keep", checked: true }),
      el("span", {}, "Keep the progress already saved on this device", el("small", { text: answers(keepFrom) ? " (" + answers(keepFrom).toLocaleString("en-GB") + " answers so far)" : "" }), " for this learner")) : null;

    let armed = false;
    const removeNote = el("p", { class: "sp-remove-note", role: "status" });
    const danger = editing ? el("div", { class: "sp-danger" },
      el("button", { class: "sp-remove", type: "button", text: "Remove " + editing + "'s profile", onclick: e => {
        if (!armed) { armed = true; e.currentTarget.textContent = "Yes, remove " + editing; removeNote.textContent = "This deletes " + editing + "'s scores, stars and progress on this device. It can't be undone. Press again to remove."; return; }
        const wasCurrent = current() === editing;
        remove(editing);
        if (wasCurrent) refresh(returnHash); else show("manage");
      } }), removeNote) : null;

    const f = el("form", { class: "sp-form", novalidate: true },
      el("label", { class: "sp-field" }, el("span", { text: editing ? "Name" : "What should we call you?" }), nameInput),
      el("p", { class: "sp-hint", id: "spNameHint", text: "Grown-ups: a first name or nickname is plenty. No surname or email needed." }),
      el("fieldset", {}, el("legend", { text: "Pick your buddy" }),
        el("div", { class: "sp-buddies" }, BUDDIES.map(([id, label]) => choice("buddy", id, label, id === p.buddy, img(face(id)))))),
      el("fieldset", {}, el("legend", { text: "Which year are you in?" }),
        el("div", { class: "sp-years" }, YEARS.map(y => choice("year", y, y, y === p.year)))),
      keepBox, err,
      el("div", { class: "sp-actions" },
        el("button", { class: "sp-go", type: "submit", text: editing ? "Save changes" : "Start learning ➜" }),
        el("button", { class: "sp-ghost", type: "button", text: "Back", onclick: () => show(editing ? "manage" : "pick") })),
      danger);

    f.addEventListener("submit", e => {
      e.preventDefault();
      const data = new FormData(f), keeping = keepFrom && data.get("keep") ? keepFrom : null;
      const name = cleanName(nameInput.value), problem = nameProblem(name, editing || keeping);
      if (problem) { err.textContent = problem; nameInput.focus(); return; }
      const buddy = String(data.get("buddy") || p.buddy), year = String(data.get("year") || "");
      if (editing) {
        const renamed = update(editing, { name, buddy, year });
        if (renamed === current() || editing === current()) refresh(returnHash); else show("manage");
      } else {
        create({ name, buddy, year, keepFrom: keeping });
        ls.set(WELCOME, "done");
        refresh(returnHash);
      }
    });
    return el("div", {}, el("h2", { id: "spTitle", tabindex: "-1", text: editing ? "Edit " + editing + "'s profile" : "Add a learner" }),
      el("p", { class: "sp-lead", text: editing ? "Changes are saved on this device only." : "Just a name, a buddy and a school year. No email or password." }), f);
  }

  // ---------- header chip and homepage welcome ----------
  function mountChip() {
    const head = document.querySelector(".speed-top");
    if (!head) return;
    let chip = head.querySelector(".sp-chip");
    const name = current(), p = profile(name), ready = isSetUp();
    const fresh = el("button", { class: "sp-chip", type: "button", "aria-haspopup": "dialog", "aria-label": ready ? "Learning as " + name + ". Change learner" : "Set up a learner profile", onclick: () => open("pick") },
      el("span", { class: "sp-chip-face" }, img(face(p.buddy))),
      el("span", { class: "sp-chip-text" }, el("small", { text: ready ? "Learning as" : "Who's learning?" }), el("b", { text: ready ? name : "Set up profile" })));
    if (chip) chip.replaceWith(fresh); else head.insertBefore(fresh, head.querySelector(".speed-menu-toggle") || head.querySelector(".speed-nav-cta"));
    head.classList.add("sp-has-chip");
  }
  const welcoming = () => location.pathname === "/" && !isSetUp() && !ls.get(WELCOME);
  function mountWelcome() {
    if (!welcoming()) return;
    const anchor = document.getElementById("speedHero") || document.getElementById("rules");
    if (!anchor || document.querySelector(".sp-welcome")) return;
    const card = el("section", { class: "sp-welcome", "aria-labelledby": "spWelcomeTitle" },
      el("div", { class: "sp-welcome-crew", "aria-hidden": "true" }, ["dash", "story", "spark"].map(n => img(face(n)))),
      el("div", { class: "sp-welcome-copy" },
        el("h2", { id: "spWelcomeTitle", text: "Who's learning today?" }),
        el("p", {}, "Make a profile for each child: just a name, a buddy and their school year. ", el("b", { text: "No email or password needed." }), " Scores, stars and streaks are kept separately for each child, on this device.")),
      el("div", { class: "sp-welcome-actions" },
        el("button", { class: "sp-go", type: "button", text: "Set up a profile", onclick: () => open("add") }),
        el("button", { class: "sp-ghost", type: "button", text: "Not now", onclick: () => { ls.set(WELCOME, "later"); card.remove(); } })));
    anchor.parentNode.insertBefore(card, anchor);
  }

  function mount() { mountChip(); mountWelcome(); }
  // Runs after the shared header is built by speedy-world.js
  const start = () => setTimeout(mount, 0);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  window.addEventListener("speedy-profile-updated", mountChip);
  window.addEventListener("storage", e => { if ([PLAYERS, CURRENT, META].includes(e.key)) mountChip(); });

  window.SpeedyProfiles = Object.freeze({
    open: (view, opts) => open(view, opts),
    switchTo, current, list, isSetUp, welcoming,
    profile: name => profile(name || current()),
    buddyName, face
  });
})();
