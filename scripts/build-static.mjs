// Build only the public website into dist/ for Cloudflare Workers Static Assets.
// Never publish private API source, SQL, configuration, build scripts or Git files.
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");
const publicFiles = [
  "index.html",
  "visit-tracker.js",
  "speedy-plus.js",
  "maths-methods.js",
  "maths-workspace.js",
  "maths-workspace.css",
  "learning-sw.js",
  "learning-paths-data.js",
  "manifest.webmanifest",
  "privacy.html",
  "robots.txt",
  "sitemap.xml",
  "assets/speedy-icon.svg",
  "assets/speedy-world.css",
  "assets/speedy-world.js",
  "assets/speedy-pages.css",
  "assets/mascot-dash.svg",
  "assets/mascot-sum.svg",
  "assets/mascot-story.svg",
  "assets/mascot-scribble.svg",
  "assets/mascot-scout.svg",
  "assets/mascot-spark.svg",
  "console/index.html",
  "console/sw.js",
  "quests/index.html",
  "quests/quests.js",
  "quests/engine.js",
  "games/index.html",
  "games/maths-data.js",
  "games/arcade.js",
  "games/arcade.css",
  "games/expedition.js",
  "games/expedition.css"
];

rmSync(output, { recursive: true, force: true });
let totalBytes = 0;
for (const name of publicFiles) {
  const source = join(root, name);
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error("Missing required public asset: " + name);
  }
  const destination = join(output, name);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
  totalBytes += statSync(source).size;
}
console.log(
  "SpeedyLearning: prepared " + publicFiles.length +
  " public assets in dist/ (" + totalBytes + " bytes)."
);
console.log("Backend modules, database schema and secrets excluded from public assets.");
