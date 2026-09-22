#!/usr/bin/env bash
# Host-side test of the Android binding implementation layer (the exact code
# behind the JNI glue). Requires the native libs (build:native) to exist.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cc="${CC:-cc}"
BIN="$(mktemp /tmp/impl_smoke.XXXXXX)"
trap 'rm -f "$BIN"' EXIT

"$cc" -I"$ROOT/engine/include" -I"$ROOT/vendor/cubiomes" \
  -I"$ROOT/bindings/android/include" -fwrapv -O0 \
  "$ROOT/bindings/android/tests/impl_smoke.c" \
  "$ROOT/bindings/android/src/seed_engine_jni_impl.c" \
  "$ROOT/build/native/libseed_engine.a" \
  "$ROOT/build/native/libcubiomes.a" \
  -lm -o "$BIN"
"$BIN"