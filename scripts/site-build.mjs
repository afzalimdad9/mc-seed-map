/**
 * Assembles the static deploy tree for Vercel into ./out:
 *
 *   out/apps/web/            map + finder UIs (index.html, finder.html, src/)
 *   out/packages/{core,finder,java}/   shared ESM modules (import chains are
 *                                      repo-root-relative, so the subtree is
 *                                      mirrored rather than flattened)
 *   out/wasm/dist/           seed_engine.js glue + seed_engine.wasm (the glue
 *                            resolves the .wasm via import.meta.url, so it
 *                            must live beside the .js)
 *
 * The Emscripten WASM is built by `npm run build:wasm` (needs emcc) and is
 * gitignored, so site-build only consumes it — deploy via the Vercel CLI from
 * a machine/workflow that already built it.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "out");

const WASM_GLUE = join(ROOT, "wasm", "dist", "seed_engine.js");
const WASM_BIN = join(ROOT, "wasm", "dist", "seed_engine.wasm");
if (!existsSync(WASM_GLUE) || !existsSync(WASM_BIN)) {
  console.error(
    "site-build: wasm/dist is missing. Run `npm run build:wasm` (requires emcc) first.",
  );
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const rel of ["apps/web", "packages/core", "packages/finder", "packages/java", "wasm/dist"]) {
  cpSync(join(ROOT, rel), join(OUT, rel), { recursive: true });
}

// Root redirect so https://<project>.vercel.app/ lands on the map.
writeFileSync(
  join(OUT, "index.html"),
  "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\" />" +
    "<meta http-equiv=\"refresh\" content=\"0;url=./apps/web/index.html\" />" +
    "<title>Seed Map</title></head><body>" +
    "<p>Redirecting to <a href=\"./apps/web/index.html\">the seed map</a>…</p>" +
    "</body></html>\n",
);

console.log(`site-build: wrote ${OUT}`);