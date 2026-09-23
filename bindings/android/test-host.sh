#!/usr/bin/env bash
# Host-side suite for the Android binding:
#  1. impl_smoke — byte-level behaviour of seed_engine_jni_impl.c (always runs)
#  2. Kotlin facade + real JNI glue on a HOST JVM (when a JDK is present)
# Needs the native libs (npm run build:native) and, for (2), a JDK (jni.h)
# plus the Kotlin compiler; all found via env or the user-space installs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="$(cd "$(dirname "$0")" && pwd)"

fail=0

# --- 1. C implementation layer -------------------------------------------
{
  cc="${CC:-cc}"
  C="$(mktemp /tmp/impl_smoke.XXXXXX)"
  trap 'rm -f "$C"' EXIT
  "$cc" -I"$ROOT/engine/include" -I"$ROOT/vendor/cubiomes" \
    -I"$BIN/include" -fwrapv -O0 \
    "$BIN/tests/impl_smoke.c" \
    "$BIN/src/seed_engine_jni_impl.c" \
    "$ROOT/build/native/libseed_engine.a" \
    "$ROOT/build/native/libcubiomes.a" \
    -lm -o "$C"
  "$C" || fail=1
}

JAVA_HOME="${JAVA_HOME:-/home/afzalimdad9/.local/share/jdk}"
KOTLINC="${KOTLINC:-/home/afzalimdad9/.local/share/kotlinc/kotlinc/bin/kotlinc}"
JAVA="$JAVA_HOME/bin/java"

if [[ ! -x "$JAVA_HOME/bin/javac" ]]; then
  echo "javac not found under \$JAVA_HOME=$JAVA_HOME; skipping host-JVM JNI test"
elif [[ ! -x "$KOTLINC" ]]; then
  echo "kotlinc not found at $KOTLINC; skipping host-JVM JNI test"
else
  # --- 2. host JNI .so (real glue) then Kotlin facade on the JVM ----------
  if "$BIN/build-host.sh"; then
    WORK="$(mktemp -d /tmp/kotlinnative.XXXXXX)"
    trap 'rm -rf "$WORK" "$C"' EXIT
    export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"
    "$KOTLINC" "$BIN/kotlin/SeedWorldGen.kt" "$BIN/kotlin/SeedWorldGenHostTest.kt" \
      -d "$WORK/out.jar" || fail=1
    STDLIB="$(dirname "$(dirname "$KOTLINC")")/lib/kotlin-stdlib.jar"
    "$JAVA" -Djava.library.path="$BIN/dist-host" \
      -cp "$WORK/out.jar:$STDLIB" com.seedmaps.SeedWorldGenHostTest || fail=1
  else
    fail=1
  fi
fi

exit "$fail"