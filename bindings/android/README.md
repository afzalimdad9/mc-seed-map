# Android binding (JNI)

Native bridge exposing the seed map C engine to Android via JNI.

## Layout

- `include/seed_engine_jni_impl.h`, `src/seed_engine_jni_impl.c` — the whole
  binding logic, kept free of `<jni.h>` so it is fully testable on the host.
- `src/seed_engine_android.c` — thin JNI glue (`Java_com_seedmaps_NativeEngine_*`),
  conversions only.
- `kotlin/SeedWorldGen.kt` — high-level Kotlin facade (native lib loaded from
  `libseed_engine.so` under `jniLibs`).
- `tests/impl_smoke.c` + `test-host.sh` — host test for the impl layer.
- `build-android.sh` — NDK cross-build to `dist/<abi>/libseed_engine.so`.

## Build

```sh
./bindings/android/build-android.sh     # needs ANDROID_HOME with an NDK
npm run build:native && bindings/android/test-host.sh
```

Produces `bindings/android/dist/{arm64-v8a,armeabi-v7a,x86_64}/libseed_engine.so`
(jniLibs layout). Verified: every ABI is the correct ELF class/machine and
exports all 8 `Java_com_seedmaps_NativeEngine_*` symbols.

## Seed ABI

Seeds are 64-bit and cross as two 32-bit halves `(lo, hi)` with
`seed = (hi << 32) | lo` — identical to `packages/java/engine.js`
(`JavaWorldGenerator.splitSeed`), and to the WASM binding. A seed reproduced
here equals a seed reproduced in the web app or CLI.

## Status

- Native `.so` for 3 ABIs: built + exported-symbol verified.
- Impl layer correctness: host-tested (`seed 262 → mushroom_fields(14)` anchor).
- JNI/Kotlin runtime path: **not executed here** (no JVM/JDK in this
  environment). Wiring class/method names must match `com.seedmaps.NativeEngine`.