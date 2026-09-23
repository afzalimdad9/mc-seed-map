# Minecraft Seed Map + Seed Finder

Chunkbase-style **Seed Map** and **Seed Finder** sharing one world-generation engine.

| Layer | Technology |
|---|---|
| Generation core | [Cubiomes](https://github.com/Cubitect/cubiomes) (C, Minecraft **Java** Edition) |
| Native build | CMake + GCC → `libseed_engine.a` |
| Browser/CLI engine | Emscripten → WebAssembly |
| Frontend | Vanilla HTML/CSS/JS + Canvas |
| CLI | Node.js |
| Future targets | Kotlin (Android), Swift (iOS/macOS), C# (Windows) via the same C ABI — see [`sdk/README.md`](sdk/README.md) |

## Status

See [`docs/MILESTONES.md`](docs/MILESTONES.md). **M1 is done:** native + WASM engine, browser map, CLI — all cross-validated.

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
wheel-zoom that stays anchored to the block under the cursor. `map
--structures` stamps the same markers into the PPM and reports them as
JSON; use `--no-structures` to skip.

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
packages/core/   shared seed parsing / FFI helpers
packages/java/   JS WorldGenerator (WASM) + version registry
apps/web/        Seed Map (canvas)
apps/cli/        CLI (biome / map / find / versions)
scripts/         build-wasm.mjs, test-wasm.mjs
sdk/             multi-platform packaging strategy
docs/            milestones + support policy
```

## Version support policy

- Cubiomes models **Minecraft Java** biome/structure generation only.
- Version enums (`MC_1_18=22`, …) are read from the compiled WASM at runtime — never hardcoded in JS.
- **Bedrock** requires a separate engine adapter; Java results are never reused for Bedrock seeds.
- Unsupported versions fail explicitly; we never guess.
