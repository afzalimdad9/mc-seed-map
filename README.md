# Minecraft Seed Map + Seed Finder

Chunkbase-style **Seed Map** and **Seed Finder** sharing one world-generation engine.

| Layer | Technology |
|---|---|
| Generation core | [Cubiomes](https://github.com/Cubitect/cubiomes) (C, Minecraft **Java** Edition) |
| Native build | CMake + GCC → `libseed_engine.a` |
| Browser/CLI engine | Emscripten → WebAssembly |
| Frontend | Vanilla HTML/CSS/JS + Canvas (Web Worker parallel rendering) |
| CLI | Node.js |
| Ports | Android (JNI/AAR, on-device verified), Swift CLI, C# P/Invoke, Python ctypes — all via the same C ABI |

## Status

See [`docs/MILESTONES.md`](docs/MILESTONES.md). **M1–M6 are done:** verified
Java engine (native + WASM), browser seed map with structure overlays,
spawn + pan + zoom + landmark finder, seed finder (CLI + web), version
registry, golden-file regression, and working Android / Swift / C# / Python
bindings. Bedrock is deliberately unsupported — `docs/bedrock.md` carries the
verified evaluation and roadmap.

## Quick start (Linux)

Prereqs: `gcc`, `cmake`, `node` ≥ 20, [Emscripten SDK](https://emscripten.org) at `~/emsdk` (auto-detected).

```bash
# Full pipeline: native build+test, WASM build+test
npm test

# Browser seed map
npm run dev
# open http://localhost:8080/apps/web/index.html

# CLI
npm run cli -- biome --seed 262 --version 1.18 --x 0 --y 63 --z 0
npm run cli -- map --seed 262 --version 1.18 --size 64 --out map.ppm
npm run cli -- map --seed 262 --version 1.18 --size 128 --structures --out map.ppm
npm run cli -- find --version 1.18 --count 5 --structure village --reg-radius 4
npm run cli -- versions
```

The browser seed map specialises like Chunkbase: structure overlays with
per-type toggles (viable vs attempt-only markers), a spawn-point marker,
hover labels at the exact structure/spawn block, drag-to-pan and
wheel-zoom that stays anchored to the block under the cursor — rendered in
parallel across Web Workers. A "Landmark finder" searches the nearest viable
structure to spawn (with a target ring on the map), and seed-finder results
link straight to the map via `#seed=…`. `map --structures` stamps the same
markers into the PPM and reports them as JSON; use `--no-structures` to skip.

```bash
# Python binding (builds libseed_engine.so + known-answer sample)
npm run test:python
```

`wasm/` is a publishable npm package (`seedmaps-engine-wasm`) exposing the
raw WASM engine; `npm publish ./wasm` publishes the tarball.
GitHub Actions CI (`.github/workflows/ci.yml`) builds and tests on Linux
(full core suite incl. all bindings), macOS (native, WASM, Swift, Apple
XCFramework artifact), Windows (MinGW native, C#, Python) and Android (SDK +
AAR) on every push; a manual `workflow_dispatch` "ports" job additionally runs
the Android on-device emulator test.

## Validated reference

| Check | Expected | Result |
|---|---|---|
| MC 1.18 seed 262 @ (0,63,0) | `mushroom_fields` (14) | ✅ native + WASM |
| Village attempt region (0,0), seed 262 | (192, 208) | ✅ native + WASM |
| Region gen 16×16 scale 4 | 256 valid cells | ✅ |
| Browser canvas render | non-empty biome image | ✅ headless Chrome |

## Layout

```
engine/          C ABI wrapper (seed_engine.h/.c) + WASM bindings + native test
vendor/cubiomes/ pinned e61f905 (MIT)
wasm/dist/       build artifacts (gitignored)
packages/core/   shared seed parsing / FFI helpers / structure overlay
packages/java/   JS WorldGenerator (WASM) + version registry
packages/finder/ composable filters + search engine (Node/CLI/browser)
apps/web/        Seed Map (canvas, worker-rendered) + Seed Finder
apps/cli/        CLI (biome / map / find / versions)
bindings/        android / swift / csharp / python port bindings
scripts/         build-wasm.mjs + test suites (browser / wasm / golden / …)
docs/            milestones + bedrock evaluation / roadmap
```

## Version support policy

- Cubiomes models **Minecraft Java** biome/structure generation only.
- Version enums (`MC_1_18=22`, …) are read from the compiled WASM at runtime — never hardcoded in JS.
- **Bedrock**: no public Bedrock generation library exists — `docs/bedrock.md` documents the audited `cubiomes-bedrock` (upstream Java, re-worded) and the phased roadmap; Java results are never reused for Bedrock seeds.
- Unsupported versions fail explicitly; we never guess.
