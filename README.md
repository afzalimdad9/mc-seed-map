# Minecraft Seed Map + Seed Finder

Chunkbase-style **Seed Map** and **Seed Finder** sharing one world-generation engine.

| Layer | Technology |
|---|---|
| Generation core | [Cubiomes](https://github.com/Cubitect/cubiomes) (C, Minecraft Java) |
| Native build | CMake + GCC |
| Browser/CLI JS engine | Emscripten → WebAssembly |
| Frontend | Vanilla HTML/CSS/JS + Canvas |
| CLI | Node.js |
| Future targets | Kotlin (Android), Swift (iOS/macOS), C# (Windows) via shared C ABI |

## Vendored dependency

- **cubiomes**: `e61f90580cbdd883214a8054670dacae655e59c0` (MIT)

## Build (Linux)

```bash
# Native engine + smoke test
npm run build:native
npm run test:native

# WASM engine + Node test (requires emsdk: source ~/emsdk/emsdk_env.sh)
npm run build:wasm
npm run test:wasm

# Browser demo
npm run dev   # http://localhost:8080

# CLI
npm run cli -- biome --seed 262 --version 1.18 --x 0 --y 63 --z 0
```

## Version support policy

Cubiomes models **Minecraft Java Edition** biome/structure generation. Each MC version constant comes from the vendored headers (`enum MCVersion`). Bedrock requires a separate engine adapter (planned, not silently mapped to Java results). Unsupported versions are reported explicitly, never guessed.
