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

## M4 — Bedrock + multi-platform SDK packaging (DONE)

- [x] **4a Unified JS interface**: `packages/core/create-world-generator.js`
  facade shared by web, CLI and finder; contract test `scripts/test-interface.mjs`
  (known-answer + platform seam)
- [x] **4b Bedrock**: research recorded in `docs/bedrock.md` (32-bit seed space,
  `String.hashCode` UTF-16, post-1.18 terrain convergence but structure/spawn
  divergence). Deliberately NOT implemented — `{ platform: "bedrock" }` fails
  loudly with a descriptive error; roadmap via `cubiomes-bedrock`
- [x] **4c Android**: NDK-build of `libseed_engine.so` for arm64-v8a/armeabi-v7a/
  x86_64 (exports verified with `nm -D`), JNI glue (`Java_com_seedmaps_*`),
  Kotlin `SeedWorldGen.kt`, host-testable impl core (`test-host.sh` smoke),
  and a host JVM run of the REAL glue + Kotlin facade (JDK + Kotlin installed
  in the environment)
- [x] **4c+ host-JVM JNI test**: `test-host.sh` builds `dist-host/libseed_engine.so`
  with the actual `Java_com_seedmaps_NativeEngine_*` exports, compiles
  `SeedWorldGen.kt` + `SeedWorldGenHostTest.kt` with kotlinc and runs the
  known-answer green on the JVM
- [x] **4c++ AAR + on-device test**: real `seedmaps-release.aar` (classes.jar +
  3 ABI jniLibs) built with Gradle 8.14.3 + AGP 8.13.2 + Kotlin 2.1.20 and ran
  on an x86_64 emulator — `SEEDMAPS_ONDEVICE=PASS` (14 / 49 / hi-half). Fixed
  bionic x86_64 gaps (`sincos`/`erf` missing from shared libm) by linking the
  NDK static libm.a for that ABI; committed AAR at
  `bindings/android/dist/aar/seedmaps-release.aar`
- [x] **4d Swift**: root-level SwiftPM package, `CSeedEngine` C module (symlinked
  sources, single-source header sync) + `SeedToolsCLI` example — built and RUN
  on Linux with output matching the golden file. XCFramework builds need an
  Apple SDK; engine C code is platform-neutral for it
- [x] **4e C#**: P/Invoke binding + sample in `bindings/csharp/` — now built and
  RUN (`.NET SDK 8` installed; `dotnet run` reproduces the golden anchors
  through `libseed_engine.so`: `C# SAMPLE PASSED`)
- [x] **4f** This file; every sub-milestone landed as its own commit

## M5 — Structure overlays + packaged features (DONE)

- [x] **5a Shared overlay engine**: `packages/core/structures.js`
  `structureOverlay()` walks each landmark type's structure-region grid (cell
  width = Cubiomes `getStructureRegionSize` in *chunk* units — block-space boxes
  are converted via `c0 = Math.floor(x/16)` before region indexing) and returns
  every attempted-generation position in the box together with its
  terrain/biome viability. Chunkbase-style: position + `viable` flag.
  - Correctness lock: `scripts/test-structures.mjs` freezes a 37-position,
    5-viable known-answer for seed 262 / 1.18 box (-1280,0)→(0,1440);
    determinism, and version-dependence vs 1.11 (village region 32→34)
- [x] **5b Web map overlay**: per-type checkboxes + legend chips; viable
  markers rendered as filled diamonds with white cores, attempts as hollow
  outlines; counts in status; `window.__seedmapOverlay` exposed for tests.
  Headless-Chrome asserts exact default-view markers (129, 13 viable) and
  that toggling a type off removes exactly its markers
- [x] **5c CLI**: `map --structures` (default on for overworld) stamps
  markers into the PPM (white = viable, grey = attempt) and reports the full
  marker list in JSON; golden pixel verified (igloo (-992,720) viable)
- [x] **5d Map navigation**: spawn-point marker (gold star: seed 262 1.18 →
  (420,-92)), drag-to-pan (origin offset = pixel delta), wheel-zoom cycling
  1/4/16 that keeps the block under the cursor fixed and stays in sync with
  the scale `<select>`, hover shows the structure/spawn label at exact
  blocks. Browser test drives zoom invariance and pan deltas end-to-end.
- [x] **5e Docs/README** above; `test:structures` wired into `npm test`

## Explicit non-goals

- Claiming support for a Minecraft version the engine does not model
- Silently mapping Bedrock seeds through Java generation
- Future snapshots before their algorithms exist in Cubiomes

## M6 — Performance, product polish, platform coverage (DONE)

- [x] **6a Parallel map rendering**: `apps/web/src/render-worker.js` runs its
  own WASM instance per worker; `generate()` splits the canvas into
  `min(4, h)` horizontal bands computed across a reusable `RenderPool`
  (epoch-guarded so superseded renders stop drawing), filling/blitting the
  ImageData as bands land; single-threaded `generateBiomes` fallback when
  Workers are unavailable. Output is bit-identical to the sync path — full
  browser suite green.
- [x] **6b Finder page upgrades**: map "Landmark finder" (per-type structure +
  radius, `nearestLandmark()` walks `structureOverlay` around spawn, prefers
  viable results, draws a white/pink target ring, exposes `__seedmapNearest`);
  finder results link `map → index.html#seed=<signed>` and the map page loads
  the hash on startup. Browser tests freeze the nearest-viable-village known
  answer (seed 262 spawn → (-800,-240), 1229 blocks) and the deep-link flow.
- [x] **6c Golden-regen health check**: `npm run test:golden-regen` regenerates
  `tests/golden/worlds.bin` to a temp path and asserts byte-identity with the
  committed file (deterministic, verified stable across runs); wired into
  `npm test`.
- [x] **6d Python binding**: `bindings/python/seedmaps.py` ctypes wrapper over
  the full `seed_engine` C ABI (version helpers, default context, thread-safe
  handle API incl. spawn); `run.sh` builds `libseed_engine.so` (same cc line
  as C#) and runs the known-answer sample (`PYTHON SAMPLE PASSED`:
  1.18==22, biome 14, handle spawn (420,-92), grid cells[0]==cells[63]==49);
  `test:python` in the chain.
- [x] **6e Bedrock roadmap**: audited the only public `cubiomes-bedrock`
  (fragrantresult186) by cloning it — it is upstream Java Cubiomes with a
  re-worded README (all generator.h history is Cubitect's; only incidental
  'bedrock' comments), NOT Bedrock support; no other public Bedrock generation
  library exists. `docs/bedrock.md` now carries the verified evaluation and an
  honest roadmap: Phase A = 1.18+ biome-only backend reusing the Java multi-
  noise source on sign-extended i32 seeds (gated to biome-matching versions),
  Phase B = structure candidates + BDS `locate` verification harness,
  Phase C = pre-1.18 / spawn = non-goal without independent re-engineering.

## Explicit non-goals
