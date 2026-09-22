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
         (Node N-API  (ES module)  apps      (Swift)        (Kotlin)
          or WASM)
```

## Targets

| Target | Language UI | Engine linkage | Status |
|---|---|---|---|
| Web | HTML/CSS/JS | WASM (`wasm/dist/seed_engine.js`) | **Working (M1)** |
| CLI | Node.js | WASM via Node | **Working (M1)** |
| Linux native | C | `libseed_engine.a` | **Working (M1)** |
| Android | Kotlin | JNI → `libseed_engine.so` (NDK) | Planned (M2) |
| iOS / macOS | Swift | SwiftPM / XCFramework | Planned (M2) |
| Windows | C# / C++ | P/Invoke → `seed_engine.dll` | Planned (M2) |
| Bedrock engine | (shared UIs) | Separate adapter | Research |

## ABI rules

1. Never change `seed_engine.h` signatures without a version bump.
2. 64-bit seeds cross FFI as two `uint32` halves or as a hex string —
   never as a double/float.
3. Returned `const char *` pointers are static; do not free.
4. All functions are re-entrant **except** the single global generator
   context; one init→query cycle per thread/process until we add
   `seed_engine_create()`/`seed_engine_destroy()` handles (planned M2).

## JNI / Swift / P/Invoke sketch (M2)

```c
// Shared: every platform only wraps these
int  seed_engine_init(int mc, int dim, uint64_t seed);
int  seed_engine_get_biome(int scale, int x, int y, int z);
int  seed_engine_generate_biomes(int x, int z, int w, int h, int scale, int y, int *out);
```

```kotlin
// Android (planned)
external fun init(mc: Int, dim: Int, seedLo: Long, seedHi: Long): Int
```

```swift
// iOS (planned)
func seedEngineGetBiome(scale: Int32, x: Int32, y: Int32, z: Int32) -> Int32
```

```csharp
// Windows (planned)
[DllImport("seed_engine")] static extern int seed_engine_get_biome(...);
```

## Building the shared library

```bash
cmake -S . -B build/native
cmake --build build/native
# artifacts: build/native/libseed_engine.a, build/native/libcubiomes.a
```

Android/iOS/Windows toolchains consume the same `engine/src` + `vendor/cubiomes`
sources via their own CMake/Gradle/Xcode projects (to be added under `sdk/`).
