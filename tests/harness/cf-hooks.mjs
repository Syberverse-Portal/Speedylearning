// Node module hooks: map Cloudflare's runtime module to a local shim and load the Worker sources as ES modules
export async function resolve(specifier, context, next) {
  if (specifier === "cloudflare:workers") return { url: new URL("./cf-workers-shim.mjs", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (/\/_worker\.js$|\/serverlib\/[^/]+\.js$/.test(url)) return next(url, { ...context, format: "module" });
  return next(url, context);
}
