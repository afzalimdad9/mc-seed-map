# Swift package (private fork of Cubiomes)

Exposes the SAME C engine used by WASM / CLI / Android to Swift and buildable as
a SwiftPM product on Apple platforms (iOS/macOS via Xcode) and Linux.

## Layout

- `Package.swift` is at the **repository root** so the C target's header search
  paths (`engine/include`, `vendor/cubiomes`) stay inside the package root
  (SwiftPM forbids escapes).
- `Sources/CSeedEngine/` — SwiftPM C module:
  - `*.c` are symlinks to the single source of truth in `engine/` and
    `vendor/cubiomes/` (no copy).
  - `include/seed_engine.h` is a **copy** of `engine/include/seed_engine.h`
    (module builds cannot follow `..` escapes). Refresh with
    `./bindings/swift/sync-headers.sh` after changing the engine header.
- `Sources/SeedToolsCLI/main.swift` — runnable example exercising version
  discovery, single and bulk biome generation.

## Build & run

```sh
./bindings/swift/run.sh          # shims the Linux libxml2 quirk, then swift run
bash bindings/swift/run.sh       # identical
```

Verified here (Swift 6.3.3 on Linux): version enum 1.18 → 22, range [1, 28],
all 28 modelled versions enumerated, seed 262 → `mushroom_fields` (14) at
(0,63,0), and a 64×48 bulk grid whose first cell (49) matches the committed
golden file — the exact same engine bytes as WASM/CLI/Android.

## Apple platforms

This package compiles as a normal SwiftPM package: `swift build` on macOS, or
add the package / targets to an Xcode project and build a module
(`CSeedEngine`) for iOS/macOS. Producing an XCFramework from it is a packaging
step; the C code is platform-neutral (no Android/Posix-only calls beyond
`<dirent.h>` in `quadbase.c`, which the Apple SDKs provide). **Not built in
this Linux environment** — see `bindings/android/README.md` status framing.