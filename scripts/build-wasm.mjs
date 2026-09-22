import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

mkdirSync("wasm/dist", { recursive: true });

function resolveEmcc() {
  if (process.env.EMCC) return process.env.EMCC;
  const candidates = [
    path.join(homedir(), "emsdk/upstream/emscripten/emcc"),
    "/usr/bin/emcc",
    "/opt/emsdk/upstream/emscripten/emcc",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "emcc"; // rely on PATH
}

const emcc = resolveEmcc();
const cubiomesDir = "vendor/cubiomes";

// Matches upstream vendor/cubiomes/CMakeLists.txt source manifest.
const cubiomesSources = [
  "finders.c",
  "generator.c",
  "layers.c",
  "biomenoise.c",
  "biomes.c",
  "noise.c",
  "util.c",
  "quadbase.c",
].map((f) => `${cubiomesDir}/${f}`);

const sources = [
  ...cubiomesSources,
  "engine/src/seed_engine.c",
  "engine/src/wasm_bindings.c",
];

const exported = [
  "_malloc",
  "_free",
  "_wasm_init",
  "_wasm_get_biome",
  "_wasm_generate_biomes",
  "_wasm_biome_name_length",
  "_wasm_biome_name_ptr",
  "_wasm_mc_name_length",
  "_wasm_mc_name_ptr",
  "_wasm_structure_pos",
  "_wasm_structure_viable",
  "_wasm_slime_chunk",
  "_wasm_version_1_18",
  "_wasm_version_1_21",
  "_wasm_version_newest",
  "_wasm_structure_village",
  "_wasm_structure_desert_pyramid",
  "_wasm_structure_ancient_city",
  "_wasm_create",
  "_wasm_destroy",
  "_wasm_ctx_get_biome",
  "_wasm_ctx_generate_biomes",
  "_wasm_ctx_structure_viable",
  "_wasm_ctx_get_spawn",
  "_wasm_ctx_estimate_spawn",
  "_wasm_structure_name_length",
  "_wasm_structure_name_ptr",
  "_wasm_biome_colors",
];

const args = [
  ...sources,
  "-Iengine/include",
  "-Ivendor/cubiomes",
  "-O3",
  "-fwrapv",
  "-sWASM=1",
  "-sMODULARIZE=1",
  "-sEXPORT_ES6=1",
  "-sENVIRONMENT=web,worker,node",
  "-sALLOW_MEMORY_GROWTH=1",
  `-sEXPORTED_FUNCTIONS=[${exported.join(",")}]`,
  "-sEXPORTED_RUNTIME_METHODS=[ccall,cwrap,UTF8ToString,getValue,setValue,HEAP32,HEAPU8]",
  "-o",
  "wasm/dist/seed_engine.js",
];

console.log("Building Cubiomes WASM with", emcc);
execFileSync(emcc, args, { stdio: "inherit" });
console.log("WASM build complete -> wasm/dist/seed_engine.{js,wasm}");
