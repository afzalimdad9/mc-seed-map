# Milestone Status

## M1 — Working generation engine (DONE)

- [x] Vendored Cubiomes pinned `e61f90580cbdd883214a8054670dacae655e59c0`
- [x] C wrapper `engine/include/seed_engine.h` (biomes, regions, structures, slime)
- [x] Native CMake build + smoke test
  - MC 1.18 seed 262 → `mushroom_fields` (id 14) at (0,63,0)
- [x] Emscripten WASM build (`scripts/build-wasm.mjs`)
- [x] JS wrapper `packages/java/engine.js` (64-bit seed split ABI)
- [x] Runtime version registry (`packages/java/versions.js`) — enums read from WASM
- [x] Node WASM test — matches native (village 192,208)
- [x] Browser seed map (canvas, legend, hover, structure search) — headless Chrome verified
- [x] CLI: `biome`, `map`, `find`, `versions`

## M2 — Seed Finder product + deeper engine (DONE)

- [x] Handle-based generator API (thread-safe, reusable `setSeed` per scan)
- [x] Spawn position support (`getSpawn` / `estimateSpawn`)
- [x] Viability filtering (`isViableStructurePos`) in finder
- [x] Composable filter engine (biome radius, structure distance, slime, spawn)
  - `packages/finder/filters.js` — `and`/`or`/`not`, descriptors shared by
    CLI, Node workers and browser Web Workers
- [x] Search engine with progress + cancel (`packages/finder/search.js`)
  - validated: 1.18 seed 262 ↔ `mushroom_fields` at origin
- [x] Web Worker pool for browser search (`finder.html` + `src/finder.js`)
  - headless-Chrome verified (`scripts/test-browser.mjs`)
- [x] Worker/parallel CLI search with progress + cancel (`find --workers`)
- [x] Full structure enum + region sizes + biome-id lookup via WASM
- [x] Biome colors: full Cubiomes palette (`initBiomeColors`)
- [x] StructureName via WASM (`struct2str`)

## M3 — Historical versions + validation matrix (DONE)

- [x] Full MCVersion enum exposed from WASM (MC_B1_7 → MC_NEWEST); dynamic
  version registry `packages/java/versions.js` — no hardcoded version list in JS
- [x] Version label parsing mirrored from Cubiomes `str2mc` (`1.18`, `1.21 WD`,
  `1.20.6`, …) with `registry.find()` + `versionFromString()` in CLI/web
- [x] Validation matrix `scripts/test-versions.mjs`: 14 versions (1.0–1.20)
  reproduce upstream Cubiomes biome-grid hashes (`tests.c` constants) byte-exactly
- [x] Snapshot policy: Cubiomes models releases only — we expose exactly the enum;
  no invented snapshot aliases
- [x] Nether / End map rendering — web dimension select, CLI `--dimension`,
  per-dimension scale defaults (1:1 nether/end), `getBiomeAt` y-coordinate
  consistent at scale 4 (y=15) vs scale 1 (y=63)
- [x] Golden-file regression: native `golden_dump` → `tests/golden/worlds.bin`
  replayed through WASM byte-identical (10 records × versions/dims/seeds)
- [x] Engine fix: bulk `generate_biomes_ctx` allocates `getMinCacheSize` scratch
  internally (layered iterators read cache tail, e.g. `mapRiverMix` at `out + w*h`);
  pre-1.18 bulk generation was memory-unsafe for caller-sized output buffers

## M4 — Bedrock + multi-platform SDK packaging

- [ ] Bedrock engine research + adapter behind same `WorldGenerator` interface
- [ ] Android Kotlin AAR (JNI)
- [ ] iOS/macOS Swift XCFramework
- [ ] Windows C# P/Invoke package
- [ ] Unified `WorldGenerator` JS interface used by web + CLI

## Explicit non-goals

- Claiming support for a Minecraft version the engine does not model
- Silently mapping Bedrock seeds through Java generation
- Future snapshots before their algorithms exist in Cubiomes
