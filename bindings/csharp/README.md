# C# (.NET) binding — P/Invoke

Thin `[DllImport]` binding to the same C ABI the WASM / Android / Swift
bindings use (`engine/include/seed_engine.h`).

- `SeedEngine.cs` — static P/Invoke wrapper: version queries, single & bulk
  biome generation, biome/MC-name helpers. Wide 64-bit seeds pass naturally
  (no 32-bit-half splitting needed, unlike the JS/WASM FFI).
- `Program.cs` + `Sample` — the shared known-answer: `1.18` → enum 22, seed
  262 1.18 at (0,63,0) → `mushroom_fields` (14), and a 64×48 bulk grid whose
  first cell must equal the golden file's (49).

## Status: source-only, NOT compiled here

This environment has no .NET SDK or Mono, so nothing under this directory has
been built or run. The source is written against the committed header and the
golden expectations so that the intended unit becomes:
`dotnet run` after pointing `Lib` at a built `libseed_engine` (gcc `-shared`
build of `engine/src/*.c` + `vendor/cubiomes/*.c`, or `npm run build:native`).

Expected output once built (from the shared ABI contract):

```
seed 262 1.18 (0,63,0) -> 14 (mushroom_fields)
64x48 grid, cells[0] = 49
C# SAMPLE PASSED
```