#!/usr/bin/env bash
# Build a HOST (x86_64) shared library that includes the real JNI glue
# (seed_engine_android.c) so the Kotlin facade / System.loadLibrary path can be
# exercised on this machine where NDK .so files cannot run. Needs a JDK for
# jni.h; location via $JAVA_HOME or the known user-space install.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(cd "$(dirname "$0")" && pwd)/dist-host"

JH="${JAVA_HOME:-/home/afzalimdad9/.local/share/jdk}"
if [[ ! -f "$JH/include/jni.h" ]]; then
  echo "JNI headers not found under \$JAVA_HOME=$JH; cannot build host JNI lib" >&2
  exit 1
fi

mkdir -p "$OUT"
cc="${CC:-cc}"

"$cc" -shared -fPIC -fwrapv -O2 \
  -I"$ROOT/engine/include" \
  -I"$ROOT/vendor/cubiomes" \
  -I"$ROOT/bindings/android/include" \
  -I"$JH/include" -I"$JH/include/linux" \
  "$ROOT/engine/src/seed_engine.c" \
  "$ROOT"/vendor/cubiomes/{biomenoise,biomes,finders,generator,layers,noise,quadbase,util}.c \
  "$ROOT/bindings/android/src/seed_engine_jni_impl.c" \
  "$ROOT/bindings/android/src/seed_engine_android.c" \
  -lm -o "$OUT/libseed_engine.so"

nm -D "$OUT/libseed_engine.so" | grep -c "Java_com_seedmaps_NativeEngine" \
  | xargs printf "host JNI lib built: %s Java_ exports in %s\n" "$OUT/libseed_engine.so"