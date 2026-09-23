# C# (.NET) binding — P/Invoke

Thin `[DllImport]` binding to the same C ABI the WASM / Android / Swift
bindings use (`engine/include/seed_engine.h`).

- `SeedEngine.cs` — static P/Invoke wrapper: version queries, single & bulk
  biome generation, biome/MC-name helpers. Wide 64-bit seeds pass naturally
  (no 32-bit-half splitting needed, unlike the JS/WASM FFI).
- `Program.cs` + `Sample` — the shared known-answer: `1.18` → enum 22, seed
  262 1.18 at (0,63,0) → `mushroom_fields` (14), and a 64×48 bulk grid whose
  first cell must equal the golden file's (49).

## Status

**Built and running.** `.NET SDK 8.0.425` is installed at
`~/.local/share/dotnet` in this environment; `bindings/csharp/run.sh` builds a
plain `libseed_engine.so` (`-shared -fPIC`, no JNI) next to the project and
runs the P/Invoke sample on the JIT runtime. Observed output:

```
seed 262 1.18 (0,63,0) -> 14 (mushroom_fields)
64x48 grid, cells[0] = 49
C# SAMPLE PASSED
```

Wire into CI with `npm run test:csharp`.