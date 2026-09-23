#!/usr/bin/env bash
# Build plain libseed_engine.so (no JNI) for the Python ctypes binding, then
# run the known-answer sample. Uses the same cc line as bindings/csharp/run.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PY="${PYTHON:-python3}"
command -v "$PY" >/dev/null || { echo "python3 not found; skipping Python sample"; exit 0; }

LIB="bindings/python/lib"
mkdir -p "$LIB"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) LIBFILE="seed_engine.dll"; EXPORT_FLAG="-Wl,--export-all-symbols";;
  *) LIBFILE="libseed_engine.so"; EXPORT_FLAG="";;
esac

"${CC:-cc}" -shared -fPIC -fwrapv -O2 $EXPORT_FLAG -I engine/include -I vendor/cubiomes \
  engine/src/seed_engine.c \
  vendor/cubiomes/{biomenoise,biomes,finders,generator,layers,noise,quadbase,util}.c \
  -lm -o "$LIB/$LIBFILE"

export LD_LIBRARY_PATH="$ROOT/$LIB${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export DYLD_LIBRARY_PATH="$ROOT/$LIB${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"
export SEED_ENGINE_LIB="$ROOT/$LIB/$LIBFILE"
exec "$PY" bindings/python/seedmaps.py "$@"