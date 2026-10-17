# Speedy Learning

A learning game for UK primary school children (Reception to Year 6): quizzes for every National Curriculum subject, maths, spelling, reading, stories, writing, Year 6 SATs practice, progress tracking and a Parents' Corner.

The whole game is one file: `index.html`.

## Publish on Cloudflare Pages
Workers & Pages → Create → Pages → Connect to Git → this repository and branch.
Build command: leave empty. Build output directory: `/`.
Then add the custom domains `www.speedylearning.co.uk` and `speedylearning.co.uk`.

## Optional AI helper
`cloudflare/speedy-helper-worker.js` is a Cloudflare Worker for the "What does this mean?" chat. Set its address as `HELPER_URL` in `index.html`.
