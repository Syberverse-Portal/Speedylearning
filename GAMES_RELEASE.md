# SpeedyLearning Original Arcade — Maths first release

## Live game
- URL: https://speedylearning.co.uk/games/
- Main entrance: Maths → Nova Forge arcade
- Every age: Maths → Reception / Year 1 / Year 2 / Year 3 / Year 4 / Year 5 / Year 6 → 🎮 Nova Forge Games
- Age-specific deep link: /games/?subject=maths&stage=Year%204 (for example)
- Genre: original 2-stage Maths forge + lightship exploration. The question is visible in-world so the graphics remain in view during Maths.
- Skills: counting and number bonds at Reception, addition/subtraction, place value, multiplication/division, fractions, percentages, ratio and algebra at later stages.
- Novel interaction: build the value of the actual answer using one of several different possible combinations of energy shards. A correct flexible route powers an original animated lightship with touch, keyboard and optional gamepad controls.
- The visual environment, shader-like gradient surfaces, cockpit particles, rings and synthesis effects are procedural browser code, not stock game assets.
- No advertisements, subscriptions, new accounts or paid game services. Runs on the existing Cloudflare Worker static asset service.
- The game includes an in-world speech-bubble help control, an optional classroom method notebook and an accessible button alternative to using the canvas.
- Privacy: local-only totals and in-game working; no response telemetry or pupil identities leave the device.
- Motion reduction, high contrast, silent default, pause and keyboard controls are included.
- Browser test: GitHub Actions runs Chromium at desktop and mobile widths and verifies interactive forge-to-flight gameplay and accessible working notebook.

## Current scope and honesty

This release is only the **Maths** subject. No icons for unfinished subject games have been added. Other subjects will need genuinely distinct mechanics and reviewed curriculum content, introduced **subject by subject** rather than replacing lessons with low-quality quiz reskins.

Question sets are England primary curriculum-inspired and differentiated from Reception to Year 6. This does not certify complete coverage of every statutory outcome or originality versus every game on the market. Independent teacher review and child usability testing remain necessary.

## Deployment

Cloudflare project `speedylearning` is a Worker with `npx wrangler deploy`, using `wrangler.jsonc` and `scripts/build-static.mjs`. New public files: `games/index.html`, `games/arcade.css`, `games/arcade.js`, `games/maths-data.js`; all in offline cache v6. Visitor console Durable Object configuration remains unchanged.

Verification:
- `node --test tests/nova-maths.test.cjs tests/nova-interaction.test.cjs`
- Chromium browser smoke: `node tests/nova-browser.cjs` using a local static server and Playwright.
- Production `/games/` loads HTML, `/games/arcade.js` loads JS, `/api/worker-health` still reports working Durable Object storage.
- The newest in-world HUD contains `id="stageBrief"`, `id="stageHelp"` and `id="pilotBrief"`. Older Cloudflare deployments may lack these until the build updates.
