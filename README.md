# Speedy Learning

A learning game for UK primary school children (Reception to Year 6): quizzes for every National Curriculum subject, maths, spelling, reading, stories, writing, Year 6 SATs practice, progress tracking and a Parents' Corner.

The whole game is one file: `index.html`.

## Logins (username + 4-digit PIN, no email)
Each child makes a login: a username (3–16 letters or numbers; the 💡 button suggests one), a buddy, a school year and a secret 4-number PIN. No email, real name or password. A grown-ups' recovery code is shown once at sign-up (and can be printed on a login card); it is the only way to reset a forgotten PIN.

- **Any device:** progress is kept in the browser as before and synced to the child's login, so they can log in elsewhere and carry on. Lists (answers, finished sections, days played, books) from two devices are merged; other progress uses the most recent device's copy.
- **Shared devices:** each child taps their buddy and types their PIN to switch. Children can still play without logging in (device-only progress).
- **Grown-ups:** *Grown-ups: manage logins* changes buddy, year or PIN, logs a child out of one device, or deletes the login and all progress (needs the PIN).
- **Safety:** PINs are stored salted and hashed (PBKDF2). Too-easy PINs (1234, 1111…) are refused. 5 wrong PINs pause the login for 15 minutes, then longer. Login attempts are rate-limited per network address (not stored). Logins unused for 12 months are deleted.
- **Where:** one SQLite Durable Object per login (`LEARNERS` binding, class `LearnerAccount`) in Cloudflare's EU jurisdiction. Code: `serverlib/learner-accounts.js` (API under `/api/learner/*`), `assets/speedy-profiles.js` (screens and sync), `assets/speedy-tracker.css` (My Progress).
- **Tests:** `node --test tests/learner-api.test.mjs` and `node tests/profiles-browser.cjs` run against `tests/harness/worker-harness.mjs`, which runs the real Worker in Node 22 with SQLite storage (`node tests/harness/worker-harness.mjs 8765`).

## Publish on Cloudflare Workers
The existing Cloudflare project `speedylearning` is a Worker connected to the GitHub `main` branch. The deploy command is `npx wrangler deploy`. It uses `wrangler.jsonc` and `scripts/build-static.mjs` to upload the public learning site and its APIs. The visitor console uses SQLite-backed Durable Object storage created automatically during deployment; no D1 database setup is necessary. See `WORKER_DEPLOYMENT.md` for verification and console troubleshooting.

## Optional AI helper
`cloudflare/speedy-helper-worker.js` is a Cloudflare Worker for the "What does this mean?" chat. Set its address as `HELPER_URL` in `index.html`.
