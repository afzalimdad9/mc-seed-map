#!/usr/bin/env bash
# Build the seed map engine as Android shared libraries for every ABI using the
# NDK clang toolchain. Output: dist/<abi>/libseed_engine.so (jniLibs layout).
#
# Requires ANDROID_HOME pointing at an SDK containing an NDK. Verified here
# with NDK 30.0.16248370.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NDK="${ANDROID_HOME:-$HOME/Android/Sdk}/ndk"
NDK_DIR="${NDK_VERSION_DIR:-}"
if [[ -z "$NDK_DIR" ]]; then
  NDK_DIR="$(ls "$NDK" | sort -V | tail -1)"
fi
TOOLCHAIN="$NDK/$NDK_DIR/toolchains/llvm/prebuilt/linux-x86_64"
if [[ ! -x "$TOOLCHAIN/bin" ]]; then
  echo "error: NDK toolchain not found under $TOOLCHAIN" >&2
  echo "saw: $(ls "$NDK" 2>/dev/null)" >&2
  exit 1
fi

OUT="$ROOT/bindings/android/dist"
rm -rf "$OUT"
mkdir -p "$OUT"

# util.c is listed separately so the compile command is easy to read.
ENGINE_SRC=(
  "$ROOT/engine/src/seed_engine.c"
  "$ROOT/bindings/android/src/seed_engine_jni_impl.c"
  "$ROOT/bindings/android/src/seed_engine_android.c"
  "$ROOT/vendor/cubiomes/finders.c"
  "$ROOT/vendor/cubiomes/generator.c"
  "$ROOT/vendor/cubiomes/layers.c"
  "$ROOT/vendor/cubiomes/biomenoise.c"
  "$ROOT/vendor/cubiomes/biomes.c"
  "$ROOT/vendor/cubiomes/noise.c"
  "$ROOT/vendor/cubiomes/quadbase.c"
)
INCS=( -I"$ROOT/engine/include" -I"$ROOT/vendor/cubiomes" -I"$ROOT/bindings/android/include" -I"$ROOT/bindings/android/src" )

declare -A TRIPLES=(
  [arm64-v8a]=aarch64-linux-android21
  [armeabi-v7a]=armv7a-linux-androideabi21
  [x86_64]=x86_64-linux-android21
)

for abi in "${!TRIPLES[@]}"; do
  triple="${TRIPLES[$abi]}"
  cc="$TOOLCHAIN/bin/${triple}-clang"
  if [[ ! -x "$cc" ]]; then
    echo "error: $cc missing for $abi" >&2
    exit 1
  fi
  # Link a shared version of libm (also required as DT_NEEDED on the target).
# x86_64 bionic's *shared* libm.so is missing sincos()/erf()/exp() which
# clang/cubiomes reference (fine on glibc and on ARM bionic), so x86_64 links
# the NDK's static libm.a to embed those symbols instead.
LIBM_STATIC=""
if [[ "$abi" == "x86_64" ]]; then
  # bionic shared libm on x86_64 is missing sincos()/erf()/exp() — pull the
  # NDK static libm.a (e.g. sysroot/usr/lib/x86_64-linux-android/libm.a) so
  # those symbols are embedded in the .so.
  LIBM_STATIC="$TOOLCHAIN/sysroot/usr/lib/${triple%-android21}-android/libm.a"
  [[ -f "$LIBM_STATIC" ]] || { echo "error: static libm.a not found ($LIBM_STATIC)" >&2; exit 1; }
fi
  mkdir -p "$OUT/$abi"
  "$cc" -O2 -fwrapv -fPIC -shared \
    "${INCS[@]}" \
    "${ENGINE_SRC[@]}" \
    "$ROOT/vendor/cubiomes/util.c" \
    -Wl,--exclude-libs,ALL \
    $LIBM_STATIC -lm \
    -o "$OUT/$abi/libseed_engine.so"
  echo "  $abi -> $OUT/$abi/libseed_engine.so ($(du -h "$OUT/$abi/libseed_engine.so" | cut -f1))"
done

echo "Android bindings built for ABIs: $(ls "$OUT" | tr '\n' ' ')"