# SpeedyLearning Home Quest Atlas — curriculum and quality notes

## What shipped
A new `/quests/` page and link in the main subject menu. It is an **offline-first, no-account, no-identifying-data** UK-wide home-adventure layer with a Learn → Do → Explain teaching approach, 24 real-world quests and four levels of each task.

- England: EYFS Reception / Years 1–6 broad stages
- Wales: Progression steps 1–3 as broad reference points, not fixed school years
- Scotland: Curriculum for Excellence Early, First, Second broad levels
- Northern Ireland: Foundation Stage, Key Stages 1–2

The app provides 96 differentiated level activities across the 24 quest themes, but does **not** claim that each is officially verified against particular learning objective codes.

Progress stays in the child's browser local storage; it is not uploaded. "Explored" is the only progress label and should not imply academic mastery. A parent can export a local summary. No real names, emails, schools, or addresses are asked for.

## Quality assurance
Run these smoke tests in a real browser before widespread rollout:
1. Load `/`, click Home Quest Atlas, select each of the four curriculum nations.
2. Switch every stage in each country, filter by each of the seven themes, open a quest and check all 3 steps.
3. Mark a quest explored, refresh, check the completion count stays on the device, and switch country/stage to ensure progress is partitioned.
4. Generate the parent summary. Change stages and ensure summaries never include another stage's records.
5. Start the site offline after it has loaded at least once. Main website, quest index, JS and catalogue should load from the cache; external images/fonts may not.
6. Run keyboard-only and phone-sized accessibility tests.
7. Recheck deployed Cloudflare Pages functions and D1 separately: `/api/worker-health`, `/api/public-visit-summary`, `/api/visit`. Their failure must never stop the child's learning activities.
8. Review all question/quest text against the specific official curriculum objectives before advertising statutory "full coverage."

## Roadmap: genuine curriculum completeness
1. Build a **versioned curriculum-objectives register** by nation, phase and subject with official source document, objective reference ID, mapping confidence, and last verified date.
2. Map every existing game question to explicit objective IDs; flag objectives with no playable exercise.
3. Add objective-specific lessons, phonics sequences and formative assessments; repeat across different contexts before suggesting mastery.
4. Independent review by subject teachers in each jurisdiction and accessibility testing with caregivers.
5. Never collect child identities or detailed learning histories centrally without a separate high-privacy design and legal review.
6. Deliver push notifications only behind authenticated admin endpoints with secrets stored in Cloudflare, not a public console.

Official references:
- England: https://www.gov.uk/government/publications/national-curriculum-in-england-primary-curriculum
- Wales: https://hwb.gov.wales/curriculum-for-wales
- Scotland: https://education.gov.scot/curriculum-for-excellence/curriculum-for-excellence-benchmarks/
- Northern Ireland: https://www.education-ni.gov.uk/articles/statutory-curriculum

No product can substantiate "better than everything on the market" without measured outcomes, user research and comparable evidence. Distinctiveness here is short home-and-community activities with an explanation/reflection step, explicit UK nation pathways, local-first progress and no streak pressure.

Validation: All new JS parsed successfully before deployment.
