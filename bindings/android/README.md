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
- `build-host.sh` + `kotlin/SeedWorldGenHostTest.kt` — build a host (x86_64)
  shared lib that includes the **real JNI glue**, then load it from a host JVM
  through the real Kotlin facade. Requires a JDK (`$JAVA_HOME`, default
  `~/.local/share/jdk`) and `kotlinc` (`$KOTLINC`, default
  `~/.local/share/kotlinc/kotlinc/bin/kotlinc`).

## Build

```sh
./bindings/android/build-android.sh     # needs ANDROID_HOME with an NDK
npm run build:native && bindings/android/test-host.sh
```

Produces `bindings/android/dist/{arm64-v8a,armeabi-v7a,x86_64}/libseed_engine.so`
(jniLibs layout) plus `dist-host/libseed_engine.so` for the host-JVM test.
Verified: every ABI is the correct ELF class/machine and exports all 8
`Java_com_seedmaps_NativeEngine_*` symbols.

## Seed ABI

Seeds are 64-bit and cross as two 32-bit halves `(lo, hi)` with
`seed = (hi << 32) | lo` — identical to `packages/java/engine.js`
(`JavaWorldGenerator.splitSeed`), and to the WASM binding. A seed reproduced
here equals a seed reproduced in the web app or CLI.

## Status

- Native `.so` for 3 ABIs: built + exported-symbol verified; x86_64 links
  static `libm.a` (bionic shared libm lacks `sincos`/`erf`, found via emulator
  `UnsatisfiedLinkError`).
- Impl layer correctness: host-tested.
- JNI/Kotlin runtime path: **host-JVM tested** — `test-host.sh` loads the JNI
  glue via `System.loadLibrary` and gets green known-answers through the real
  Kotlin facade (`ANDROID KOTLIN + JNI TEST PASSED`).
- **On-device tested**: AAR (`dist/aar/seedmaps-release.aar`) + test APK run on
  an x86_64 emulator (Android 17/API 37): `SEEDMAPS_ONDEVICE=PASS` with the
  exact WASM/CLI anchors (14, 49, hi-half divergence) — `test-device.sh`.