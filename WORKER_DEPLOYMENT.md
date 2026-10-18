# Visitor console storage — 18 October 2026

The live console had shown dashes because the Cloudflare Worker was deployed with **no D1 binding**, so `/api/public-visit-summary` returned HTTP 503.

**Fixed without needing D1:** `wrangler.jsonc` now declares the `VISIT_COUNTER` SQLite-backed Durable Object and its `VisitCounter` class through Cloudflare's declarative `exports` configuration. A successful `npx wrangler deploy` provisions storage automatically on the Workers Free plan, without manual database IDs or schema execution.

- Recording starts when the new version deploys and someone opens `/`. Previously failed visit events cannot be recovered.
- A repeat homepage opening counts as another visit; visitors are not identified.
- Visit-event timestamps are retained for 30 days with a daily clean-up alarm. A numerical lifetime total is preserved without identifiers.
- The dashboard remains read-only and publicly accessible by design. Notification admin endpoints stay disabled until safely authenticated.
- `/api/worker-health` should return `databaseConfigured:true` with `visitStorage:"durable-object"`.
- `/api/public-visit-summary` should return an empty-count JSON response on a new installation, not 503.
- Loading `/` makes `POST /api/visit`; the dashboard should then increase its total and show the event.
- Optional legacy D1-based tracking remains in the Worker as a fallback where bound.

Deployment troubleshooting:
1. Cloudflare → Workers & Pages → speedylearning → Deployments should show the newest `main` commit as successfully deployed.
2. Build settings should still use `npx wrangler deploy`. No changes to Cloudflare DNS are required.
3. If the build fails while provisioning the Durable Object namespace, check whether the Cloudflare build token has permission to deploy a Worker with Durable Objects. Do **not** paste or commit credentials.
4. Never make subscription/notification mutation endpoints public to bypass authentication.

This upgrade fixes **visitor counts**. Android push requires encrypted VAPID secrets and a secure subscription flow and is not switched on by this change.

---

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
4. Visitor counts now use auto-provisioned Durable Object storage. An extra D1 database is not required.
5. Load the homepage, then verify `/api/public-visit-summary` counts have increased. **Do not** configure a fake database ID.
6. Android push alerts need an authenticated notification API, VAPID credentials in Cloudflare encrypted secrets and device permission. They are not provided merely by successfully deploying the Worker.

This build intentionally omits `functions/`, `serverlib/`, `schema.sql` and `wrangler.jsonc` from the static assets to avoid exposing backend implementation. The Worker still contains `/api/*` routes. Do not remove authorization protections to get phone notifications working.
