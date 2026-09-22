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

## M3 — Historical versions + validation matrix

- [ ] Test seeds for MC 1.7 / 1.12 / 1.16 / 1.17 / 1.18 / 1.19 / 1.20 / 1.21
- [ ] Snapshot enum exposure (only what Cubiomes models)
- [ ] Nether / End map rendering
- [ ] Golden-file regression tests (native vs WASM byte-identical)

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
