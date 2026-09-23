# Apple XCFramework (`seed_engine.xcframework`)

`xcframework.sh` cross-compiles the engine (Cubiomes + `seed_engine.h` C ABI)
into a single XCFramework for Apple platforms. It is **not built from the
vendor SDK source** in this repo — it rebuilds `engine/src` and the vendored
Cubiomes sources for each SDK, which is exactly what the other bindings
(native, WASM, Android, C#, Python) do.

Output layout (three platform libraries, five architecture slices):

| Platform               | Slices            | Identifier in the framework |
|------------------------|-------------------|------------------------------|
| iphoneos (device)      | arm64             | `ios-arm64`                  |
| iphonesimulator        | arm64 + x86_64    | `ios-arm64_x86_64-simulator` |
| macosx                 | arm64 + x86_64    | `macos-arm64_x86_64`         |

The windows/linux/wasm variants live in the other `bindings/` subprojects;
this artifact covers only Apple targets.

## Building

```sh
bash bindings/apple/xcframework.sh
ls bindings/apple/seed_engine.xcframework
```

Requires Xcode command-line tools on macOS. The "macos" GitHub Actions job
runs this, validates the slices with `lipo`/`lipo -archs` (3 libs / 5 arch
slices), **links and runs `link-smoke.c` against the macOS slice** and
compiles it against the iOS device slice, then uploads the framework as the
`seed_engine.xcframework` CI artifact.

## Consuming from an Xcode / Swift project

The framework is a plain static C library (no Swift module map yet), so you
link it directly and expose the C API to Swift yourself:

1. Add `seed_engine.xcframework` to the target's **Frameworks, Libraries, and
   Embedded Content**.
2. Add `engine/include/` to the target's **Header Search Paths** so
   `#include "seed_engine.h"` resolves — or drag `seed_engine.h` into the
   project and import it from an Objective-C bridging header.
3. When linking for the iOS **device** slice you must sign — Xcode handles
   this with your normal signing identity when the framework is added to a
   target.

Minimal Swift usage via a bridging header / `@_cdecl`-style C calls:

```swift
// Obj-C bridging header: #include "seed_engine.h"
let mc = seed_engine_version_from_string("1.18")
guard seed_engine_init(Int32(bitPattern: UInt32(mc)), 0, 262) == 0 else { ... }
let biome = seed_engine_get_biome(1, 0, 63, 0)      // 14 = mushroom_fields for seed 262
```

## Current limitations / roadmap

- **No SwiftPM `.binaryTarget` yet.** The CI artifact is consumed by
  adding it to an Xcode project as above. A SwiftPM binary target
  (`Package.swift` + a checked-in `seed_engine.xcframework`) is planned; it
  must be an Apple-only package since SwiftPM on Linux ignores xcframeworks.
- **No signed release / notarization.** For App Store / distribution you still
  need a release build pipeline (codesign + `notarytool`), outside the CI job.
- The framework has no embedded `module.modulemap` / umbrella header at
  present, which is why it is linked via Header Search Paths rather than
  `import seed_engine`.