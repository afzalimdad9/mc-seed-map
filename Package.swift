// swift-tools-version:5.9
//
// SeedTools — Swift package exposing the same C engine (cubiomes + seed_engine)
// used by the WASM/CLI/Android builds, as a SwiftPM module.
//
// The C target compiles the single source of truth: sources under
// Sources/CSeedEngine are symlinks into ../../engine and ../../vendor/cubiomes,
// so a change to the engine is automatically reflected here.
//
// On Apple platforms this same package builds as an XCFramework (iOS/macOS).
// Verified in this repo on Linux (Swift 6, swiftly toolchain).

import PackageDescription

let package = Package(
    name: "SeedTools",
    targets: [
        .target(
            name: "CSeedEngine",
            path: "bindings/swift/Sources/CSeedEngine",
            publicHeadersPath: "include",
            cSettings: [
                .headerSearchPath("../../../../engine/include"),
                .headerSearchPath("../../../../vendor/cubiomes"),
                .unsafeFlags(["-fwrapv"]),
            ],
            linkerSettings: [
                .linkedLibrary("m"), // libm (exp/sqrtf); a no-op on Apple
            ]
        ),
        .executableTarget(
            name: "SeedToolsCLI",
            dependencies: ["CSeedEngine"],
            path: "bindings/swift/Sources/SeedToolsCLI"
        ),
    ]
)