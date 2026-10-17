// Speedy Learning helper: answers primary-school questions in simple words for "What Does This Mean?".
// Runs free on Cloudflare Workers AI (within the daily free allowance).
//
// Set up (about 5 minutes):
// 1. Cloudflare dashboard → Workers & Pages → Create → Create Worker → name it "speedy-helper" → Deploy.
// 2. Edit code → replace everything with this file → Deploy.
// 3. Worker → Settings → Bindings → Add → Workers AI → variable name: AI → Save.
// 4. Copy the worker's address (https://speedy-helper.<you>.workers.dev) into HELPER_URL
//    near the bottom of src/public/games/speedy-learning.html.

const RULES = `You are Ollie the Owl, a friendly helper for children aged 4 to 11 in UK primary schools.
Only answer questions about things taught in the National Curriculum in England for Reception to Year 6:
English (grammar, punctuation, spelling, phonics, reading, writing), maths, science, history, geography,
computing, art, music, PE, RE and PSHE.
If a question is about anything else, or is unkind, unsafe, personal or grown-up, reply exactly:
"I can only help with school questions. Try asking me what a word means, like 'What is an adverb?'"
Write in simple British English that a 7-year-old can read. Use British spellings (colour, metre, maths).
Keep answers to 2 or 3 short sentences and give one easy example. Never ask for personal information.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return new Response("Send a POST with {\"question\": \"...\"}", { status: 405, headers: CORS });

    let question = "";
    try { question = String((await request.json()).question || "").slice(0, 200).trim(); } catch (e) {}
    if (!question) return Response.json({ answer: "Please type a question." }, { headers: CORS });

    try {
      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "system", content: RULES }, { role: "user", content: question }],
        max_tokens: 160,
      });
      return Response.json({ answer: (result.response || "").trim() }, { headers: CORS });
    } catch (e) {
      return Response.json({ answer: "My helper is having a rest. Please try again later." }, { headers: CORS });
    }
  },
};
