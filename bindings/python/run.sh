#!/usr/bin/env bash
# Build plain libseed_engine.so (no JNI) for the Python ctypes binding, then
# run the known-answer sample. Uses the same cc line as bindings/csharp/run.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PY="${PYTHON:-python3}"
command -v "$PY" >/dev/null || { echo "python3 not found; skipping Python sample"; exit 0; }

mkdir -p bindings/python/lib
cc -shared -fPIC -fwrapv -O2 -I engine/include -I vendor/cubiomes \
  engine/src/seed_engine.c \
  vendor/cubiomes/{biomenoise,biomes,finders,generator,layers,noise,quadbase,util}.c \
  -lm -o bindings/python/lib/libseed_engine.so

export LD_LIBRARY_PATH="$ROOT/bindings/python/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export SEED_ENGINE_LIB="$ROOT/bindings/python/lib/libseed_engine.so"
exec "$PY" bindings/python/seedmaps.py "$@"