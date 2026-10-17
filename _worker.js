/**
 * SpeedyLearning Cloudflare Pages advanced-mode diagnostic.
 * If this is deployed as a Cloudflare Pages Worker, the endpoint
 * /api/worker-health must return a JSON response with worker: true.
 * All site pages continue to use existing static assets.
 */
export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/worker-health') {
      return new Response(JSON.stringify({
        worker: true,
        databaseConfigured: Boolean(env.DB),
        pushConfigured: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
      }), {
        status: 200,
        headers: {
          'Content-Type':'application/json; charset=utf-8',
          'Cache-Control':'no-store',
          'X-Content-Type-Options':'nosniff',
        }
      });
    }
    // Preserve current behaviour until the Worker and database are ready.
    return env.ASSETS.fetch(request);
  }
};
