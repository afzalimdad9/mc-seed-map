# Changelog

All milestone notes follow `npm test` (the full gate: native → wasm →
finder → structures → versions → golden → golden-regen → wasm-pack →
browser → interface → android (host JVM) → android on-device → build:aar →
swift → csharp → python). See `docs/MILESTONES.md` for the complete picture.

## [0.1.0] — 2026-09-23

Initial release: milestones M1–M6 plus the packaging/CI polish. Each milestone
is also tagged in git (`m1` … `m6`); `v0.1.0` points at this commit.

### M1 — Working generation engine
- Vendored Cubiomes (pinned `e61f905`, MIT); shared C ABI `engine/include/
  seed_engine.h` (biomes, regions, structures, slime, spawn).
- Native CMake build + smoke (seed 262 1.18 → `mushroom_fields` 14), Emscripten
  WASM build, JS `WorldGenerator` wrapper with the 64-bit seed as two uint32
  halves (reassembled `(hi<<32)|lo`), runtime version registry read from WASM.
- Browser seed map (canvas, legend, hover, structure search) verified headless;
  CLI `biome` / `map` / `find` / `versions`.

### M2 — Seed Finder product + deeper engine
- Thread-safe handle-based generator (`create/set_seed/get_*_ctx`), accurate +
  estimate spawn, viability filtering, composable filter engine
  (`and`/`or`/`not`), CLI worker-parallel search with progress + cancel,
  browser finder with a Web Worker pool, full structure enum + region sizes +
  biome-id lookup via WASM, live Cubiomes biome palette.

### M3 — Version correctness
- Full `MCVersion` enum + string parsing via WASM (no hardcoded list), a
  historical validation matrix 1.0–1.20 matching upstream Cubiomes hashes
  byte-for-byte, Nether/End rendering (`--dimension` + web select), golden-file
  regression (native == WASM byte-identical).

### M4 — Multi-platform packaging
- Unified `WorldGenerator` facade (`createWorldGenerator`) with a platform seam;
  Android JNI binding (NDK, 3 ABIs, Kotlin facade, host JVM + real on-device
  emulator PASS, committed AAR), SwiftPM CLI RUN on Linux, C# P/Invoke sample
  PASSED on .NET 8, Bedrock rejection seam + evaluation (`docs/bedrock.md`).

### M5 — Structure overlays + map navigation
- Shared `structureOverlay` engine walking per-type region grids (region width
  in chunks; block boxes converted via `c0 = Math.floor(x/16)`), web overlay
  with per-type toggles + legend (129 markers / 13 viable on the default view),
  CLI `map --structures` PPM stamps + JSON list, spawn marker, drag-to-pan,
  cursor-anchored wheel zoom (1/4/16), hover labels; frozen 37/5 known-answer
  regression (`test-structures.mjs`).

### M6 — Performance, product polish, platform coverage
- Parallel map rendering: Web Worker pool splits the canvas into horizontal
  bands (epoch-guarded, sync fallback; bit-identical to single-threaded).
- Landmark finder (nearest viable structure to spawn + target ring) and
  `#seed=` deep links from finder results to the map.
- Golden-regen health check (`test:golden-regen`).
- Python ctypes binding (`bindings/python`, known-answer sample PASSED).
- Bedrock evaluation: audited `cubiomes-bedrock` by cloning — it is upstream
  Java Cubiomes with a re-worded README, not Bedrock support; documented the
  verified state and an honest Phase A/B/C roadmap (`docs/bedrock.md`).

### Packaging / CI polish
- `build:aar` fixed (its `cd ../..` landed in `bindings/`, never the repo root)
  and wired into `npm test`; AAR jars are byte-deterministic so the committed
  artifact stays in sync.
- `wasm/` published as `@seedmaps/engine-wasm` (files `dist` + `prepack`
  rebuild; `npm pack` verified by installing the tarball in a scratch project);
  `test:wasm-pack` in the chain.
- GitHub Actions CI: `core` job runs the full cross-platform suite on every
  push; a manual `ports` job (workflow_dispatch) adds Swift + Android
  SDK/AAR/on-device surfaces.
- `sdk/README.md` status table refreshed to actual (all bindings working).
- Root `LICENSE` (MIT) with third-party attribution; milestone git tags.

### Known limitations
- Apple XCFramework and on-device CI need Apple/Android hosts (`bindings/apple/
  xcframework.sh` draft, workflow `ports` job).
- Bedrock is out of scope without independent reverse-engineering (`docs/
  bedrock.md`).
- No `git remote` is configured; tags are local until pushed.