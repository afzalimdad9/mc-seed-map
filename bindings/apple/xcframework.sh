#!/usr/bin/env bash
# Build the shared seed engine as an Apple XCFramework.
#
# Runs locally on macOS AND in CI: the workflow's "macos" job executes this,
# lipo-checks the five slices and uploads the framework as an artifact.
# Output contains one static library per (sdk, arch) speaking the same
# seed_engine.h ABI, so the Swift/C#/Kotlin-style facades above it work
# unchanged.
#
#     bash bindings/apple/xcframework.sh
#     ls bindings/apple/seed_engine.xcframework
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NAME="seed_engine"
OUT_DIR="${OUT_DIR:-$ROOT/bindings/apple}"
FRAMEWORK="$OUT_DIR/$NAME.xcframework"
BUILD="$FRAMEWORK.build"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "xcframework.sh requires macOS (Apple SDK); found $(uname -s). Skipping." >&2
  exit 0
fi
command -v xcrun >/dev/null && command -v xcodebuild >/dev/null || {
  echo "xcframework.sh needs Xcode Command Line Tools on $HOSTNAME" >&2
  exit 1
}

# Same source manifest as the CMake build: the shared engine + Cubiomes.
C_SRCS=( "$ROOT/engine/src/seed_engine.c" )
for f in finders generators layer biomenoise biomes noise util; do
  C_SRCS+=( "$ROOT/vendor/cubiomes/$f.c" )
done
[[ -f "$ROOT/vendor/cubiomes/quadbase.c" ]] && C_SRCS+=( "$ROOT/vendor/cubiomes/quadbase.c" )

TARGETS=(
  "iphoneos:arm64:-miphoneos-version-min=14.0"
  "iphonesimulator:arm64:-mios-simulator-version-min=14.0"
  "iphonesimulator:x86_64:-mios-simulator-version-min=14.0"
  "macosx:arm64:-mmacosx-version-min=11.0"
  "macosx:x86_64:-mmacosx-version-min=11.0"
)

LIB_DIR="$BUILD/libs"
mkdir -p "$LIB_DIR"
LIBS=()

for entry in "${TARGETS[@]}"; do
  sdk="${entry%%:*}"; rest="${entry#*:}"
  arch="${rest%%:*}"; minver="${rest#*:}"
  obj="$BUILD/obj-$sdk-$arch"; mkdir -p "$obj"
  lib="$LIB_DIR/lib${NAME}-${sdk}-${arch}.a"
  sdkroot="$(xcrun --sdk "$sdk" --show-sdk-path)"
  for src in "${C_SRCS[@]}"; do
    xcrun clang -arch "$arch" "$minver" -isysroot "$sdkroot" \
      -fPIC -fwrapv -O2 \
      -I "$ROOT/engine/include" -I "$ROOT/vendor/cubiomes" \
      -c "$src" -o "$obj/$(basename "$src" .c).o"
  done
  xcrun ar rcs "$lib" "$obj"/*.o
  LIBS+=( "$lib" )
done

args=()
for lib in "${LIBS[@]}"; do args+=( -library "$lib" ); done
xcodebuild -quiet -create-xcframework "${args[@]}" -output "$FRAMEWORK"
echo "created $FRAMEWORK"