#!/usr/bin/env bash
# Build the shared seed engine as an Apple XCFramework.
#
# STATUS: DRAFT — can only run on macOS with Xcode Command Line Tools. It is
# committed here, but this Linux environment has no Apple SDK so it cannot be
# executed here. Expected flow once run on a Mac:
#
#     bash bindings/apple/xcframework.sh
#     ls bindings/apple/seed_engine.xcframework
#
# The output contains one static library per (sdk, arch) speaking the same
# seed_engine.h ABI, so the Swift/C#/Kotlin-style facades above it work
# unchanged. To consume it from the root SwiftPM package, add a binary target
# authored on the Mac (signing/notarization are out of scope for this repo).
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
  "iphoneos:arm64"
  "iphonesimulator:arm64"
  "iphonesimulator:x86_64"
  "macosx:arm64"
  "macosx:x86_64"
)

LIB_DIR="$BUILD/libs"
mkdir -p "$LIB_DIR"
LIBS=()

for entry in "${TARGETS[@]}"; do
  sdk="${entry%%:*}"; arch="${entry##*:}"
  obj="$BUILD/obj-$sdk-$arch"; mkdir -p "$obj"
  lib="$LIB_DIR/lib${NAME}-${sdk}-${arch}.a"
  sdkroot="$(xcrun --sdk "$sdk" --show-sdk-path)"
  for src in "${C_SRCS[@]}"; do
    xcrun clang -target "${arch}-apple-${sdk}" -isysroot "$sdkroot" \
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