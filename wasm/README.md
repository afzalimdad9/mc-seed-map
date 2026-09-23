# seedmaps-engine-wasm

Cubiomes-generated Minecraft **Java Edition** engine compiled to WebAssembly:
biome queries, rectangular biome dumps, structure positions/viability, spawn,
slime chunks and the version enums — the `seed_engine` C ABI (`engine/include/
seed_engine.h`) exported per `engine/src/wasm_bindings.c`.

Single-file Emscripten loader + one `.wasm`; works in Node, browsers and
Web Workers. It locates `seed_engine.wasm` relative to its own
`import.meta.url`, so a plain `npm install` just works.

## Install

```bash
npm install seedmaps-engine-wasm
```

## Use (raw module)

```js
import createModule from "seedmaps-engine-wasm";

const m = await createModule();
// Seeds cross ABI as two uint32 halves: seed = (hi << 32) | lo
```

The exposed exports are the `_wasm_*` functions Emscripten names after the C
`wasm_*` bindings (e.g. `m._wasm_init`, `m._wasm_generate_biomes`,
`m._wasm_ctx_create`, `m._wasm_version_from_string`).

## Use (high-level facade)

`packages/java/engine.js` in the source repo wraps this module behind a
`WorldGenerator` with a version registry, seed parsing and Int32Array
output; the web seed map / finder / CLI are built on it. The package itself
ships the raw engine so consumers can wrap it however they like.

## Build / package

```bash
npm run build          # rebuild wasm/dist from engine/src + vendor/cubiomes
npm pack               # tarball containing wasm/dist (prepack rebuilds)
```

Notes: Emscripten SDK is detected via `$EMCC`, `~/emsdk/upstream/emscripten/
emcc`, `/usr/bin/emcc` or PATH (see `scripts/build-wasm.mjs`). MIT licensed,
includes attributions to Cubiomes (MIT, Cubitect).