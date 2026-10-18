# SpeedyLearning Cloudflare Worker deployment

The Cloudflare project `speedylearning` is **Workers**, not Pages. The Git integration's deploy command is `npx wrangler deploy`. This repository now has `wrangler.jsonc`, with a `build.command` that prepares `dist/` automatically during Wrangler deployment.

Configuration in Cloudflare:
- GitHub repository: Syberverse-Portal/Speedylearning
- Production branch: main
- Root directory: /
- Build command in Cloudflare UI: None (Wrangler runs `build.command`)
- Deploy command: `npx wrangler deploy`

How to verify:
1. Deployments → latest build: it should run `node scripts/build-static.mjs`, then upload the static assets and Worker.
2. Test `https://speedylearning.co.uk/quests/`; it should return HTML, not 404.
3. Test `https://speedylearning.co.uk/api/worker-health`; it should return JSON, `{"worker":true,"databaseConfigured":false,"pushConfigured":false}` until other resources are configured.
4. For visitor counts, create a Cloudflare D1 database and bind to this Worker with variable name `DB`. Apply SQL from `schema.sql`.
5. Redeploy, load the homepage, and verify `/api/public-visit-summary` counts have increased. **Do not** configure a fake database ID.
6. Android push alerts need an authenticated notification API, VAPID credentials in Cloudflare encrypted secrets and device permission. They are not provided merely by successfully deploying the Worker.

This build intentionally omits `functions/`, `serverlib/`, `schema.sql` and `wrangler.jsonc` from the static assets to avoid exposing backend implementation. The Worker still contains `/api/*` routes. Do not remove authorization protections to get phone notifications working.
