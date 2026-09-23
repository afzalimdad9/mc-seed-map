# Android AAR packaging + on-device test

Builds `com.seedmaps` as a real Android library archive (AAR):

- `seedmaps/` — library module: `kotlin/SeedWorldGen.kt` facade (single source,
  shared with the host tests) + the NDK-built per-ABI `libseed_engine.so`
  from `../../dist` as `jniLibs`.
- `app/` — instrumentation-free on-device known-answer runner: installs,
  starts `MainActivity`, asserts logcat `SEEDMAPS_ONDEVICE=PASS`.
- Released artifact: `dist/aar/seedmaps-release.aar` (committed), contents:
  `classes.jar` + `jni/{arm64-v8a,armeabi-v7a,x86_64}/libseed_engine.so`.

## Environment notes (this repo's Linux box)

- JDK 21 lives at `~/.local/share/jdk` (Temurin; added to `~/.zshrc`);
  Gradle 8.14.3 at `~/.local/share/gradle`. AGP 8.13.2 + Kotlin 2.1.20 are
  resolved by the `gradle wrapper`.
- The SDK installs platform 37 under the nonstandard dir `platforms/android-37.0`
  (package hash "android-37"). AGP needs a dir named `android-37`, so a
  symlink is created: `ln -sfn android-37.0 "$ANDROID_HOME/platforms/android-37"`;
  `android.suppressUnsupportedCompileSdk=37` silences the advisory in
  `gradle.properties`.

## Build

```sh
./bindings/android/build-android.sh   # NDK .so for 3 ABIs -> dist/<abi>/
./bindings/android/aar/gradlew        # (in aar/) :seedmaps:assembleRelease :app:assembleDebug
npm run build:aar                     # same, plus copies the AAR into dist/aar/
```

## On-device test

```sh
$ANDROID_HOME/emulator/emulator -avd <AVD> -no-window ...   # boot once
bindings/android/test-device.sh        # installs, runs, asserts logcat PASS
```

Observed on this machine (AVD Pixel_10a, Android 17 / API 37, x86_64):
`r1=14 first=49 sizeOk=true` and a differing `hi` — the exact WASM/CLI golden
anchors, now produced by the real NDK engine through the real JNI glue.

## x86_64 bionic libm pitfalls

Clang fuses adjacent `sin()`/`cos()` of one angle into a `sincos` libcall, and
the stronghold-fitness math in `finders.c` also uses `erf`; bionic's **shared**
`libm.so` on x86_64 exports neither. `build-android.sh` therefore links the
NDK's **static** `libm.a` for x86_64 so those symbols are embedded (ARM ABIs
provide them from shared libm and are untouched). Found and fixed via the
emulator's `UnsatisfiedLinkError` during the original on-device attempt.