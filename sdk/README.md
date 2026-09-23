# Multi-Platform SDK Strategy

All native targets link the **same C ABI** (`engine/include/seed_engine.h`).
Only thin FFI/bindings layers are platform-specific.

```
                    ┌─────────────────────────────┐
                    │   seed_engine.h (stable C)  │
                    │  biomes · regions · structs │
                    └──────────────┬──────────────┘
           ┌───────────┬───────────┼───────────┬──────────────┐
           ▼           ▼           ▼           ▼              ▼
      libseed_     seed_engine   seed_engine  seed_engine   seed_engine
      engine.a     .wasm         .so/.dll     XCFramework   .aar
      (static)     (Emscripten)  (CMake)      (Swift/Clang)  (NDK/CMake)
           │           │           │           │              │
           ▼           ▼           ▼           ▼              ▼
         CLI/Node    Web/JS      Linux C    iOS/macOS      Android
         (Node)      (ES module)  apps      (Swift)        (Kotlin/JNI)
```

## Targets — actual status (M6)

| Target | UI language | Engine linkage | Status |
|---|---|---|---|
| Web | HTML/CSS/JS | WASM (`wasm/dist/seed_engine.js`) | **Working (M1)** |
| CLI | Node.js | WASM via Node | **Working (M1)** |
| Linux native | C | `libseed_engine.a` | **Working (M1)** |
| Android | Kotlin | JNI → `libseed_engine.so` (NDK, 3 ABIs) | **Working (M4)** — host JVM suite + on-device emulator PASS; release AAR in `bindings/android/dist/aar/` |
| iOS / macOS | Swift | SwiftPM CLI | **Working (M4)** — CLI runs on Linux; XCFramework build still needs an Apple SDK host |
| Windows / .NET | C# | P/Invoke → `seed_engine.dll` | **Working (M4)** — `C# SAMPLE PASSED` on .NET 8 (Linux) |
| Python | Python | ctypes → `libseed_engine.so` | **Working (M6)** — `PYTHON SAMPLE PASSED` |
| **Bedrock** engine | (shared UIs) | Separate adapter | **No public bedrock library exists** — verified eval + roadmap in `docs/bedrock.md` |

## ABI rules

1. Never change `seed_engine.h` signatures without a version bump.
2. Seeds cross FFI as `uint64` on unmanaged ABI (C# / Python / Swift / JNI);
   JS/WASM still passes them split as two `uint32` halves (the JS facade
   reassembles `(hi<<32)|lo`). Never as a double/float.
3. Returned `const char *` pointers are static; do not free.
4. `seed_engine_init()` is a single shared default context; use the handle
   API (`seed_engine_create/destroy/set_seed/get_*_ctx`) for concurrency —
   each worker/thread gets an independent `Generator`.

## What every binding wraps (seed_engine.h)

```c
// versions — read enum values from the engine, never hardcode in JS
int  seed_engine_version_from_string(const char *label);
int  seed_engine_version_1_18(void);

// default (single) context
int  seed_engine_init(int mc, int dim, uint64_t seed);
int  seed_engine_get_biome(int scale, int x, int y, int z);
int  seed_engine_generate_biomes(int x, int z, int w, int h, int scale, int y, int *out);

// handle-based, thread-safe API
SeedEngineCtx *seed_engine_create(int mc, int dim, uint64_t seed);
int  seed_engine_generate_biomes_ctx(SeedEngineCtx*, int x, int z, int w, int h, int scale, int y, int *out);
int  seed_engine_get_spawn_ctx(SeedEngineCtx*, int *out_x, int *out_z);
```

Landing bindings: `bindings/{android,swift,csharp,python}`, each with its own
`run.sh` wired into `npm test` and reproducing the same known answers
(M4/M6).

## Building the shared libraries

```bash
cmake -S . -B build/native
cmake --build build/native
# artifacts: build/native/libseed_engine.a, build/native/libcubiomes.a

# plain unmanaged .so (C# / Python)
bash bindings/csharp/run.sh   # builds bindings/csharp/lib/libseed_engine.so
bash bindings/python/run.sh   # builds bindings/python/lib/libseed_engine.so

# Android per-ABI .so + AAR
./bindings/android/build-android.sh        # dist/{arm64-v8a,armeabi-v7a,x86_64}/
npm run build:aar                          # bindings/android/dist/aar/seedmaps-release.aar
```