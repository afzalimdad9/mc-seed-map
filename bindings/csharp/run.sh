#!/usr/bin/env bash
# Build plain libseed_engine.so (no JNI) for the C# P/Invoke binding, then run
# the .NET sample. Skips cleanly when no .NET SDK is installed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DOTNET="${DOTNET_ROOT:-/home/afzalimdad9/.local/share/dotnet}/dotnet"
if [[ ! -x "$DOTNET" ]]; then
  echo "dotnet not found (set DOTNET_ROOT); skipping C# sample"
  exit 0
fi

mkdir -p bindings/csharp/lib
cc -shared -fPIC -fwrapv -O2 -I engine/include -I vendor/cubiomes \
  engine/src/seed_engine.c \
  vendor/cubiomes/{biomenoise,biomes,finders,generator,layers,noise,quadbase,util}.c \
  -lm -o bindings/csharp/lib/libseed_engine.so

export LD_LIBRARY_PATH="$ROOT/bindings/csharp/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$DOTNET" run --project bindings/csharp -v q