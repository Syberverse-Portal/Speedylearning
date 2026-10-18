> **2026-10-18 deployment update:** Visitor counts now use automatic Durable Object storage configured in `wrangler.jsonc`; you no longer need to create D1 manually. Refer to `WORKER_DEPLOYMENT.md`. The D1 instructions below document the legacy path only.

# SpeedyLearning v2 Deployment and Operating Guide

This branch provides: device-local personalised practice plans and parent reports, accessibility preferences, optional offline learning shell, PWA manifest, privacy information and a Cloudflare Pages advanced-mode Worker offering anonymous visit counts.

## Cloudflare: mandatory before visitor counts work

1. Confirm the production domain **speedylearning.co.uk** is attached to a **Cloudflare Pages** project actually deployed from the GitHub repository Syberverse-Portal/Speedylearning on branch main.
2. Set the Pages **build output directory** to the repository root containing `index.html`; no build command is required unless Cloudflare explicitly needs it.
3. Confirm the Pages deployment picks up the root `_worker.js` as an **advanced-mode Pages Worker**. The root `functions/` API modules are legacy and are not the active entrypoint while `_worker.js` is present. Don't attempt to enable both routing systems.
4. Create a **Cloudflare D1** database called `speedylearning-console`. Under the Pages project bindings, bind it as **DB** in production (and optionally preview).
5. In Cloudflare D1 console run the SQL in `schema.sql`. This creates `visits` and `push_subscriptions` tables. Do not introduce IP or device identifiers.
6. Redeploy. Open `https://speedylearning.co.uk/api/worker-health`. The correct live response is JSON with `worker:true`, `databaseConfigured:true`; HTTP 404 means this site is not serving the repository Worker as Cloudflare Pages runtime.
7. Open the homepage once. Then open `/api/public-visit-summary` (should show a JSON count). Open the password-free read-only console: `https://speedylearning.co.uk/console/`.
8. Validate a second page visit increases the count. Refreshing the learning site counts as a separate page opening.
9. Protect or remove admin-only resources and restrict access to the console before production rollout. Password-free stats are PUBLIC to anyone who knows the link. The active Worker deliberately returns HTTP 503 for `/api/admin/*`, preventing public push-subscription administration.

## Push notifications: not yet active

The previous `functions/api/admin` handlers include web-push routines but are intentionally inaccessible in the active Worker. To safely turn push on, deploy a dedicated authenticated admin Worker or integrate the existing verified notification library with token/session checks. Put VAPID keys and a strong session secret in Cloudflare **encrypted secrets**, not GitHub. Secure `/console/` using Cloudflare Access or an authenticated admin session, then enroll the Android phone with `Notification.requestPermission()` and a service-worker push subscription. Test a browser push subscription and actual phone delivery. Do **not** open admin mutation endpoints to the public in order to avoid passwords.

## AI school-word helper

The current page uses a school-term glossary locally. Connecting external AI needs a separate constrained server endpoint, a safety and data-handling review, age-appropriate prompting, private-info filtering and adult enablement. Its toggle is currently advisory and does not cause children's prompts to be sent to a remote model.

## Optional activity measurements

The device settings contain an opt-in for anonymous subject totals; the live Worker deliberately returns 404 for `/api/activity` until a privacy review, aggregation-only database table and anti-abuse controls are implemented. No user/session or child profile tracking should be sent to the admin service.

## Privacy and retention

Visitor records store just the visit timestamp and auto-delete records older than 30 days incrementally. The public dashboard reveals visit totals and visit times, so avoid using it to infer identity. Children’s answer histories, mistakes, local profile names, and practice plans stay in the browser. The privacy page is a technical draft: before general release add operator's details, retention and legal basis under UK GDPR and Children's Code.

## Testing checklist

- `node tests/verify.mjs` from the original setup package validates the push cryptography and legacy backend helpers.
- Browser smoke-test: homepage, subject choice, full quiz, parents' corner, My Progress, settings, contrast, text size, reduced motion, parent report download, daily plan, and offline restart.
- Cloudflare live tests are mandatory: /api/worker-health, /api/public-visit-summary, POST /api/visit, console.
- Confirm no background request includes player name, question, answer or IP address.

## Known constraints

- Offline mode caches only same-origin shell files and will not work for third-party images, fonts or remote content without network.
- A website cannot force notification permission on Android. The owner must opt in on their device.
- No live visitors metric without an active heartbeat protocol; the current console correctly reports visit events only.
