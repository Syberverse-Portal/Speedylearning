# Speedy Learning

A learning game for UK primary school children (Reception to Year 6): quizzes for every National Curriculum subject, maths, spelling, reading, stories, writing, Year 6 SATs practice, progress tracking and a Parents' Corner.

The whole game is one file: `index.html`.

## Learner profiles (no email)
Each child gets a profile with a first name or nickname, a buddy and a school year: no email, password or account. The header chip ("Learning as…") and the homepage welcome card open the profile picker. Profiles live only in the browser (`speedy-players`, `speedy-player`, `speedy-profile-meta`); each child's scores, mistakes, streaks, missions, Island Journey and Home Quest Atlas progress are kept separately. Code: `assets/speedy-profiles.js` and `assets/speedy-profiles.css`.

## Publish on Cloudflare Workers
The existing Cloudflare project `speedylearning` is a Worker connected to the GitHub `main` branch. The deploy command is `npx wrangler deploy`. It uses `wrangler.jsonc` and `scripts/build-static.mjs` to upload the public learning site and its APIs. The visitor console uses SQLite-backed Durable Object storage created automatically during deployment; no D1 database setup is necessary. See `WORKER_DEPLOYMENT.md` for verification and console troubleshooting.

## Optional AI helper
`cloudflare/speedy-helper-worker.js` is a Cloudflare Worker for the "What does this mean?" chat. Set its address as `HELPER_URL` in `index.html`.
